/**
 * Vercel Serverless Function: Sync EZCater Orders
 * Polls EZCater GraphQL API for recent orders and saves to database
 *
 * NOTE: EZCater primarily uses webhooks for order notifications.
 * This endpoint is a backup method for manual syncing.
 */

import { createClient } from '@supabase/supabase-js';

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
    const { startDate, endDate } = req.body;

    console.log(`🔄 EZCater Sync: Checking for orders from ${startDate} to ${endDate}`);

    // Initialize Supabase
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check existing EZCater orders in database
    const { data: existingOrders, error: dbError } = await supabase
      .from('catering_orders')
      .select('*')
      .eq('source_system', 'EZCATER')
      .gte('delivery_date', startDate)
      .lte('delivery_date', endDate);

    if (dbError) {
      throw new Error(`Database error: ${dbError.message}`);
    }

    console.log(`📊 Found ${existingOrders.length} existing EZCater orders in database`);

    // NOTE: EZCater uses webhooks for real-time order sync
    // This endpoint is for manual sync/debugging
    // The GraphQL API does not provide a "list orders" query - only individual order fetch by ID
    // Webhooks save orders automatically to the database

    return res.status(200).json({
      success: true,
      message: 'EZCater orders are synced via webhooks',
      data: {
        totalOrders: existingOrders.length,
        orders: existingOrders.map(order => ({
          toast_order_id: order.external_order_id,
          order_number: order.order_number,
          customer_name: order.customer_name,
          delivery_date: order.delivery_date,
          delivery_time: order.delivery_time,
          delivery_address: order.delivery_address,
          source_system: order.source_system,
          total: order.total_amount,
          status: order.status,
          order_data: order.order_data,
          db_id: order.id
        })),
        note: 'EZCater orders arrive via webhook. If order is missing, check Vercel logs for webhook errors or verify webhook subscription is active.'
      }
    });

  } catch (error) {
    console.error('❌ EZCater sync error:', error);

    return res.status(500).json({
      success: false,
      error: error.message,
      details: 'EZCater uses webhooks for order sync. Check Vercel logs for webhook POST requests to /api/ezcater-webhook'
    });
  }
}
