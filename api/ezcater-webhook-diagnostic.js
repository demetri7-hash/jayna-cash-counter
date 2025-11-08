/**
 * EZCater Webhook Diagnostic Tool
 * Investigates why webhooks aren't working
 *
 * Checks:
 * 1. Recent EZCater orders in database (last 7 days)
 * 2. Webhook subscription status
 * 3. Webhook endpoint accessibility
 * 4. Environment variable configuration
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
    console.log('🔍 EZCater Webhook Diagnostic Starting...');

    const diagnostics = {
      timestamp: new Date().toISOString(),
      checks: {},
      issues: [],
      recommendations: []
    };

    // CHECK 1: Environment Variables
    console.log('📋 Check 1: Environment Variables');
    const hasSupabaseUrl = !!process.env.SUPABASE_URL;
    const hasSupabaseKey = !!process.env.SUPABASE_KEY;
    const hasEzcaterToken = !!process.env.EZCATER_API_TOKEN;
    const hasEzcaterUrl = !!process.env.EZCATER_API_URL;

    diagnostics.checks.environment = {
      SUPABASE_URL: hasSupabaseUrl,
      SUPABASE_KEY: hasSupabaseKey,
      EZCATER_API_TOKEN: hasEzcaterToken,
      EZCATER_API_URL: hasEzcaterUrl || 'Using default: https://api.ezcater.com/graphql'
    };

    if (!hasSupabaseUrl || !hasSupabaseKey) {
      diagnostics.issues.push('❌ CRITICAL: Supabase credentials missing');
    }
    if (!hasEzcaterToken) {
      diagnostics.issues.push('❌ CRITICAL: EZCater API token missing');
    }

    // CHECK 2: Database Connection and Recent Orders
    console.log('📋 Check 2: Database Orders (Last 7 Days)');
    if (hasSupabaseUrl && hasSupabaseKey) {
      const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

      // Get orders from last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const sevenDaysAgoStr = sevenDaysAgo.toISOString();

      const { data: recentOrders, error: ordersError } = await supabase
        .from('catering_orders')
        .select('*')
        .eq('source_system', 'EZCATER')
        .gte('created_at', sevenDaysAgoStr)
        .order('created_at', { ascending: false });

      if (ordersError) {
        diagnostics.issues.push(`❌ Database query error: ${ordersError.message}`);
        diagnostics.checks.database = { error: ordersError.message };
      } else {
        diagnostics.checks.database = {
          status: 'connected',
          recent_orders_count: recentOrders.length,
          orders: recentOrders.map(order => ({
            order_number: order.order_number,
            external_order_id: order.external_order_id,
            customer_name: order.customer_name,
            delivery_date: order.delivery_date,
            delivery_time: order.delivery_time,
            total_amount: order.total_amount,
            source_type: order.source_type,
            created_at: order.created_at,
            last_synced_at: order.last_synced_at
          }))
        };

        console.log(`✅ Found ${recentOrders.length} EZCater orders in last 7 days`);

        // Check if any were created via webhook (source_type: 'ezCater') vs manual import (source_type: 'ezCater_manual')
        const webhookOrders = recentOrders.filter(o => o.source_type === 'ezCater');
        const manualOrders = recentOrders.filter(o => o.source_type === 'ezCater_manual' || o.source_type === 'ezCater_TEST');

        diagnostics.checks.order_sources = {
          webhook_imports: webhookOrders.length,
          manual_imports: manualOrders.length
        };

        if (webhookOrders.length === 0 && recentOrders.length > 0) {
          diagnostics.issues.push('⚠️ WARNING: All recent EZCater orders were manually imported, none came from webhook');
        }
      }
    } else {
      diagnostics.checks.database = { status: 'skipped', reason: 'Missing Supabase credentials' };
    }

    // CHECK 3: EZCater Webhook Subscriptions
    console.log('📋 Check 3: EZCater Webhook Subscriptions');
    if (hasEzcaterToken) {
      const apiUrl = process.env.EZCATER_API_URL || 'https://api.ezcater.com/graphql';

      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': process.env.EZCATER_API_TOKEN,
            'Apollographql-client-name': 'jayna-catering-system',
            'Apollographql-client-version': '1.0.0'
          },
          body: JSON.stringify({
            query: `
              query ListSubscriptions {
                eventNotificationSubscriptions {
                  nodes {
                    id
                    eventTypes
                    url
                    active
                    createdAt
                  }
                }
              }
            `
          })
        });

        const data = await response.json();

        if (data.errors) {
          diagnostics.issues.push(`❌ EZCater API error: ${JSON.stringify(data.errors)}`);
          diagnostics.checks.webhooks = { error: data.errors };
        } else {
          const subscriptions = data.data?.eventNotificationSubscriptions?.nodes || [];
          diagnostics.checks.webhooks = {
            total_subscriptions: subscriptions.length,
            subscriptions: subscriptions.map(sub => ({
              id: sub.id,
              event_types: sub.eventTypes,
              url: sub.url,
              active: sub.active,
              created_at: sub.createdAt
            }))
          };

          console.log(`✅ Found ${subscriptions.length} webhook subscriptions`);

          // Check if all 4 event types are subscribed
          const eventTypes = subscriptions.flatMap(sub => sub.eventTypes || []);
          const requiredEvents = ['ORDER_SUBMITTED', 'ORDER_ACCEPTED', 'ORDER_REJECTED', 'ORDER_CANCELLED'];
          const missingEvents = requiredEvents.filter(e => !eventTypes.includes(e));

          if (missingEvents.length > 0) {
            diagnostics.issues.push(`⚠️ Missing webhook subscriptions for: ${missingEvents.join(', ')}`);
          }

          // Check if any subscriptions are inactive
          const inactiveSubscriptions = subscriptions.filter(sub => !sub.active);
          if (inactiveSubscriptions.length > 0) {
            diagnostics.issues.push(`❌ ${inactiveSubscriptions.length} webhook subscription(s) are INACTIVE`);
          }

          // Check if webhook URL is correct
          const expectedUrl = 'https://jayna-cash-counter.vercel.app/api/ezcater-webhook';
          const wrongUrlSubs = subscriptions.filter(sub => sub.url !== expectedUrl);
          if (wrongUrlSubs.length > 0) {
            diagnostics.issues.push(`⚠️ ${wrongUrlSubs.length} subscription(s) have incorrect URL: ${wrongUrlSubs.map(s => s.url).join(', ')}`);
            diagnostics.recommendations.push(`Expected URL: ${expectedUrl}`);
          }
        }
      } catch (error) {
        diagnostics.issues.push(`❌ Failed to fetch subscriptions: ${error.message}`);
        diagnostics.checks.webhooks = { error: error.message };
      }
    } else {
      diagnostics.checks.webhooks = { status: 'skipped', reason: 'Missing EZCater API token' };
    }

    // CHECK 4: Webhook Endpoint Accessibility
    console.log('📋 Check 4: Webhook Endpoint Accessibility');
    const webhookUrl = 'https://jayna-cash-counter.vercel.app/api/ezcater-webhook';

    try {
      // Test OPTIONS request (CORS preflight)
      const optionsResponse = await fetch(webhookUrl, {
        method: 'OPTIONS'
      });

      // Test GET request (should return 405 Method Not Allowed)
      const getResponse = await fetch(webhookUrl, {
        method: 'GET'
      });

      diagnostics.checks.endpoint = {
        url: webhookUrl,
        options_status: optionsResponse.status,
        get_status: getResponse.status,
        accessible: optionsResponse.status === 200 && getResponse.status === 405
      };

      if (getResponse.status !== 405) {
        diagnostics.issues.push(`⚠️ Webhook endpoint returned unexpected status for GET: ${getResponse.status} (expected 405)`);
      }
    } catch (error) {
      diagnostics.issues.push(`❌ Failed to test webhook endpoint: ${error.message}`);
      diagnostics.checks.endpoint = { error: error.message };
    }

    // RECOMMENDATIONS
    if (diagnostics.issues.length === 0) {
      diagnostics.recommendations.push('✅ All checks passed! Webhook system appears healthy.');
      diagnostics.recommendations.push('🔍 Check Vercel logs for webhook requests: vercel logs <deployment-url>');
      diagnostics.recommendations.push('🔍 Manually trigger a test webhook from EZCater or use /api/test-ezcater-webhook');
    } else {
      diagnostics.recommendations.push('⚠️ Issues detected. Review the "issues" array above for details.');

      if (diagnostics.checks.order_sources?.webhook_imports === 0) {
        diagnostics.recommendations.push('💡 No webhook imports detected. Possible causes:');
        diagnostics.recommendations.push('   1. Webhook subscriptions are inactive or misconfigured');
        diagnostics.recommendations.push('   2. EZCater is not sending webhook events');
        diagnostics.recommendations.push('   3. Webhook handler is crashing (check Vercel logs)');
        diagnostics.recommendations.push('   4. Webhook URL in EZCater is incorrect');
      }
    }

    // Summary
    const summary = {
      total_checks: Object.keys(diagnostics.checks).length,
      issues_found: diagnostics.issues.length,
      status: diagnostics.issues.length === 0 ? 'HEALTHY' : diagnostics.issues.some(i => i.startsWith('❌')) ? 'CRITICAL' : 'WARNING'
    };

    console.log(`\n=== DIAGNOSTIC SUMMARY ===`);
    console.log(`Status: ${summary.status}`);
    console.log(`Total Checks: ${summary.total_checks}`);
    console.log(`Issues Found: ${summary.issues_found}`);

    return res.json({
      success: true,
      summary,
      diagnostics
    });

  } catch (error) {
    console.error('❌ Diagnostic error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
}
