/**
 * ezCater Manual Order Import
 * Fetches a single order by UUID and saves to database
 * Use this for existing orders that were placed before webhook setup
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

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
    const { orderUuid, orderNumber } = req.body;
    const orderId = orderUuid || orderNumber;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        error: 'orderUuid or orderNumber is required'
      });
    }

    const EZCATER_API_TOKEN = process.env.EZCATER_API_TOKEN;

    console.log(`📥 Manually importing ezCater order: ${orderId}`);

    // Fetch order details from ezCater API (accepts both UUID and order number)
    const orderDetails = await fetchOrderDetails(orderId, EZCATER_API_TOKEN);

    if (!orderDetails) {
      throw new Error('Failed to fetch order from ezCater API');
    }

    // Store in database using same logic as webhook
    await storeOrder(orderDetails, 'manual_import');

    return res.status(200).json({
      success: true,
      message: 'Order imported successfully',
      orderNumber: orderDetails.orderNumber,
      customerName: orderDetails.orderCustomer?.fullName,
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
 * Fetch order details from ezCater GraphQL API
 */
async function fetchOrderDetails(orderUuid, apiToken) {
  const query = `
    query GetOrder($orderId: ID!) {
      order(id: $orderId) {
        uuid
        orderNumber
        lifecycle {
          orderIsCurrently
        }
        orderSourceType
        event {
          timestamp
          catererHandoffFoodTime
          headcount
          customerProvidedName
          orderType(perspective: CATERER)
          timeZoneIdentifier
          address {
            name
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
        }
        orderCustomer {
          firstName
          lastName
          fullName
        }
        catererCart {
          orderItems {
            uuid
            name
            quantity
            menuItemSizeName
            specialInstructions
            totalInSubunits
            customizations {
              name
              quantity
            }
          }
          totals {
            catererTotalDue {
              subunits
              currency
            }
          }
        }
        totals {
          customerTotalDue {
            subunits
            currency
          }
          subTotal {
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
        }
      }
    }
  `;

  const response = await fetch('https://api.ezcater.com/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': apiToken,
      'Apollographql-client-name': 'Jayna-Gyro-Sacramento',
      'Apollographql-client-version': '1.0.0'
    },
    body: JSON.stringify({
      query: query,
      variables: {
        orderId: orderUuid
      }
    })
  });

  const data = await response.json();

  if (data.errors) {
    console.error('GraphQL errors:', data.errors);
    return null;
  }

  return data.data?.order;
}

/**
 * Store order in Supabase catering_orders table
 */
async function storeOrder(order, eventType) {
  if (!order) return;

  // Convert subunits (pennies) to dollars
  const subunitsToDollars = (money) => {
    if (!money || !money.subunits) return 0;
    return money.subunits / 100;
  };

  // Determine order status
  let status = 'PENDING';
  if (eventType === 'accepted' || order.lifecycle?.orderIsCurrently === 'ACCEPTED') {
    status = 'CONFIRMED';
  } else if (eventType === 'rejected' || order.lifecycle?.orderIsCurrently === 'REJECTED') {
    status = 'CANCELLED';
  } else if (eventType === 'cancelled' || order.lifecycle?.orderIsCurrently === 'CANCELLED') {
    status = 'CANCELLED';
  }

  // Build line items
  const lineItems = (order.catererCart?.orderItems || []).map(item => ({
    item_name: item.name,
    quantity: item.quantity,
    unit_price: subunitsToDollars({ subunits: item.totalInSubunits }) / item.quantity,
    total_price: subunitsToDollars({ subunits: item.totalInSubunits }),
    modifiers: item.customizations || [],
    special_requests: item.specialInstructions || null
  }));

  // Prepare order data
  const orderData = {
    order_number: order.orderNumber || order.uuid,
    source_type: 'ezCater',
    customer_name: order.orderCustomer?.fullName || order.event?.contact?.name || 'Guest',
    customer_phone: order.event?.contact?.phone || null,
    customer_email: null, // Not provided in response
    delivery_date: order.event?.timestamp ? new Date(order.event.timestamp).toISOString().split('T')[0] : null,
    delivery_time: order.event?.timestamp || null,
    delivery_address: buildAddress(order.event?.address),
    delivery_notes: order.event?.address?.deliveryInstructions || null,
    headcount: order.event?.headcount || null,
    total_amount: subunitsToDollars(order.totals?.customerTotalDue),
    status: status,
    external_id: order.uuid,
    raw_data: order
  };

  // Check if order already exists
  const { data: existing } = await supabase
    .from('catering_orders')
    .select('id')
    .eq('external_id', order.uuid)
    .single();

  if (existing) {
    // Update existing order
    const { error } = await supabase
      .from('catering_orders')
      .update(orderData)
      .eq('id', existing.id);

    if (error) throw error;

    console.log(`✅ Updated order ${order.orderNumber} (${existing.id})`);

    // Update line items
    await updateLineItems(existing.id, lineItems);
  } else {
    // Insert new order
    const { data: newOrder, error } = await supabase
      .from('catering_orders')
      .insert(orderData)
      .select('id')
      .single();

    if (error) throw error;

    console.log(`✅ Created order ${order.orderNumber} (${newOrder.id})`);

    // Insert line items
    await insertLineItems(newOrder.id, lineItems);
  }
}

function buildAddress(address) {
  if (!address) return null;

  const parts = [
    address.street,
    address.street2,
    address.city,
    address.state,
    address.zip
  ].filter(Boolean);

  return parts.join(', ');
}

async function insertLineItems(orderId, items) {
  const lineItems = items.map(item => ({
    order_id: orderId,
    ...item
  }));

  const { error } = await supabase
    .from('catering_order_items')
    .insert(lineItems);

  if (error) {
    console.error('Error inserting line items:', error);
  }
}

async function updateLineItems(orderId, items) {
  // Delete existing line items
  await supabase
    .from('catering_order_items')
    .delete()
    .eq('order_id', orderId);

  // Insert new line items
  await insertLineItems(orderId, items);
}
