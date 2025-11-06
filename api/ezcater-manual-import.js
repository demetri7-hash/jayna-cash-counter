/**
 * EZCater Manual Order Import
 * Imports specific orders by UUID, checking for duplicates
 */

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { orderUuid } = req.body;

    if (!orderUuid) {
      return res.status(400).json({
        success: false,
        error: 'Missing orderUuid parameter'
      });
    }

    const EZCATER_API_TOKEN = process.env.EZCATER_API_TOKEN;
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;

    if (!EZCATER_API_TOKEN) {
      throw new Error('EZCATER_API_TOKEN not configured');
    }

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`📥 Manual import requested for order: ${orderUuid}`);

    // STEP 1: Check if order already exists in database
    const { data: existing, error: checkError } = await supabase
      .from('catering_orders')
      .select('id, order_number, customer_name')
      .eq('source_system', 'EZCATER')
      .eq('external_order_id', orderUuid)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = not found (OK)
      throw new Error(`Database check error: ${checkError.message}`);
    }

    if (existing) {
      console.log(`ℹ️  Order already exists in database: ${existing.order_number}`);
      return res.status(200).json({
        success: true,
        alreadyExists: true,
        message: 'Order already exists in database',
        order: existing
      });
    }

    // STEP 2: Fetch order from EZCater API
    console.log(`🔍 Fetching order from EZCater API...`);

    const orderQuery = `
      query GetOrder($id: ID!) {
        order(id: $id) {
          uuid
          orderNumber
          orderCustomer {
            firstName
            lastName
            fullName
          }
          event {
            timestamp
            catererHandoffFoodTime
            headcount
            address {
              street
              street2
              city
              state
              zip
              deliveryInstructions
            }
            contact {
              name
              phone
            }
            timeZoneIdentifier
          }
          totals {
            customerTotalDue {
              subunits
              currency
            }
            tip {
              subunits
              currency
            }
            salesTax {
              subunits
              currency
            }
            subTotal {
              subunits
              currency
            }
          }
          catererCart {
            totals {
              catererTotalDue
            }
            orderItems {
              uuid
              name
              quantity
              totalInSubunits {
                subunits
                currency
              }
              specialInstructions
              menuItemSizeName
              customizations {
                name
                quantity
              }
            }
          }
          lifecycle {
            orderIsCurrently
          }
          isTaxExempt
          deliveryId
        }
      }
    `;

    const response = await fetch('https://api.ezcater.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': EZCATER_API_TOKEN,
        'Apollographql-client-name': 'Jayna-Gyro-Sacramento',
        'Apollographql-client-version': '1.0.0'
      },
      body: JSON.stringify({
        query: orderQuery,
        variables: {
          id: orderUuid
        }
      })
    });

    const data = await response.json();

    if (data.errors) {
      console.error('❌ GraphQL errors:', data.errors);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch order from EZCater',
        details: data.errors
      });
    }

    const order = data.data?.order;

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found in EZCater',
        orderUuid: orderUuid
      });
    }

    console.log(`✅ Order fetched: ${order.orderNumber}`);

    // STEP 3: Parse order data (same logic as webhook)
    const orderData = parseOrderData(order);

    // STEP 4: Save to database
    const { data: savedOrder, error: saveError } = await supabase
      .from('catering_orders')
      .upsert({
        source_system: 'EZCATER',
        source_type: 'ezCater',
        external_order_id: orderData.ezcater_order_id,
        order_number: orderData.order_number,
        customer_name: orderData.customer_name,
        customer_email: orderData.customer_email,
        customer_phone: orderData.customer_phone,
        delivery_date: orderData.delivery_date,
        delivery_time: orderData.delivery_time ? new Date(orderData.delivery_date + 'T' + orderData.delivery_time).toISOString() : null,
        delivery_address: [
          orderData.delivery_address_street,
          orderData.delivery_address_city,
          orderData.delivery_address_state,
          orderData.delivery_address_zip
        ].filter(Boolean).join(', '),
        delivery_notes: orderData.delivery_instructions,
        headcount: orderData.headcount,
        subtotal: orderData.subtotal,
        tax: orderData.tax,
        tip: orderData.tip,
        delivery_fee: null,
        total_amount: orderData.total,
        business_date: orderData.delivery_date ? parseInt(orderData.delivery_date.replace(/-/g, '')) : null,
        status: orderData.status.toUpperCase(),
        order_data: order,
        last_synced_at: new Date().toISOString()
      }, {
        onConflict: 'source_system,external_order_id'
      })
      .select()
      .single();

    if (saveError) {
      console.error('❌ Error saving to database:', saveError);
      throw saveError;
    }

    console.log(`✅ Order saved to database: ${savedOrder.id}`);

    // STEP 5: Save line items
    await saveLineItems(savedOrder.id, orderData.ezcater_order_id, order.catererCart?.orderItems || []);

    return res.status(200).json({
      success: true,
      alreadyExists: false,
      message: 'Order imported successfully',
      order: {
        id: savedOrder.id,
        order_number: savedOrder.order_number,
        customer_name: savedOrder.customer_name,
        delivery_date: savedOrder.delivery_date,
        total_amount: savedOrder.total_amount,
        status: savedOrder.status
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Import error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Parse order data from EZCater format to database format
 */
function parseOrderData(order) {
  // CORRECT FIX: Parse timestamp and convert to Pacific timezone
  const timestampStr = order.event?.catererHandoffFoodTime || order.event?.timestamp;
  let deliveryDate = null;
  let deliveryTime = null;

  if (timestampStr) {
    // Parse the ISO timestamp into a Date object
    const dt = new Date(timestampStr);

    // Convert to Pacific timezone and extract date
    const dateFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Los_Angeles',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    deliveryDate = dateFormatter.format(dt); // "YYYY-MM-DD" in Pacific time

    // Convert to Pacific timezone and extract time
    const timeFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    const timeParts = timeFormatter.formatToParts(dt);
    const hour = timeParts.find(p => p.type === 'hour').value;
    const minute = timeParts.find(p => p.type === 'minute').value;
    const second = timeParts.find(p => p.type === 'second').value;
    deliveryTime = `${hour}:${minute}:${second}`;
  }

    // Try contact name FIRST (that's where EZCater actually puts it!)
  const customerName = order.event?.contact?.name ||
                       order.orderCustomer?.fullName ||
                       `${order.orderCustomer?.firstName || ''} ${order.orderCustomer?.lastName || ''}`.trim() ||
                       null;

  const address = order.event?.address;

  const subunitsToDollars = (money) => {
    if (!money || !money.subunits) return 0;
    return money.subunits / 100;
  };

  const totals = order.totals || {};
  const subtotal = subunitsToDollars(totals.subTotal);
  const tax = subunitsToDollars(totals.salesTax);
  const tip = subunitsToDollars(totals.tip);
  const total = subunitsToDollars(totals.customerTotalDue);

  const status = parseStatus(order.lifecycle?.orderIsCurrently);

  return {
    ezcater_order_id: order.uuid,
    order_number: order.orderNumber || order.uuid?.substring(0, 8),
    customer_name: customerName,
    customer_email: null,
    customer_phone: order.event?.contact?.phone || null,
    delivery_date: deliveryDate,
    delivery_time: deliveryTime,
    delivery_address_street: address?.street || null,
    delivery_address_city: address?.city || null,
    delivery_address_state: address?.state || null,
    delivery_address_zip: address?.zip || null,
    delivery_instructions: address?.deliveryInstructions || null,
    headcount: order.event?.headcount || null,
    special_instructions: null,
    subtotal: subtotal,
    tax: tax,
    tip: tip,
    total: total,
    status: status
  };
}

/**
 * Save order line items to database
 */
async function saveLineItems(orderId, externalOrderId, items) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  await supabase
    .from('catering_order_items')
    .delete()
    .eq('order_id', orderId);

  const subunitsToDollars = (subunits) => (subunits || 0) / 100;

  const lineItems = items.map(item => {
    const totalPrice = subunitsToDollars(item.totalInSubunits?.subunits);
    const unitPrice = (item.quantity || 1) > 0 ? totalPrice / (item.quantity || 1) : 0;

    return {
      order_id: orderId,
      external_order_id: externalOrderId,
      item_guid: item.uuid,
      item_name: item.name,
      quantity: item.quantity,
      unit_price: unitPrice,
      total_price: totalPrice,
      selection_type: 'ITEM',
      modifiers: item.customizations && item.customizations.length > 0 ? item.customizations : null,
      special_requests: item.specialInstructions || null,
      menu_group: null,
      tax_included: false,
      item_data: item
    };
  });

  if (lineItems.length > 0) {
    const { error } = await supabase
      .from('catering_order_items')
      .insert(lineItems);

    if (error) {
      console.error('❌ Error saving line items:', error);
    } else {
      console.log(`✅ Saved ${lineItems.length} line items`);
    }
  }
}

/**
 * Parse EZCater status to our standard format
 */
function parseStatus(status) {
  const statusLower = (status || '').toLowerCase();

  if (statusLower.includes('cancel')) return 'cancelled';
  if (statusLower.includes('deliver')) return 'delivered';
  if (statusLower.includes('confirm')) return 'confirmed';
  if (statusLower.includes('progress')) return 'in_progress';

  return 'pending';
}
