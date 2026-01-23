/**
 * Diagnostic: Check if order has delivery_id field
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
    const { orderNumber } = req.query;

    if (!orderNumber) {
      return res.status(400).json({ error: 'orderNumber query parameter required' });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch order
    const { data: order, error } = await supabase
      .from('catering_orders')
      .select('*')
      .eq('order_number', orderNumber)
      .single();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Return diagnostic info
    return res.status(200).json({
      success: true,
      orderNumber: order.order_number,
      sourceSystem: order.source_system,
      hasDeliveryId: !!order.delivery_id,
      deliveryId: order.delivery_id,
      deliveryStatus: order.delivery_status,
      autoTrackingEnabled: order.auto_tracking_enabled,
      deliveryDate: order.delivery_date,
      deliveryTime: order.delivery_time,
      allFields: Object.keys(order)
    });

  } catch (error) {
    console.error('Error checking order:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
}
