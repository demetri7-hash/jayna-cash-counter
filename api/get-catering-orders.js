/**
 * Vercel Serverless Function: Get Catering Orders from Database
 * Fetches catering orders from Supabase (fast, no Toast API calls)
 *
 * This endpoint reads from our local database cache, avoiding:
 * - Rate limits
 * - Slow API calls
 * - Toast API authentication overhead
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get date range from query params or body
    let startDate, endDate;

    if (req.method === 'GET') {
      startDate = req.query.startDate;
      endDate = req.query.endDate;
    } else {
      const body = req.body;
      startDate = body.startDate;
      endDate = body.endDate;
    }

    // Default to today + 14 days if not specified
    if (!startDate) {
      startDate = new Date().toISOString().split('T')[0];
    }
    if (!endDate) {
      const end = new Date();
      end.setDate(end.getDate() + 14);
      endDate = end.toISOString().split('T')[0];
    }

    console.log(`📋 Fetching catering orders from database: ${startDate} to ${endDate}`);

    // Query orders from database
    const { data: orders, error } = await supabase
      .from('catering_orders')
      .select('*')
      .gte('delivery_date', startDate)
      .lte('delivery_date', endDate)
      .order('delivery_date', { ascending: true });

    if (error) {
      console.error('❌ Database query error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch orders from database',
        details: error.message
      });
    }

    console.log(`✅ Found ${orders.length} orders in database`);

    // Transform database records to match frontend format
    const formattedOrders = orders.map(order => ({
      toast_order_id: order.external_order_id,
      order_number: order.order_number,
      customer_name: order.customer_name,
      customer_email: order.customer_email,
      customer_phone: order.customer_phone,
      delivery_date: order.delivery_date,
      delivery_time: order.delivery_time,
      delivery_address: order.delivery_address,
      delivery_notes: order.delivery_notes,
      source: order.source_type,
      source_system: order.source_system, // 'TOAST' or 'EZCATER'
      business_date: order.business_date,
      headcount: order.headcount,
      total: order.total_amount,
      status: order.status,
      order_data: order.order_data,
      last_synced_at: order.last_synced_at,
      db_id: order.id // Database ID for editing
    }));

    return res.status(200).json({
      success: true,
      message: `Found ${formattedOrders.length} catering orders`,
      data: {
        startDate,
        endDate,
        totalOrders: formattedOrders.length,
        orders: formattedOrders,
        fromDatabase: true
      }
    });

  } catch (error) {
    console.error('❌ Error fetching orders:', error);

    return res.status(500).json({
      success: false,
      error: 'Failed to fetch catering orders',
      details: error.message
    });
  }
}
