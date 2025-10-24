/**
 * Vercel Serverless Function: Update Catering Order Status
 * Allows marking orders as completed, pending, etc.
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export default async function handler(req, res) {
  // Enable CORS
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
    const { order_id, status } = req.body;

    if (!order_id || !status) {
      return res.status(400).json({
        success: false,
        error: 'order_id and status are required'
      });
    }

    // Validate status
    const validStatuses = ['pending', 'confirmed', 'in_progress', 'completed', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    console.log(`📝 Updating order ${order_id} status to: ${status}`);

    // Update order status
    const { data, error } = await supabase
      .from('catering_orders')
      .update({
        status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', order_id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    console.log(`✅ Order status updated successfully`);

    return res.status(200).json({
      success: true,
      message: `Order status updated to ${status}`,
      data: data
    });

  } catch (error) {
    console.error('❌ Update order status error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update order status',
      details: error.message
    });
  }
}
