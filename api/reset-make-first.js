/**
 * Vercel Cron Job: Reset "Make First" flags daily at 4pm Pacific
 * Runs at 23:00 UTC (4pm PDT / 3pm PST)
 *
 * Clears the "urgent" flag on all inventory items to reset the MAKE FIRST section
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export default async function handler(req, res) {
  // Only allow GET requests (Vercel cron uses GET)
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify this is from Vercel Cron (check authorization header)
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.error('❌ Unauthorized cron request');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  console.log('🔄 Starting daily Make First reset (4pm Pacific)...');

  try {
    // Get current timestamp in Pacific timezone
    const now = new Date();
    const pacificTime = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(now);

    console.log(`📅 Reset triggered at: ${pacificTime} Pacific`);

    // Reset all "urgent" flags to false (unchecks Make First checkbox)
    const { data, error, count } = await supabase
      .from('inventory_items')
      .update({ urgent: false })
      .eq('urgent', true)
      .select('id, item_name');

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    const resetCount = data?.length || 0;

    if (resetCount > 0) {
      console.log(`✅ Reset ${resetCount} Make First flags:`);
      data.forEach(item => {
        console.log(`   - ${item.item_name} (ID: ${item.id})`);
      });
    } else {
      console.log('ℹ️ No Make First flags were set (nothing to reset)');
    }

    return res.status(200).json({
      success: true,
      message: 'Make First flags reset successfully',
      resetCount: resetCount,
      resetItems: data?.map(item => item.item_name) || [],
      timestamp: pacificTime
    });

  } catch (error) {
    console.error('❌ Reset error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to reset Make First flags',
      details: error.message
    });
  }
}
