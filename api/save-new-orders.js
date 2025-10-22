/**
 * Vercel Serverless Function: Save New Orders
 * Saves only new orders to database (called after background sync detects new orders)
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
    const { orders } = req.body; // Array of NEW orders to save

    if (!orders || !Array.isArray(orders) || orders.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Orders array is required and must not be empty'
      });
    }

    console.log(`💾 Saving ${orders.length} new orders to database...`);

    // Transform orders to database format
    const ordersToSave = orders.map(order => ({
      source_system: 'TOAST',
      source_type: order.source,
      external_order_id: order.toast_order_id,
      order_number: order.order_number,
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
    }));

    // Insert new orders
    const { data: savedOrders, error: saveError } = await supabase
      .from('catering_orders')
      .insert(ordersToSave)
      .select();

    if (saveError) {
      console.error('❌ Error saving orders:', saveError);
      return res.status(500).json({
        success: false,
        error: 'Failed to save orders to database',
        details: saveError.message
      });
    }

    console.log(`✅ Successfully saved ${savedOrders.length} new orders`);

    return res.status(200).json({
      success: true,
      message: `Saved ${savedOrders.length} new orders`,
      data: {
        savedCount: savedOrders.length,
        orders: savedOrders
      }
    });

  } catch (error) {
    console.error('❌ Error saving new orders:', error);

    return res.status(500).json({
      success: false,
      error: 'Failed to save new orders',
      details: error.message
    });
  }
}
