/**
 * Vercel Serverless Function: Apply Order Updates
 * Updates existing orders in database (only after user confirmation)
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { orders } = req.body; // Array of orders with updates to apply

    if (!orders || !Array.isArray(orders) || orders.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Orders array is required and must not be empty'
      });
    }

    console.log(`📝 Applying updates to ${orders.length} orders...`);

    const updatedOrders = [];
    const errors = [];

    // Update each order individually
    for (const order of orders) {
      try {
        const { data, error } = await supabase
          .from('catering_orders')
          .update({
            customer_name: order.customer_name,
            customer_email: order.customer_email,
            customer_phone: order.customer_phone,
            delivery_date: order.delivery_date,
            delivery_time: order.delivery_time,
            delivery_address: order.delivery_address,
            delivery_notes: order.delivery_notes,
            headcount: order.headcount,
            total_amount: order.total,
            business_date: order.business_date,
            status: order.status,
            order_data: order.order_data,
            last_synced_at: new Date().toISOString()
          })
          .eq('source_system', 'TOAST')
          .eq('external_order_id', order.toast_order_id)
          .select();

        if (error) {
          console.error(`❌ Error updating order ${order.toast_order_id}:`, error);
          errors.push({
            orderId: order.toast_order_id,
            error: error.message
          });
        } else {
          updatedOrders.push(data[0]);
        }
      } catch (err) {
        console.error(`❌ Exception updating order ${order.toast_order_id}:`, err);
        errors.push({
          orderId: order.toast_order_id,
          error: err.message
        });
      }
    }

    console.log(`✅ Updated ${updatedOrders.length} orders (${errors.length} errors)`);

    return res.status(200).json({
      success: errors.length === 0,
      message: `Updated ${updatedOrders.length} orders`,
      data: {
        updatedCount: updatedOrders.length,
        errorCount: errors.length,
        orders: updatedOrders,
        errors: errors
      }
    });

  } catch (error) {
    console.error('❌ Error applying updates:', error);

    return res.status(500).json({
      success: false,
      error: 'Failed to apply order updates',
      details: error.message
    });
  }
}
