/**
 * Daily Ordering Cron Job
 *
 * Runs at 4:00 AM PST (12:00 PM UTC) daily
 *
 * Algorithm:
 * 1. Load current inventory from Supabase
 * 2. Load historical consumption data (last 30 days)
 * 3. Determine which vendors need orders today
 * 4. Calculate optimal order quantities using predictive algorithms
 * 5. Generate HTML order sheets
 * 6. Send via EmailJS
 * 7. Log results to database
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// EmailJS configuration
const EMAILJS_SERVICE_ID = process.env.EMAILJS_SERVICE_ID;
const EMAILJS_TEMPLATE_ID_ORDERS = process.env.EMAILJS_TEMPLATE_ID_ORDERS || 'template_daily_orders';
const EMAILJS_USER_ID = process.env.EMAILJS_USER_ID;
const EMAILJS_PRIVATE_KEY = process.env.EMAILJS_PRIVATE_KEY;
const ORDER_EMAIL = process.env.ORDER_EMAIL || 'demetri7@gmail.com';

// Vendor schedules
const VENDOR_SCHEDULES = {
  'Greenleaf': {
    orderDays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    cutoffTime: '22:00',
    deliveryNextDay: true,
    specialRules: {
      'Friday': { coversDays: 2 } // Friday order covers Saturday + Sunday
    }
  },
  'Performance': {
    orderDays: ['Sunday', 'Wednesday'],
    cutoffTime: '15:00',
    deliveryNextDay: true
  },
  'Mani Imports': {
    orderDays: ['Tuesday', 'Thursday'],
    cutoffTime: '15:00',
    deliveryNextDay: true,
    specialRules: {
      'Thursday': { coversDays: 5 } // Thursday order covers Fri-Tue
    }
  },
  'Eatopia Foods': {
    orderDays: ['Wednesday'],
    cutoffTime: '17:00',
    deliveryDay: 'Thursday',
    coversDays: 7
  },
  'Alsco': {
    orderDays: [], // On-demand only
    minDaysBetweenOrders: 7
  }
};

/**
 * Main handler function
 */
export default async function handler(req, res) {
  console.log('🤖 Daily ordering cron job triggered at', new Date().toISOString());

  // Verify cron secret for security (prevents unauthorized calls)
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.error('❌ Unauthorized cron job access attempt');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Step 1: Load current inventory
    const inventory = await loadInventory();
    console.log(`📦 Loaded ${inventory.length} inventory items`);

    // Step 2: Load historical data for consumption analysis
    const historicalData = await loadHistoricalData();
    console.log(`📊 Loaded ${historicalData.length} historical records`);

    // Step 3: Determine which vendors need orders today
    const today = new Date();
    const vendorsToOrder = getVendorsForToday(today);
    console.log(`📅 Vendors to order today:`, vendorsToOrder);

    if (vendorsToOrder.length === 0) {
      console.log('✅ No vendors scheduled for ordering today');
      return res.status(200).json({
        success: true,
        message: 'No vendors scheduled for today',
        date: today.toISOString()
      });
    }

    // Step 4: Calculate orders for each vendor
    const ordersToSend = [];

    for (const vendor of vendorsToOrder) {
      const vendorItems = inventory.filter(item => item.vendor === vendor);
      const schedule = VENDOR_SCHEDULES[vendor];

      // Calculate days until next delivery
      const daysUntilNextDelivery = calculateDaysUntilNextDelivery(vendor, today);

      // Calculate order quantities
      const orderItems = [];
      const alerts = [];
      const parSuggestions = [];

      for (const item of vendorItems) {
        const itemHistory = historicalData.filter(h => h.item_id === item.id);

        // Calculate optimal order quantity
        const orderCalc = calculateOptimalOrder(item, itemHistory, daysUntilNextDelivery);

        if (orderCalc.orderQty > 0) {
          orderItems.push({
            name: item.item_name,
            qty: orderCalc.orderQty,
            unit: item.unit,
            stock: item.current_stock,
            par: item.par_level,
            reasoning: orderCalc.reasoning
          });
        }

        // Check for inventory alerts
        const itemAlerts = analyzeInventoryHealth(item, itemHistory);
        alerts.push(...itemAlerts);

        // Check for par level suggestions
        const parSuggestion = suggestParLevelAdjustment(item, itemHistory);
        if (parSuggestion) {
          parSuggestions.push({
            item: item.item_name,
            current: parSuggestion.currentPar,
            suggested: parSuggestion.suggestedPar,
            reason: parSuggestion.reason
          });
        }
      }

      if (orderItems.length > 0) {
        ordersToSend.push({
          vendor,
          items: orderItems,
          deliveryDate: calculateDeliveryDate(vendor, today),
          cutoffTime: schedule.cutoffTime,
          alerts: alerts.filter(a => a.severity === 'HIGH' || a.severity === 'CRITICAL'),
          parSuggestions,
          daysUntilNextDelivery
        });
      }
    }

    // Step 5 & 6: Generate and send emails
    const emailResults = [];

    for (const order of ordersToSend) {
      try {
        const emailSent = await sendOrderEmail(order, today);
        emailResults.push({
          vendor: order.vendor,
          success: true,
          itemCount: order.items.length
        });

        // Log order to database
        await logOrderToDatabase(order, today, 'sent');

      } catch (error) {
        console.error(`❌ Failed to send email for ${order.vendor}:`, error);
        emailResults.push({
          vendor: order.vendor,
          success: false,
          error: error.message
        });

        // Log failed attempt
        await logOrderToDatabase(order, today, 'failed', error.message);
      }
    }

    // Return summary
    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      vendorsProcessed: vendorsToOrder.length,
      ordersGenerated: ordersToSend.length,
      emailResults,
      summary: {
        totalItems: ordersToSend.reduce((sum, o) => sum + o.items.length, 0),
        alerts: ordersToSend.reduce((sum, o) => sum + o.alerts.length, 0),
        parSuggestions: ordersToSend.reduce((sum, o) => sum + o.parSuggestions.length, 0)
      }
    });

  } catch (error) {
    console.error('❌ Fatal error in daily ordering:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

/**
 * Load inventory from Supabase
 */
async function loadInventory() {
  const { data, error } = await supabase
    .from('inventory_items')
    .select('*')
    .order('vendor', { ascending: true })
    .order('item_name', { ascending: true });

  if (error) throw new Error(`Failed to load inventory: ${error.message}`);
  return data || [];
}

/**
 * Load historical consumption data (last 30 days)
 */
async function loadHistoricalData() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data, error } = await supabase
    .from('inventory_history')
    .select('*')
    .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
    .order('date', { ascending: true });

  if (error) {
    console.warn('⚠️ No historical data available (table may not exist yet)');
    return [];
  }

  return data || [];
}

/**
 * Determine which vendors should receive orders today
 */
function getVendorsForToday(date) {
  const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
  const vendorsToOrder = [];

  for (const [vendor, schedule] of Object.entries(VENDOR_SCHEDULES)) {
    if (schedule.orderDays.includes(dayName)) {
      vendorsToOrder.push(vendor);
    }
  }

  return vendorsToOrder;
}

/**
 * Calculate days until next delivery for a vendor
 */
function calculateDaysUntilNextDelivery(vendor, today) {
  const schedule = VENDOR_SCHEDULES[vendor];
  const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });

  // Check for special rules (e.g., Friday Greenleaf covers 2 days)
  if (schedule.specialRules && schedule.specialRules[dayName]) {
    return schedule.specialRules[dayName].coversDays;
  }

  // Default: next day delivery
  return 1;
}

/**
 * Calculate delivery date for an order
 */
function calculateDeliveryDate(vendor, orderDate) {
  const schedule = VENDOR_SCHEDULES[vendor];
  const deliveryDate = new Date(orderDate);

  if (schedule.deliveryDay) {
    // Fixed delivery day (e.g., Eatopia always Thursday)
    while (deliveryDate.toLocaleDateString('en-US', { weekday: 'long' }) !== schedule.deliveryDay) {
      deliveryDate.setDate(deliveryDate.getDate() + 1);
    }
  } else if (schedule.deliveryNextDay) {
    deliveryDate.setDate(deliveryDate.getDate() + 1);
  }

  return deliveryDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

/**
 * Calculate optimal order quantity using predictive algorithm
 */
function calculateOptimalOrder(item, historicalData, daysUntilNextDelivery) {
  // If no historical data, use simple par - stock calculation
  if (historicalData.length === 0) {
    const orderQty = Math.max(0, item.par_level - item.current_stock);
    return {
      orderQty,
      reasoning: {
        method: 'Simple (no historical data)',
        parLevel: item.par_level,
        currentStock: item.current_stock,
        daysUntilNextDelivery
      }
    };
  }

  // Calculate average daily consumption
  const avgDailyConsumption = historicalData.reduce((sum, record) => {
    return sum + (record.consumption_calculated || 0);
  }, 0) / historicalData.length;

  // Calculate consumption trend
  const recentAvg = historicalData.slice(-7).reduce((sum, r) => sum + (r.consumption_calculated || 0), 0) / 7;
  const olderAvg = historicalData.slice(0, 7).reduce((sum, r) => sum + (r.consumption_calculated || 0), 0) / 7;
  const trendPercentage = ((recentAvg - olderAvg) / olderAvg) * 100;

  // Calculate variability (standard deviation)
  const consumptions = historicalData.map(r => r.consumption_calculated || 0);
  const variance = consumptions.reduce((sum, val) => {
    return sum + Math.pow(val - avgDailyConsumption, 2);
  }, 0) / consumptions.length;
  const stdDev = Math.sqrt(variance);

  // Base calculation: days × daily usage
  const baseQty = Math.ceil(avgDailyConsumption * daysUntilNextDelivery);

  // Safety buffer (higher for variable items)
  const safetyBuffer = Math.ceil(stdDev * 1.5);

  // Trend adjustment (if increasing trend, add 10%)
  const trendAdjustment = trendPercentage > 5 ? Math.ceil(baseQty * 0.1) : 0;

  // Total predicted need
  const predictedNeed = baseQty + safetyBuffer + trendAdjustment;

  // Order quantity = predicted need - current stock
  const orderQty = Math.max(0, predictedNeed - item.current_stock);

  // Ensure we at least reach par level
  const orderQtyWithPar = Math.max(orderQty, item.par_level - item.current_stock);

  return {
    orderQty: orderQtyWithPar,
    reasoning: {
      method: 'Predictive algorithm',
      avgDailyConsumption: avgDailyConsumption.toFixed(2),
      daysUntilNextDelivery,
      baseQty,
      safetyBuffer,
      trendAdjustment,
      trendPercentage: trendPercentage.toFixed(1) + '%',
      predictedNeed,
      currentStock: item.current_stock,
      parLevel: item.par_level
    }
  };
}

/**
 * Analyze inventory health and generate alerts
 */
function analyzeInventoryHealth(item, historicalData) {
  const alerts = [];

  if (historicalData.length === 0) {
    alerts.push({
      type: 'NO_DATA',
      severity: 'MEDIUM',
      message: `${item.item_name}: No historical data available`
    });
    return alerts;
  }

  // Check for frequent stockouts
  const stockouts = historicalData.filter(h => h.closing_stock === 0).length;
  const stockoutRate = stockouts / historicalData.length;

  if (stockoutRate > 0.15) {
    alerts.push({
      type: 'FREQUENT_STOCKOUT',
      severity: 'HIGH',
      message: `${item.item_name}: Stocks out ${Math.round(stockoutRate * 100)}% of the time`
    });
  }

  // Check if never used
  const alwaysZero = historicalData.every(h => h.closing_stock === 0);
  if (alwaysZero) {
    alerts.push({
      type: 'UNUSED',
      severity: 'LOW',
      message: `${item.item_name}: Consistently at zero - may not be in use`
    });
  }

  return alerts;
}

/**
 * Suggest par level adjustments based on historical performance
 */
function suggestParLevelAdjustment(item, historicalData) {
  if (historicalData.length < 14) return null; // Need at least 2 weeks of data

  const stockouts = historicalData.filter(h => h.closing_stock === 0).length;
  const overstock = historicalData.filter(h => h.closing_stock > item.par_level * 1.5).length;

  if (stockouts > 2) {
    // Frequent stockouts → increase par
    const newPar = Math.ceil(item.par_level * 1.2);
    return {
      action: 'INCREASE',
      currentPar: item.par_level,
      suggestedPar: newPar,
      reason: `${stockouts} stockouts in last ${historicalData.length} days`
    };
  } else if (overstock > historicalData.length * 0.5 && stockouts === 0) {
    // Consistently overstocked → decrease par
    const newPar = Math.floor(item.par_level * 0.8);
    return {
      action: 'DECREASE',
      currentPar: item.par_level,
      suggestedPar: newPar,
      reason: `Overstocked ${overstock} days, no stockouts`
    };
  }

  return null;
}

/**
 * Send order email via EmailJS
 */
async function sendOrderEmail(order, orderDate) {
  // Format data for EmailJS template
  const templateParams = {
    vendor: order.vendor,
    order_date: orderDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
    delivery_date: order.deliveryDate,
    cutoff_time: order.cutoffTime,
    total_items: order.items.length,
    generated_time: new Date().toLocaleTimeString('en-US'),
    generated_timestamp: new Date().toISOString(),

    // Special notes for multi-day orders
    special_notes: order.daysUntilNextDelivery > 1
      ? `This order covers ${order.daysUntilNextDelivery} days until next delivery`
      : null,

    // Order items
    items: order.items,

    // Algorithm insights
    calculation_method: 'AI-powered predictive ordering with historical consumption analysis',
    days_covered: order.daysUntilNextDelivery,
    historical_days: 30,
    consumption_trend: calculateOverallTrend(order.items),

    // Alerts (send as array of strings, or null if none)
    alerts: order.alerts.length > 0 ? order.alerts.map(a => a.message) : null,

    // Par level suggestions (send as array, or null if none)
    par_suggestions: order.parSuggestions.length > 0 ? order.parSuggestions : null,

    // Email destination
    to_email: ORDER_EMAIL
  };

  // Send via EmailJS API
  const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      service_id: EMAILJS_SERVICE_ID,
      template_id: EMAILJS_TEMPLATE_ID_ORDERS,
      user_id: EMAILJS_USER_ID,
      accessToken: EMAILJS_PRIVATE_KEY,
      template_params: templateParams
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`EmailJS API error: ${response.status} - ${errorText}`);
  }

  console.log(`✅ Order email sent for ${order.vendor}`);
  return true;
}

/**
 * Calculate overall consumption trend for order
 */
function calculateOverallTrend(items) {
  const itemsWithTrend = items.filter(i => i.reasoning && i.reasoning.trendPercentage);
  if (itemsWithTrend.length === 0) return 'Stable';

  const avgTrend = itemsWithTrend.reduce((sum, item) => {
    const trend = parseFloat(item.reasoning.trendPercentage);
    return sum + trend;
  }, 0) / itemsWithTrend.length;

  if (avgTrend > 5) return `Increasing (${avgTrend.toFixed(1)}%)`;
  if (avgTrend < -5) return `Decreasing (${avgTrend.toFixed(1)}%)`;
  return 'Stable';
}

/**
 * Log order to database for tracking
 */
async function logOrderToDatabase(order, orderDate, status, errorMessage = null) {
  const { error } = await supabase
    .from('order_log')
    .insert([{
      order_date: orderDate.toISOString().split('T')[0],
      vendor: order.vendor,
      order_items: order.items,
      email_sent_at: status === 'sent' ? new Date().toISOString() : null,
      email_status: status,
      notes: errorMessage || `Automated order - ${order.items.length} items`,
      delivery_date: order.deliveryDate
    }]);

  if (error) {
    console.error('⚠️ Failed to log order to database:', error);
  }
}
