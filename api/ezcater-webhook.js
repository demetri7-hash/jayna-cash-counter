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

    // Upsert order in database (insert or update if exists)
    const { data, error } = await supabase
      .from('ezcater_orders')
      .upsert({
        ezcater_order_id: orderData.ezcater_order_id,
        order_number: orderData.order_number,
        customer_name: orderData.customer_name,
        customer_email: orderData.customer_email,
        customer_phone: orderData.customer_phone,
        delivery_date: orderData.delivery_date,
        delivery_time: orderData.delivery_time,
        headcount: orderData.headcount,
        special_instructions: orderData.special_instructions,
        subtotal: orderData.subtotal,
        tax: orderData.tax,
        tip: orderData.tip,
        total: orderData.total,
        status: orderData.status,
        order_data: orderDetails,  // Store full object for detail view
        last_synced_at: new Date().toISOString()
      }, {
        onConflict: 'ezcater_order_id'
      });

    if (error) {
      console.error('❌ Error saving order to database:', error);
      throw error;
    }

    console.log('✅ Order saved to database:', orderData.ezcater_order_id);

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
              id
              orderNumber
              customer {
                name
                email
                phone
                company
              }
              deliveryDate
              deliveryTime
              deliveryAddress {
                street
                city
                state
                zip
              }
              headcount
              specialInstructions
              subtotal
              tax
              tip
              deliveryFee
              serviceFee
              total
              status
              items {
                id
                name
                quantity
                price
              }
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
 */
function parseOrderData(order) {
  return {
    ezcater_order_id: order.id,
    order_number: order.orderNumber || order.id.substring(0, 8),
    customer_name: order.customer?.name || null,
    customer_email: order.customer?.email || null,
    customer_phone: order.customer?.phone || null,
    delivery_date: order.deliveryDate || null,
    delivery_time: order.deliveryTime || null,
    headcount: order.headcount || null,
    special_instructions: order.specialInstructions || null,
    subtotal: order.subtotal || 0,
    tax: order.tax || 0,
    tip: order.tip || 0,
    total: order.total || 0,
    status: parseStatus(order.status)
  };
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
