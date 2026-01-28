/**
 * Vercel Serverless Function: Delivery Tracking Diagnostic
 * Shows real-time status of all orders with auto-tracking enabled
 */

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    console.log('🔍 Delivery Diagnostic: Fetching all orders with tracking...');

    // Initialize Supabase
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get current time (UTC) for accurate comparisons
    const now = new Date();

    // Calculate Pacific timezone dates for filtering
    const pacificNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
    const today = new Date(pacificNow.getFullYear(), pacificNow.getMonth(), pacificNow.getDate());
    const todayStr = today.toISOString().split('T')[0];

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const { data: orders, error } = await supabase
      .from('catering_orders')
      .select('*')
      .eq('source_system', 'EZCATER')
      .not('delivery_id', 'is', null)
      .gte('delivery_date', todayStr)
      .lte('delivery_date', tomorrowStr)
      .order('delivery_time', { ascending: true });

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    // Process each order to calculate status
    const diagnosticData = orders.map(order => {
      const deliveryTime = order.delivery_time ? new Date(order.delivery_time) : null;
      const minutesUntilDelivery = deliveryTime ? Math.floor((deliveryTime - now) / (1000 * 60)) : null;

      // Determine what the next status should be
      let nextStatus = null;
      let nextStatusTime = null;

      if (minutesUntilDelivery !== null) {
        if (minutesUntilDelivery <= 0 && order.delivery_status !== 'delivered') {
          nextStatus = 'delivered';
          nextStatusTime = 'NOW';
        } else if (minutesUntilDelivery <= 15 && order.delivery_status === 'pending') {
          nextStatus = 'in_transit';
          nextStatusTime = `in ${minutesUntilDelivery} minutes`;
        } else if (minutesUntilDelivery <= 30 && order.delivery_status === 'pending') {
          nextStatus = 'picked_up';
          nextStatusTime = `in ${minutesUntilDelivery} minutes`;
        } else if (minutesUntilDelivery <= 45 && order.delivery_status === 'pending') {
          nextStatus = 'assigned';
          nextStatusTime = `in ${minutesUntilDelivery} minutes`;
        }
      }

      // Parse tracking events
      let trackingEvents = [];
      try {
        trackingEvents = typeof order.delivery_tracking_events === 'string'
          ? JSON.parse(order.delivery_tracking_events)
          : (order.delivery_tracking_events || []);
      } catch (e) {
        trackingEvents = [];
      }

      return {
        order_number: order.order_number,
        customer_name: order.customer_name,
        delivery_time: deliveryTime ? deliveryTime.toLocaleString('en-US', {
          timeZone: 'America/Los_Angeles',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        }) : null,
        minutes_until_delivery: minutesUntilDelivery,
        current_status: order.delivery_status,
        auto_tracking_enabled: order.auto_tracking_enabled,
        courier_name: order.courier_name,
        courier_phone: order.courier_phone,
        next_status: nextStatus,
        next_status_time: nextStatusTime,
        tracking_events_count: trackingEvents.length,
        last_auto_update: order.last_auto_update_at,
        delivery_id: order.delivery_id
      };
    });

    return res.status(200).json({
      success: true,
      current_pacific_time: now.toLocaleString('en-US', {
        timeZone: 'America/Los_Angeles',
        dateStyle: 'full',
        timeStyle: 'long'
      }),
      total_orders: orders.length,
      orders_with_auto_tracking: diagnosticData.filter(o => o.auto_tracking_enabled).length,
      orders: diagnosticData
    });

  } catch (error) {
    console.error('❌ Delivery diagnostic error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
}
