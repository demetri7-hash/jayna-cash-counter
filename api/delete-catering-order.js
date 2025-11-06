/**
 * Delete Catering Order from Database
 * Removes order and associated line items
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
    const { order_id } = req.body;

    if (!order_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing order_id parameter'
      });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`🗑️ Deleting order ID: ${order_id}`);

    // Step 1: Get order details for logging
    const { data: order, error: fetchError } = await supabase
      .from('catering_orders')
      .select('order_number, customer_name, source_system, external_order_id')
      .eq('id', order_id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          error: 'Order not found'
        });
      }
      throw fetchError;
    }

    console.log(`   Order #${order.order_number} (${order.source_system}) - ${order.customer_name}`);

    // Step 2: Delete line items first (foreign key dependency)
    const { error: lineItemsError } = await supabase
      .from('catering_order_items')
      .delete()
      .eq('order_id', order_id);

    if (lineItemsError) {
      console.error('❌ Failed to delete line items:', lineItemsError);
      throw new Error(`Failed to delete line items: ${lineItemsError.message}`);
    }

    console.log(`   ✅ Deleted line items for order ${order_id}`);

    // Step 3: Delete the order itself
    const { error: orderError } = await supabase
      .from('catering_orders')
      .delete()
      .eq('id', order_id);

    if (orderError) {
      console.error('❌ Failed to delete order:', orderError);
      throw new Error(`Failed to delete order: ${orderError.message}`);
    }

    console.log(`✅ Successfully deleted order ${order_id} (#${order.order_number})`);

    return res.status(200).json({
      success: true,
      message: 'Order deleted successfully',
      deleted: {
        id: order_id,
        order_number: order.order_number,
        customer_name: order.customer_name,
        source_system: order.source_system
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Delete error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
