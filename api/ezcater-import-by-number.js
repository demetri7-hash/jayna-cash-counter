/**
 * Import EZCater Order by Order Number (NOT UUID)
 * Tries multiple approaches to find and import the order
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
    const { orderNumber } = req.body;

    if (!orderNumber) {
      return res.status(400).json({
        success: false,
        error: 'Missing orderNumber parameter'
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

    console.log(`🔍 Searching for order number: ${orderNumber}`);

    // APPROACH 1: Try using order number directly as ID
    console.log('Attempt 1: Try order number as ID...');
    let orderData = await tryFetchOrder(orderNumber, EZCATER_API_TOKEN);

    // APPROACH 2: Try with leading zeros removed
    if (!orderData && orderNumber.startsWith('0')) {
      console.log('Attempt 2: Try without leading zeros...');
      const withoutZeros = orderNumber.replace(/^0+/, '');
      orderData = await tryFetchOrder(withoutZeros, EZCATER_API_TOKEN);
    }

    // APPROACH 3: Try as numeric ID
    if (!orderData && /^\d+$/.test(orderNumber)) {
      console.log('Attempt 3: Try as numeric string...');
      orderData = await tryFetchOrder(String(parseInt(orderNumber)), EZCATER_API_TOKEN);
    }

    if (!orderData) {
      return res.status(404).json({
        success: false,
        error: 'Could not find order with that number',
        orderNumber: orderNumber,
        details: 'Tried multiple ID formats. Order may not exist or number format is incorrect.'
      });
    }

    console.log(`✅ Found order: ${orderData.orderNumber || orderData.uuid}`);

    // Check if already exists
    const { data: existing, error: checkError } = await supabase
      .from('catering_orders')
      .select('id, order_number, customer_name')
      .eq('source_system', 'EZCATER')
      .eq('external_order_id', orderData.uuid)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      throw new Error(`Database check error: ${checkError.message}`);
    }

    if (existing) {
      console.log(`ℹ️  Order already exists: ${existing.order_number}`);
      return res.status(200).json({
        success: true,
        alreadyExists: true,
        message: 'Order already exists in database',
        order: existing
      });
    }

    // Parse and save order
    const parsedOrder = parseOrderData(orderData);

    const { data: savedOrder, error: saveError } = await supabase
      .from('catering_orders')
      .upsert({
        source_system: 'EZCATER',
        source_type: 'ezCater_manual',  // MANUAL IMPORT - distinguishes from webhook 'ezCater'
        external_order_id: parsedOrder.ezcater_order_id,
        order_number: parsedOrder.order_number,
        customer_name: parsedOrder.customer_name,
        customer_email: parsedOrder.customer_email,
        customer_phone: parsedOrder.customer_phone,
        delivery_date: parsedOrder.delivery_date,
        delivery_time: parsedOrder.delivery_time ? `${parsedOrder.delivery_date}T${parsedOrder.delivery_time}-08:00` : null, // Keep Pacific timezone!
        delivery_address: [
          parsedOrder.delivery_address_street,
          parsedOrder.delivery_address_city,
          parsedOrder.delivery_address_state,
          parsedOrder.delivery_address_zip
        ].filter(Boolean).join(', '),
        delivery_notes: parsedOrder.delivery_instructions,
        headcount: parsedOrder.headcount,
        subtotal: parsedOrder.subtotal,
        tax: parsedOrder.tax,
        tip: parsedOrder.tip,
        delivery_fee: null,
        total_amount: parsedOrder.total,
        business_date: parsedOrder.delivery_date ? parseInt(parsedOrder.delivery_date.replace(/-/g, '')) : null,
        status: parsedOrder.status.toUpperCase(),
        order_data: orderData,
        last_synced_at: new Date().toISOString()
      }, {
        onConflict: 'source_system,external_order_id'
      })
      .select()
      .single();

    if (saveError) {
      console.error('❌ Error saving:', saveError);
      throw saveError;
    }

    console.log(`✅ Saved to database: ${savedOrder.id}`);

    // Save line items
    await saveLineItems(savedOrder.id, parsedOrder.ezcater_order_id, orderData.catererCart?.orderItems || []);

    // AUTO-PRINT: Automatically print order and prep list
    console.log(`🖨️ Triggering auto-print for manually imported order ${savedOrder.id}...`);
    try {
      const printResponse = await fetch(`${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}/api/auto-print-catering-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          order_id: savedOrder.id,
          source_system: 'EZCATER_MANUAL'
        })
      });

      const printResult = await printResponse.json();

      if (printResult.success) {
        console.log(`✅ Auto-print successful for manually imported order ${savedOrder.id}`);
      } else {
        console.error(`⚠️  Auto-print failed for manually imported order ${savedOrder.id}:`, printResult);
        // Don't fail the import if printing fails - order is still saved
      }
    } catch (printError) {
      console.error(`❌ Auto-print error for manually imported order ${savedOrder.id}:`, printError);
      // Don't fail the import if printing fails - order is still saved
    }

    return res.status(200).json({
      success: true,
      alreadyExists: false,
      message: 'Order imported successfully',
      order: {
        id: savedOrder.id,
        uuid: savedOrder.external_order_id,
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

async function tryFetchOrder(id, apiToken) {
  const orderQuery = `
    query GetOrder($id: ID!) {
      order(id: $id) {
        uuid
        orderNumber
        orderCustomer { firstName lastName fullName }
        event {
          timestamp
          catererHandoffFoodTime
          headcount
          address { street street2 city state zip deliveryInstructions }
          contact { name phone }
          timeZoneIdentifier
        }
        totals {
          customerTotalDue { subunits currency }
          tip { subunits currency }
          salesTax { subunits currency }
          subTotal { subunits currency }
        }
        catererCart {
          totals { catererTotalDue }
          orderItems {
            uuid name quantity
            totalInSubunits { subunits currency }
            specialInstructions menuItemSizeName
            customizations { name quantity }
          }
        }
        lifecycle { orderIsCurrently }
        isTaxExempt
        deliveryId
      }
    }
  `;

  try {
    const response = await fetch('https://api.ezcater.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': apiToken,
        'Apollographql-client-name': 'Jayna-Gyro-Sacramento',
        'Apollographql-client-version': '1.0.0'
      },
      body: JSON.stringify({
        query: orderQuery,
        variables: { id: String(id) }
      })
    });

    const data = await response.json();

    if (data.errors) {
      console.log(`  ❌ Failed with ID "${id}":`, data.errors[0]?.message);
      return null;
    }

    if (data.data?.order) {
      console.log(`  ✅ SUCCESS with ID "${id}"!`);
      return data.data.order;
    }

    return null;
  } catch (err) {
    console.log(`  ❌ Error trying ID "${id}":`, err.message);
    return null;
  }
}

function parseOrderData(order) {
  // CORRECT FIX: Parse timestamp and convert to Pacific timezone
  const timestampStr = order.event?.catererHandoffFoodTime || order.event?.timestamp;
  let deliveryDate = null;
  let deliveryTime = null;

  console.log('🔍 RAW TIMESTAMP FROM EZCATER:', timestampStr);

  if (timestampStr) {
    // Parse the ISO timestamp into a Date object
    const dt = new Date(timestampStr);
    console.log('📍 PARSED AS DATE OBJECT:', dt.toISOString());

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

    // Format as string and parse - more reliable than formatToParts
    const timeString = timeFormatter.format(dt); // "17:00:00" format
    deliveryTime = timeString.replace(/\u202f/g, '').trim(); // Remove any non-breaking spaces

    console.log('📅 EXTRACTED DATE (Pacific):', deliveryDate);
    console.log('⏰ EXTRACTED TIME (Pacific):', deliveryTime);
    console.log('⏰ TIME STRING RAW:', JSON.stringify(timeString));
  }

  // Try contact name FIRST (that's where EZCater actually puts it!)
  const customerName = order.event?.contact?.name ||
                       order.orderCustomer?.fullName ||
                       `${order.orderCustomer?.firstName || ''} ${order.orderCustomer?.lastName || ''}`.trim() ||
                       null;

  const address = order.event?.address;
  const subunitsToDollars = (money) => (!money || !money.subunits) ? 0 : money.subunits / 100;

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
    subtotal, tax, tip, total, status
  };
}

async function saveLineItems(orderId, externalOrderId, items) {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

  await supabase.from('catering_order_items').delete().eq('order_id', orderId);

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
    const { error } = await supabase.from('catering_order_items').insert(lineItems);
    if (error) {
      console.error('❌ Error saving line items:', error);
    } else {
      console.log(`✅ Saved ${lineItems.length} line items`);
    }
  }
}

function parseStatus(status) {
  const statusLower = (status || '').toLowerCase();
  if (statusLower.includes('cancel')) return 'cancelled';
  if (statusLower.includes('deliver')) return 'delivered';
  if (statusLower.includes('confirm')) return 'confirmed';
  if (statusLower.includes('progress')) return 'in_progress';
  return 'pending';
}
