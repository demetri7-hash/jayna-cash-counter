/**
 * EZCater Orders Database Check
 * Shows all EZCater orders in database
 */

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all EZCater orders
    const { data: orders, error } = await supabase
      .from('catering_orders')
      .select('*')
      .eq('source_system', 'EZCATER')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    console.log(`📊 Found ${orders.length} EZCater orders in database`);

    return res.status(200).json({
      success: true,
      totalOrders: orders.length,
      orders: orders.map(order => ({
        id: order.id,
        external_order_id: order.external_order_id,
        order_number: order.order_number,
        customer_name: order.customer_name,
        delivery_date: order.delivery_date,
        delivery_time: order.delivery_time,
        status: order.status,
        total_amount: order.total_amount,
        created_at: order.created_at,
        last_synced_at: order.last_synced_at
      })),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error checking orders:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
