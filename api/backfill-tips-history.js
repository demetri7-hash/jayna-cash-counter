/**
 * ONE-TIME BACKFILL: Populate Last 7 Days of Tips Per Hour Data
 *
 * This script fetches historical data from Toast API for the last 7 days
 * and saves end-of-day snapshots to the database.
 *
 * Run this ONCE to bootstrap the system, then rely on the 11pm cron job.
 *
 * Usage: Visit /api/backfill-tips-history (requires manual trigger)
 */

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Simple protection - require a query parameter
  if (req.query.confirm !== 'BACKFILL_NOW') {
    return res.status(403).json({
      error: 'This is a one-time backfill operation',
      instructions: 'Add ?confirm=BACKFILL_NOW to the URL to proceed'
    });
  }

  try {
    console.log('🔄 Starting 7-day historical backfill...');

    // Initialize Supabase
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Toast API credentials
    const TOAST_BASE_URL = 'https://ws-api.toasttab.com';
    const TOAST_RESTAURANT_GUID = process.env.TOAST_RESTAURANT_GUID;
    const TOAST_CLIENT_ID = process.env.TOAST_CLIENT_ID;
    const TOAST_CLIENT_SECRET = process.env.TOAST_CLIENT_SECRET;

    if (!TOAST_CLIENT_ID || !TOAST_CLIENT_SECRET || !TOAST_RESTAURANT_GUID) {
      throw new Error('Toast API credentials not configured');
    }

    // Get OAuth token
    console.log('🔐 Authenticating with Toast API...');
    const tokenResponse = await fetch(`${TOAST_BASE_URL}/authentication/v1/authentication/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${TOAST_CLIENT_ID}:${TOAST_CLIENT_SECRET}`).toString('base64')}`
      },
      body: JSON.stringify({
        clientId: TOAST_CLIENT_ID,
        clientSecret: TOAST_CLIENT_SECRET,
        userAccessType: 'TOAST_MACHINE_CLIENT'
      })
    });

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.token?.accessToken;

    if (!accessToken) {
      throw new Error('Failed to get Toast access token');
    }

    const results = [];
    const errors = [];

    // Loop through last 7 days (including today)
    for (let daysAgo = 0; daysAgo <= 7; daysAgo++) {
      try {
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() - daysAgo);
        const businessDate = targetDate.toISOString().split('T')[0];

        console.log(`\n📅 Processing ${businessDate} (${daysAgo} days ago)...`);

        // Check if this date already exists in database
        const { data: existing } = await supabase
          .from('daily_tips_metrics')
          .select('business_date, is_end_of_day')
          .eq('business_date', businessDate)
          .single();

        if (existing && existing.is_end_of_day) {
          console.log(`⏭️  ${businessDate} already has end-of-day snapshot, skipping`);
          results.push({ date: businessDate, status: 'skipped', reason: 'Already exists' });
          continue;
        }

        // Calculate start time (5am Pacific on target date)
        const startTime = new Date(businessDate + 'T05:00:00');
        const startTimeString = startTime.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' });
        const startPacific = new Date(startTimeString);

        // End time: 11:59pm Pacific on same day
        const endTime = new Date(businessDate + 'T23:59:59');
        const endTimeString = endTime.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' });
        const endPacific = new Date(endTimeString);

        const startDate = startPacific.toISOString();
        const endDate = endPacific.toISOString();

        console.log(`  ⏰ Range: ${startDate} to ${endDate}`);

        // STEP 1: Fetch time entries
        const timeEntriesUrl = `${TOAST_BASE_URL}/labor/v1/timeEntries?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;

        const timeEntriesResponse = await fetch(timeEntriesUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Toast-Restaurant-External-ID': TOAST_RESTAURANT_GUID,
            'Content-Type': 'application/json'
          }
        });

        if (!timeEntriesResponse.ok) {
          throw new Error(`Time entries API failed: ${timeEntriesResponse.status}`);
        }

        const timeEntries = await timeEntriesResponse.json();
        console.log(`  ✅ Fetched ${timeEntries.length} time entries`);

        // STEP 2: Calculate total hours (all completed shifts for historical days)
        const { totalHours, employeeCount } = calculateCompletedHours(timeEntries);
        console.log(`  ⏱️  Total Hours: ${totalHours.toFixed(2)}`);

        // STEP 3: Fetch orders and calculate CC tips
        const { totalCCTips, orderCount } = await fetchDayCCTips(accessToken, TOAST_BASE_URL, TOAST_RESTAURANT_GUID, businessDate);
        console.log(`  💰 Total CC Tips: $${totalCCTips.toFixed(2)}`);

        // STEP 4: Calculate Tips Per Hour
        const tipsPerHour = totalHours > 0 ? totalCCTips / totalHours : 0;
        console.log(`  🎯 Tips Per Hour: $${tipsPerHour.toFixed(2)}`);

        // STEP 5: Save to database as END-OF-DAY snapshot
        const metricsData = {
          business_date: businessDate,
          last_calculated_at: new Date().toISOString(),
          is_end_of_day: true, // Mark as historical end-of-day
          end_of_day_calculated_at: new Date().toISOString(),
          total_cc_tips: totalCCTips,
          total_orders_count: orderCount,
          total_hours_worked: totalHours,
          total_employees_worked: employeeCount,
          employees_currently_clocked_in: 0, // Historical data - no one clocked in
          tips_per_hour: tipsPerHour,
          previous_day_tips_per_hour: null, // Will calculate comparisons later
          percent_change_from_yesterday: null,
          trending_up: null,
          updated_at: new Date().toISOString()
        };

        const { error: upsertError } = await supabase
          .from('daily_tips_metrics')
          .upsert(metricsData, {
            onConflict: 'business_date',
            ignoreDuplicates: false
          });

        if (upsertError) {
          throw upsertError;
        }

        console.log(`  ✅ Saved to database`);

        results.push({
          date: businessDate,
          status: 'success',
          tipsPerHour: parseFloat(tipsPerHour.toFixed(2)),
          totalHours: parseFloat(totalHours.toFixed(2)),
          totalTips: parseFloat(totalCCTips.toFixed(2))
        });

        // Rate limit protection
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (dayError) {
        console.error(`  ❌ Error processing ${businessDate}:`, dayError.message);
        errors.push({
          date: businessDate,
          error: dayError.message
        });
      }
    }

    console.log('\n📊 Backfill Complete!');
    console.log(`   ✅ Successful: ${results.filter(r => r.status === 'success').length}`);
    console.log(`   ⏭️  Skipped: ${results.filter(r => r.status === 'skipped').length}`);
    console.log(`   ❌ Errors: ${errors.length}`);

    return res.status(200).json({
      success: true,
      message: '7-day historical backfill completed',
      results,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Backfill error:', error);
    return res.status(500).json({
      success: false,
      error: 'Backfill operation failed',
      details: error.message
    });
  }
}

/**
 * Calculate total hours for COMPLETED shifts only (no active clock-ins)
 */
function calculateCompletedHours(timeEntries) {
  let totalHours = 0;
  const employeesWorked = new Set();

  timeEntries.forEach(entry => {
    if (entry.employeeReference?.guid) {
      employeesWorked.add(entry.employeeReference.guid);
    }

    // Only count completed shifts (outDate exists)
    if (entry.outDate) {
      const regularHours = entry.regularHours || 0;
      const overtimeHours = entry.overtimeHours || 0;
      totalHours += regularHours + overtimeHours;
    }
  });

  return {
    totalHours,
    employeeCount: employeesWorked.size
  };
}

/**
 * Fetch CC tips for a specific business date
 */
async function fetchDayCCTips(accessToken, baseUrl, restaurantGuid, businessDate) {
  const formattedBusinessDate = businessDate.replace(/-/g, '');

  let allOrders = [];
  let page = 1;
  let hasMorePages = true;
  const pageSize = 100;

  while (hasMorePages) {
    const ordersUrl = `${baseUrl}/orders/v2/ordersBulk?businessDate=${formattedBusinessDate}&page=${page}&pageSize=${pageSize}`;

    const ordersResponse = await fetch(ordersUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Toast-Restaurant-External-ID': restaurantGuid,
        'Content-Type': 'application/json'
      }
    });

    if (!ordersResponse.ok) {
      console.error(`  Failed to fetch orders page ${page}`);
      break;
    }

    const pageOrders = await ordersResponse.json();

    if (Array.isArray(pageOrders) && pageOrders.length > 0) {
      allOrders = allOrders.concat(pageOrders);

      if (pageOrders.length === pageSize) {
        page++;
        await new Promise(resolve => setTimeout(resolve, 300));
      } else {
        hasMorePages = false;
      }
    } else {
      hasMorePages = false;
    }

    if (page > 50) {
      hasMorePages = false;
    }
  }

  // Calculate CC tips
  let totalCCTips = 0;

  allOrders.forEach(order => {
    if (order.voided || order.deleted) return;

    if (order.checks && Array.isArray(order.checks)) {
      order.checks.forEach(check => {
        if (check.voided || check.deleted) return;

        if (check.payments && Array.isArray(check.payments)) {
          check.payments.forEach(payment => {
            if (payment.type === 'CREDIT') {
              const tipAmount = payment.tipAmount || 0;

              if (payment.voided || payment.paymentStatus === 'VOIDED') return;
              if (payment.refundStatus === 'FULL') return;

              if (payment.refundStatus === 'PARTIAL' && payment.refund?.refundAmount) {
                const refundedTip = payment.refund.refundAmount || 0;
                totalCCTips += (tipAmount - refundedTip);
              } else {
                totalCCTips += tipAmount;
              }
            }
          });
        }
      });
    }
  });

  return {
    totalCCTips,
    orderCount: allOrders.length
  };
}
