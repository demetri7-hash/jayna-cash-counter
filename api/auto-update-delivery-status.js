/**
 * Vercel Serverless Function: Auto-Update Delivery Status
 * Automatically updates delivery statuses based on order due time
 *
 * Timeline:
 * - 45 min before due: Auto-assign courier → status: assigned
 * - 30 min before due: Picked up from restaurant → status: picked_up
 * - 15 min before due: In transit to customer → status: in_transit
 * - At due time: Delivered → status: delivered
 *
 * Called by:
 * - Catering page (on load/refresh)
 * - Vercel Cron (every 5 minutes) - optional
 */

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    console.log('🤖 Auto-Update Delivery Status: Starting automated check...');

    // Initialize Supabase
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get current time in Pacific timezone
    const now = new Date();
    const pacificTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));

    console.log(`⏰ Current Pacific Time: ${pacificTime.toISOString()}`);

    // Fetch all orders with auto-tracking enabled and delivery times in the future
    const today = new Date(pacificTime);
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const { data: orders, error } = await supabase
      .from('catering_orders')
      .select('*')
      .eq('auto_tracking_enabled', true)
      .not('delivery_id', 'is', null)  // Must have deliveryId for ezCater API
      .gte('delivery_date', todayStr)
      .lte('delivery_date', tomorrowStr)
      .in('delivery_status', ['pending', 'assigned', 'picked_up', 'in_transit']);

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    if (!orders || orders.length === 0) {
      console.log('✅ No orders need automated delivery tracking');
      return res.status(200).json({
        success: true,
        message: 'No orders to update',
        updated: 0
      });
    }

    console.log(`📦 Found ${orders.length} orders with auto-tracking enabled`);

    // Process each order
    const updates = [];
    for (const order of orders) {
      const update = await processOrder(order, pacificTime, supabase);
      if (update) {
        updates.push(update);
      }
    }

    console.log(`✅ Auto-update complete: ${updates.length} orders updated`);

    return res.status(200).json({
      success: true,
      message: `Auto-updated ${updates.length} delivery statuses`,
      updated: updates.length,
      updates: updates
    });

  } catch (error) {
    console.error('❌ Auto-update delivery status error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
}

/**
 * Process individual order and update status if needed
 */
async function processOrder(order, currentTime, supabase) {
  try {
    // Parse delivery time
    const deliveryTime = order.delivery_time ? new Date(order.delivery_time) : null;

    if (!deliveryTime || isNaN(deliveryTime.getTime())) {
      console.warn(`⚠️ Order ${order.id}: Invalid delivery time`);
      return null;
    }

    // Calculate minutes until delivery
    const minutesUntilDelivery = Math.floor((deliveryTime - currentTime) / (1000 * 60));

    console.log(`📅 Order ${order.order_number}: ${minutesUntilDelivery} min until delivery (${order.delivery_status})`);

    // Determine what status update is needed
    const { newStatus, eventType } = determineStatusUpdate(
      order.delivery_status,
      minutesUntilDelivery
    );

    if (!newStatus) {
      // No update needed
      return null;
    }

    console.log(`🔄 Order ${order.order_number}: Updating ${order.delivery_status} → ${newStatus}`);

    // Auto-assign courier if needed (first transition)
    if (newStatus === 'assigned' && !order.courier_name) {
      await autoAssignCourier(order, supabase);
    }

    // Send courier event to ezCater API (if not just assignment)
    if (eventType) {
      await sendCourierEvent(order.delivery_id, eventType);
    }

    // Update local database
    await updateOrderStatus(order, newStatus, eventType, supabase);

    return {
      order_id: order.id,
      order_number: order.order_number,
      old_status: order.delivery_status,
      new_status: newStatus,
      minutes_until_delivery: minutesUntilDelivery
    };

  } catch (error) {
    console.error(`❌ Error processing order ${order.id}:`, error);
    return null;
  }
}

/**
 * Determine what status update (if any) is needed
 */
function determineStatusUpdate(currentStatus, minutesUntilDelivery) {
  // Already delivered - no further updates
  if (currentStatus === 'delivered') {
    return { newStatus: null, eventType: null };
  }

  // Timeline logic:
  // - 45+ min before: pending
  // - 45 min before: assigned
  // - 30 min before: picked_up
  // - 15 min before: in_transit
  // - 0 min (at/past due time): delivered

  if (minutesUntilDelivery <= 0 && currentStatus !== 'delivered') {
    return { newStatus: 'delivered', eventType: 'delivered' };
  }

  if (minutesUntilDelivery <= 15 && currentStatus !== 'in_transit' && currentStatus !== 'delivered') {
    return { newStatus: 'in_transit', eventType: 'in_transit' };
  }

  if (minutesUntilDelivery <= 30 && currentStatus !== 'picked_up' && currentStatus !== 'in_transit' && currentStatus !== 'delivered') {
    return { newStatus: 'picked_up', eventType: 'picked_up' };
  }

  if (minutesUntilDelivery <= 45 && currentStatus === 'pending') {
    return { newStatus: 'assigned', eventType: null };  // Assignment doesn't use courier event
  }

  return { newStatus: null, eventType: null };
}

/**
 * Auto-assign default courier
 */
async function autoAssignCourier(order, supabase) {
  try {
    console.log(`👤 Auto-assigning courier for order ${order.order_number}...`);

    // Use a default courier name (you can customize this)
    const courierName = 'Jayna Gyro Driver';
    const courierPhone = order.customer_phone || '916-xxx-xxxx';  // Fallback phone

    // Call ezCater API to assign courier
    const apiUrl = process.env.EZCATER_DELIVERY_PROXY_URL || 'https://jayna-cash-counter.vercel.app/api/ezcater-delivery-proxy';

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        operation: 'assignCourier',
        deliveryId: order.delivery_id,
        data: {
          name: courierName,
          phone: courierPhone
        }
      })
    });

    const result = await response.json();

    if (!result.success) {
      console.error(`❌ Failed to assign courier for order ${order.order_number}:`, result.error);
    } else {
      console.log(`✅ Courier assigned for order ${order.order_number}`);
    }

  } catch (error) {
    console.error(`❌ Error auto-assigning courier:`, error);
  }
}

/**
 * Send courier event to ezCater API
 */
async function sendCourierEvent(deliveryId, eventType) {
  try {
    const apiUrl = process.env.EZCATER_DELIVERY_PROXY_URL || 'https://jayna-cash-counter.vercel.app/api/ezcater-delivery-proxy';

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        operation: 'courierEvent',
        deliveryId: deliveryId,
        data: {
          eventType: eventType,
          timestamp: new Date().toISOString(),
          note: `Automated status update: ${eventType}`
        }
      })
    });

    const result = await response.json();

    if (!result.success) {
      console.error(`❌ Failed to send courier event ${eventType}:`, result.error);
    } else {
      console.log(`✅ Courier event sent: ${eventType}`);
    }

  } catch (error) {
    console.error(`❌ Error sending courier event:`, error);
  }
}

/**
 * Update order status in local database
 */
async function updateOrderStatus(order, newStatus, eventType, supabase) {
  try {
    // Parse existing tracking events
    let trackingEvents = [];
    try {
      trackingEvents = typeof order.delivery_tracking_events === 'string'
        ? JSON.parse(order.delivery_tracking_events)
        : (order.delivery_tracking_events || []);
    } catch (e) {
      trackingEvents = [];
    }

    // Add new automated event
    trackingEvents.push({
      timestamp: new Date().toISOString(),
      status: newStatus,
      auto: true,  // Automated update
      eventType: eventType,
      note: `Automated transition: ${order.delivery_status} → ${newStatus}`
    });

    // Update database
    const { error } = await supabase
      .from('catering_orders')
      .update({
        delivery_status: newStatus,
        delivery_tracking_events: JSON.stringify(trackingEvents),
        last_auto_update_at: new Date().toISOString()
      })
      .eq('id', order.id);

    if (error) {
      console.error(`❌ Error updating order ${order.id} in database:`, error);
    } else {
      console.log(`✅ Order ${order.order_number} updated to ${newStatus}`);
    }

  } catch (error) {
    console.error(`❌ Error updating order status:`, error);
  }
}
