/**
 * Vercel Serverless Function: Get Order Line Items
 * Fetches line items (menu items) for a specific catering order
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get order_id from query parameter
    const { order_id } = req.query;

    if (!order_id) {
      return res.status(400).json({
        success: false,
        error: 'order_id query parameter is required'
      });
    }

    console.log(`📋 Fetching line items for order ${order_id}...`);

    // Fetch order header
    const { data: order, error: orderError } = await supabase
      .from('catering_orders')
      .select('*')
      .eq('id', order_id)
      .single();

    if (orderError) {
      console.error('❌ Error fetching order:', orderError);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch order',
        details: orderError.message
      });
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // Fetch line items for this order
    const { data: lineItems, error: itemsError } = await supabase
      .from('catering_order_items')
      .select('*')
      .eq('order_id', order_id)
      .order('id', { ascending: true });

    if (itemsError) {
      console.error('❌ Error fetching line items:', itemsError);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch line items',
        details: itemsError.message
      });
    }

    console.log(`✅ Found ${lineItems?.length || 0} line items for order ${order_id}`);

    return res.status(200).json({
      success: true,
      data: {
        order,
        lineItems: lineItems || []
      }
    });

  } catch (error) {
    console.error('❌ Fetch error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch order details',
      details: error.message
    });
  }
}
