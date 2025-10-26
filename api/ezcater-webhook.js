/**
 * Vercel Serverless Function: EZCater Webhook Handler
 * Receives order events from EZCater and caches them in Supabase
 *
 * Webhook Events:
 * - order.submitted - New order received
 * - order.modified - Order details changed
 * - order.cancelled - Order cancelled
 */

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('📦 EZCater Webhook: Event received');

    // Initialize Supabase
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get event data from request body
    const event = req.body;

    console.log('Event Type:', event.eventType || event.event_type);
    console.log('Order ID:', event.orderId || event.order_id);

    // Validate event has required fields
    if (!event.orderId && !event.order_id) {
      return res.status(400).json({
        error: 'Invalid webhook payload',
        details: 'Missing order ID'
      });
    }

    const orderId = event.orderId || event.order_id;
    const eventType = event.eventType || event.event_type;

    // Fetch full order details from EZCater API using order(id) query
    const orderDetails = await fetchOrderFromEZCater(orderId);

    if (!orderDetails) {
      console.error('❌ Could not fetch order details from EZCater');
      return res.status(500).json({
        error: 'Failed to fetch order details'
      });
    }

    // Parse order data for database storage
    const orderData = parseOrderData(orderDetails);

    // Use existing catering_orders table (same as Toast)
    const { data, error } = await supabase
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
        total_amount: orderData.total,
        business_date: orderData.delivery_date ? parseInt(orderData.delivery_date.replace(/-/g, '')) : null,
        status: orderData.status.toUpperCase(),
        order_data: orderDetails,
        last_synced_at: new Date().toISOString()
      }, {
        onConflict: 'source_system,external_order_id'
      });

    if (error) {
      console.error('❌ Error saving order to database:', error);
      throw error;
    }

    console.log('✅ Order saved to database:', orderData.ezcater_order_id);

    // Save line items if order was inserted/updated successfully
    if (data && data.length > 0) {
      const savedOrderId = data[0].id;
      const savedExternalId = data[0].external_order_id;
      await saveLineItems(savedOrderId, savedExternalId, orderDetails.catererCart?.orderItems || []);
    }

    // Return success response to EZCater
    return res.status(200).json({
      success: true,
      message: 'Webhook processed successfully',
      orderId: orderData.ezcater_order_id
    });

  } catch (error) {
    console.error('❌ Webhook error:', error);

    // Return error but don't expose internal details
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to process webhook'
    });
  }
}

/**
 * Fetch order details from EZCater API using order(id) query
 */
async function fetchOrderFromEZCater(orderId) {
  const apiToken = process.env.EZCATER_API_TOKEN;
  const apiUrl = process.env.EZCATER_API_URL || 'https://api.ezcater.com/graphql';

  if (!apiToken) {
    console.error('❌ EZCATER_API_TOKEN not configured');
    return null;
  }

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': apiToken,
        'Apollographql-client-name': 'jayna-catering-system',
        'Apollographql-client-version': '1.0.0'
      },
      body: JSON.stringify({
        query: `
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
        `,
        variables: {
          id: orderId
        }
      })
    });

    const data = await response.json();

    if (data.errors) {
      console.error('❌ GraphQL errors:', data.errors);
      return null;
    }

    return data.data?.order;

  } catch (error) {
    console.error('❌ Error fetching order from EZCater:', error);
    return null;
  }
}

/**
 * Parse order data from EZCater format to database format
 * Based on official EZCater API schema (October 2025)
 */
function parseOrderData(order) {
  // Extract timestamp and convert to date/time
  const eventTimestamp = order.event?.timestamp ? new Date(order.event.timestamp) : null;
  const deliveryDate = eventTimestamp ? eventTimestamp.toISOString().split('T')[0] : null;
  const deliveryTime = eventTimestamp ? eventTimestamp.toISOString().split('T')[1].substring(0, 8) : null;

  // Extract customer info (orderCustomer in actual schema, not "customer")
  const customerName = order.orderCustomer?.fullName ||
                       `${order.orderCustomer?.firstName || ''} ${order.orderCustomer?.lastName || ''}`.trim() ||
                       null;

  // Extract delivery address (nested under event.address, not top-level)
  const address = order.event?.address;

  // Extract totals (Money type has subunits field - convert pennies to dollars)
  const subunitsToDollars = (money) => {
    if (!money || !money.subunits) return 0;
    return money.subunits / 100;
  };

  const totals = order.totals || {};
  const subtotal = subunitsToDollars(totals.subTotal);
  const tax = subunitsToDollars(totals.salesTax);
  const tip = subunitsToDollars(totals.tip);
  const total = subunitsToDollars(totals.customerTotalDue);

  // Extract status (lifecycle.orderIsCurrently, not "status")
  const status = parseStatus(order.lifecycle?.orderIsCurrently);

  return {
    ezcater_order_id: order.uuid,
    order_number: order.orderNumber || order.uuid?.substring(0, 8),
    customer_name: customerName,
    customer_email: null,  // Not provided in order query schema
    customer_phone: order.event?.contact?.phone || null,
    delivery_date: deliveryDate,
    delivery_time: deliveryTime,
    delivery_address_street: address?.street || null,
    delivery_address_city: address?.city || null,
    delivery_address_state: address?.state || null,
    delivery_address_zip: address?.zip || null,
    delivery_instructions: address?.deliveryInstructions || null,
    headcount: order.event?.headcount || null,
    special_instructions: null,  // Order-level special instructions not in schema (item-level only)
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

  // Delete existing line items for this order
  await supabase
    .from('catering_order_items')
    .delete()
    .eq('order_id', orderId);

  // Convert subunits (pennies) to dollars
  const subunitsToDollars = (subunits) => {
    return (subunits || 0) / 100;
  };

  // Insert new line items - MATCH Toast schema exactly!
  const lineItems = items.map(item => ({
    order_id: orderId,
    external_order_id: externalOrderId,
    item_guid: item.uuid,
    item_name: item.name,
    quantity: item.quantity,
    unit_price: subunitsToDollars(item.totalInSubunits?.subunits) / (item.quantity || 1),
    total_price: subunitsToDollars(item.totalInSubunits?.subunits),
    selection_type: 'ITEM',
    modifiers: item.customizations && item.customizations.length > 0 ? item.customizations : null,
    special_requests: item.specialInstructions || null,
    menu_group: null,
    tax_included: false,
    item_data: item
  }));

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
