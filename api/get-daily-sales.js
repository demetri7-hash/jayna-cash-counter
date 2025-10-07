// Get Daily Sales Data from Database
// Returns sales data for a date range from automated Toast email imports

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Start date and end date are required'
      });
    }

    // Initialize Supabase client
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY
    );

    // Fetch daily sales data for date range
    const { data, error } = await supabase
      .from('daily_sales')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No sales data found for this date range',
        message: 'Data may not be available yet. Please upload files manually or wait for automated import.',
        hasData: false
      });
    }

    // Aggregate data across all days
    const aggregated = data.reduce((acc, day) => ({
      netSales: (acc.netSales || 0) + (day.net_sales || 0),
      creditTips: (acc.creditTips || 0) + (day.credit_tips || 0),
      cashSales: (acc.cashSales || 0) + (day.cash_sales || 0),
      creditAmount: (acc.creditAmount || 0) + (day.credit_amount || 0),
      creditCount: (acc.creditCount || 0) + (day.credit_count || 0),
      totalTips: (acc.totalTips || 0) + (day.total_tips || 0)
    }), {});

    return res.json({
      success: true,
      hasData: true,
      source: 'database',
      dateRange: { startDate, endDate },
      daysFound: data.length,
      data: aggregated,
      dailyBreakdown: data.map(d => ({
        date: d.date,
        netSales: d.net_sales,
        creditTips: d.credit_tips,
        cashSales: d.cash_sales
      }))
    });

  } catch (error) {
    console.error('Get daily sales error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      hasData: false
    });
  }
}
