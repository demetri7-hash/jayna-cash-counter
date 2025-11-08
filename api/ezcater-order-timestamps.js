/**
 * EZCater Order Timestamp Analysis
 * Compares EZCater order placement time vs webhook import time
 * Shows exact time difference to prove webhook speed
 */

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Set CORS headers
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
      return res.status(500).json({ error: 'Supabase credentials not configured' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get last 10 EZCater orders with full details
    const { data: orders, error } = await supabase
      .from('catering_orders')
      .select('*')
      .eq('source_system', 'EZCATER')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // Analyze each order's timestamps
    const analysis = orders.map(order => {
      // Extract order placement timestamp from order_data JSON
      const orderData = order.order_data;
      const ezcaterTimestamp = orderData?.event?.timestamp || orderData?.createdAt || null;

      // Our database timestamps
      const dbCreatedAt = order.created_at;
      const dbSyncedAt = order.last_synced_at;

      // Calculate time difference
      let timeDifference = null;
      let differenceSeconds = null;
      let differenceMinutes = null;

      if (ezcaterTimestamp && dbCreatedAt) {
        const ezcaterDate = new Date(ezcaterTimestamp);
        const dbDate = new Date(dbCreatedAt);
        differenceSeconds = Math.abs((dbDate - ezcaterDate) / 1000);
        differenceMinutes = (differenceSeconds / 60).toFixed(2);
        timeDifference = differenceSeconds;
      }

      // Format timestamps in Pacific timezone
      const formatPacific = (timestamp) => {
        if (!timestamp) return 'N/A';
        const date = new Date(timestamp);
        return date.toLocaleString('en-US', {
          timeZone: 'America/Los_Angeles',
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
          timeZoneName: 'short'
        });
      };

      return {
        order_number: order.order_number,
        external_order_id: order.external_order_id,
        customer_name: order.customer_name,
        delivery_date: order.delivery_date,
        total_amount: order.total_amount,
        source_type: order.source_type,

        // Timestamp comparison
        timestamps: {
          ezcater_order_placed: formatPacific(ezcaterTimestamp),
          ezcater_order_placed_raw: ezcaterTimestamp,

          webhook_imported: formatPacific(dbCreatedAt),
          webhook_imported_raw: dbCreatedAt,

          last_synced: formatPacific(dbSyncedAt),
          last_synced_raw: dbSyncedAt
        },

        // Time difference analysis
        webhook_speed: {
          seconds: differenceSeconds,
          minutes: differenceMinutes,
          human_readable: timeDifference !== null
            ? (timeDifference < 60
                ? `${differenceSeconds.toFixed(1)} seconds`
                : `${differenceMinutes} minutes`)
            : 'N/A',
          status: timeDifference !== null
            ? (timeDifference < 10
                ? '⚡ INSTANT (< 10 sec)'
                : timeDifference < 60
                  ? '✅ FAST (< 1 min)'
                  : timeDifference < 300
                    ? '⚠️ DELAYED (< 5 min)'
                    : '❌ SLOW (> 5 min)')
            : 'UNKNOWN'
        },

        // Import method
        import_method: order.source_type === 'ezCater'
          ? '✅ Webhook (Automatic)'
          : order.source_type === 'ezCater_manual'
            ? '📝 Manual Import'
            : order.source_type === 'ezCater_TEST'
              ? '🧪 Test Data'
              : `Unknown: ${order.source_type}`
      };
    });

    // Calculate overall statistics
    const webhookOrders = analysis.filter(o => o.source_type === 'ezCater');
    const speeds = webhookOrders
      .map(o => o.webhook_speed.seconds)
      .filter(s => s !== null);

    const avgSpeed = speeds.length > 0
      ? (speeds.reduce((sum, s) => sum + s, 0) / speeds.length).toFixed(2)
      : null;

    const minSpeed = speeds.length > 0 ? Math.min(...speeds).toFixed(2) : null;
    const maxSpeed = speeds.length > 0 ? Math.max(...speeds).toFixed(2) : null;

    const statistics = {
      total_orders: orders.length,
      webhook_imports: webhookOrders.length,
      manual_imports: analysis.filter(o => o.source_type === 'ezCater_manual').length,
      average_webhook_speed_seconds: avgSpeed,
      fastest_webhook_seconds: minSpeed,
      slowest_webhook_seconds: maxSpeed,
      all_under_1_minute: speeds.every(s => s < 60)
    };

    return res.json({
      success: true,
      statistics,
      orders: analysis,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error:', error);
    return res.status(500).json({
      error: error.message,
      stack: error.stack
    });
  }
}
