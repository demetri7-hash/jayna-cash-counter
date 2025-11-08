/**
 * EZCater Display Debug - Diagnose why webhook orders don't show in catering.html
 * Shows EXACTLY what the database query returns vs what should be displayed
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
      return res.status(500).json({ error: 'Supabase credentials not configured' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Calculate Pacific timezone today + 14 days (SAME as catering.html)
    const now = new Date();
    const formatterCA = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Los_Angeles',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const startDate = formatterCA.format(now); // Today in Pacific

    const futureDate = new Date(now.getTime() + (14 * 24 * 60 * 60 * 1000));
    const endDate = formatterCA.format(futureDate); // Today + 14 days

    console.log(`📅 Query date range: ${startDate} to ${endDate}`);

    // Query EXACTLY like catering.html does
    const { data: queryOrders, error: queryError } = await supabase
      .from('catering_orders')
      .select('*')
      .gte('delivery_date', startDate)
      .lte('delivery_date', endDate)
      .order('delivery_date', { ascending: true });

    if (queryError) {
      return res.status(500).json({ error: queryError.message });
    }

    // Also get ALL EZCater orders (ignore date range)
    const { data: allEzcaterOrders, error: allError } = await supabase
      .from('catering_orders')
      .select('*')
      .eq('source_system', 'EZCATER')
      .order('created_at', { ascending: false })
      .limit(10);

    if (allError) {
      return res.status(500).json({ error: allError.message });
    }

    // Analyze results
    const ezcaterInRange = queryOrders.filter(o => o.source_system === 'EZCATER');
    const toastInRange = queryOrders.filter(o => o.source_system === 'TOAST');

    const ezcaterOutsideRange = allEzcaterOrders.filter(o =>
      o.delivery_date < startDate || o.delivery_date > endDate
    );

    return res.json({
      success: true,
      query_params: {
        start_date: startDate,
        end_date: endDate,
        timezone: 'America/Los_Angeles (Pacific)'
      },
      results: {
        total_in_range: queryOrders.length,
        ezcater_in_range: ezcaterInRange.length,
        toast_in_range: toastInRange.length,
        ezcater_outside_range: ezcaterOutsideRange.length
      },
      ezcater_orders_in_range: ezcaterInRange.map(o => ({
        order_number: o.order_number,
        customer_name: o.customer_name,
        delivery_date: o.delivery_date,
        delivery_time: o.delivery_time,
        source_type: o.source_type,
        status: o.status,
        created_at: o.created_at,
        total_amount: o.total_amount,
        external_order_id: o.external_order_id
      })),
      ezcater_orders_outside_range: ezcaterOutsideRange.map(o => ({
        order_number: o.order_number,
        customer_name: o.customer_name,
        delivery_date: o.delivery_date,
        delivery_time: o.delivery_time,
        source_type: o.source_type,
        status: o.status,
        created_at: o.created_at,
        reason_excluded: o.delivery_date < startDate ? `PAST (before ${startDate})` : `FAR FUTURE (after ${endDate})`
      })),
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
