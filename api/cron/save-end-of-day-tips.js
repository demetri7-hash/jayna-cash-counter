/**
 * End-of-Day Tips Per Hour Snapshot
 * Vercel Cron Job - Runs at 11pm Pacific Time
 *
 * This job:
 * 1. Calls the main tips-per-hour API
 * 2. Marks the record as "end of day" snapshot
 * 3. Used for historical comparison (yesterday vs today)
 *
 * Configured in vercel.json to run at 11pm Pacific (7am UTC)
 */

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Verify this is a cron job request
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('🕚 Running end-of-day tips snapshot (11pm Pacific)...');

    // Initialize Supabase
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get today's business date (Pacific time)
    const pacificTime = new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' });
    const nowPacific = new Date(pacificTime);
    const businessDate = nowPacific.toISOString().split('T')[0];

    console.log(`📅 Business Date: ${businessDate}`);

    // Fetch today's metrics from the database
    const { data: todayMetrics, error: fetchError } = await supabase
      .from('daily_tips_metrics')
      .select('*')
      .eq('business_date', businessDate)
      .single();

    if (fetchError || !todayMetrics) {
      console.error('❌ No metrics found for today:', fetchError);
      return res.status(404).json({
        success: false,
        error: 'No metrics found for today',
        businessDate
      });
    }

    console.log(`📊 Found metrics: $${todayMetrics.tips_per_hour}/hr`);

    // Update the record to mark it as end-of-day snapshot
    const { error: updateError } = await supabase
      .from('daily_tips_metrics')
      .update({
        is_end_of_day: true,
        end_of_day_calculated_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('business_date', businessDate);

    if (updateError) {
      console.error('❌ Error updating end-of-day flag:', updateError);
      throw updateError;
    }

    console.log('✅ End-of-day snapshot saved successfully!');

    return res.status(200).json({
      success: true,
      message: 'End-of-day snapshot saved',
      businessDate,
      tipsPerHour: parseFloat(todayMetrics.tips_per_hour),
      totalCCTips: parseFloat(todayMetrics.total_cc_tips),
      totalHoursWorked: parseFloat(todayMetrics.total_hours_worked),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ End-of-day snapshot error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to save end-of-day snapshot',
      details: error.message
    });
  }
}
