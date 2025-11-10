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
 * 6. Send via EmailJS Node.js SDK (SAME AS PM FLOW)
 * 7. Log results to database
 */

import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Gmail configuration
const GMAIL_USER = 'jaynascans@gmail.com';  // Sending account
const ORDERS_GMAIL_APP_PASSWORD = process.env.ORDERS_GMAIL_APP_PASSWORD;
const ORDER_EMAIL = process.env.ORDER_EMAIL || 'demetri7@gmail.com';  // Recipient

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

        // Get last counted date from most recent history
        const lastCounted = itemHistory.length > 0
          ? itemHistory[itemHistory.length - 1].counted_at
          : item.updated_at || null;

        // Get last known cost from item_cost_history
        const { data: lastCostData } = await supabase
          .from('item_cost_history')
          .select('unit_cost, effective_date')
          .eq('item_id', item.id)
          .order('effective_date', { ascending: false })
          .limit(1);

        const lastCost = lastCostData && lastCostData[0] ? lastCostData[0].unit_cost : item.current_unit_cost;
        const lastCostDate = lastCostData && lastCostData[0] ? lastCostData[0].effective_date : null;

        if (orderCalc.orderQty > 0) {
          orderItems.push({
            itemId: item.id,  // Include item ID for order history tracking
            name: item.item_name,
            qty: orderCalc.orderQty,
            unit: item.unit,
            stock: item.current_stock,
            par: item.par_level,
            lastCounted: lastCounted,
            lastCost: lastCost,
            lastCostDate: lastCostDate,
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
 * Send order email via Gmail (nodemailer)
 */
async function sendOrderEmail(order, orderDate) {
  // Create transporter
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: GMAIL_USER,
      pass: ORDERS_GMAIL_APP_PASSWORD
    }
  });

  // Generate HTML email
  const html = generateOrderEmailHTML(order, orderDate);

  // Check if this vendor gets PDF attachments and printer CC
  const vendorsWithPDF = ['Mani Imports', 'Performance', 'Greenleaf'];
  const includePDF = vendorsWithPDF.includes(order.vendor);
  const PRINTER_EMAIL = 'GSS4168CTJJA73@print.epsonconnect.com';

  // Base mail options
  const mailOptions = {
    from: `Jayna Gyro Orders <${GMAIL_USER}>`,
    to: ORDER_EMAIL,
    subject: `Daily Order - ${order.vendor}`,
    html: html
  };

  // Add CC to printer for specific vendors
  if (includePDF) {
    mailOptions.cc = PRINTER_EMAIL;
  }

  // Generate and attach PDF for specific vendors
  if (includePDF) {
    try {
      const pdfBase64 = await generateOrderingGuidePDF(order.vendor, order.items);
      const filename = `${order.vendor.replace(/\s+/g, '_')}_Item_List_${orderDate.toISOString().split('T')[0]}.pdf`;

      mailOptions.attachments = [{
        filename: filename,
        content: Buffer.from(pdfBase64, 'base64'),
        contentType: 'application/pdf'
      }];

      console.log(`📎 PDF attachment added for ${order.vendor}`);
    } catch (pdfError) {
      console.warn(`⚠️ Failed to generate PDF for ${order.vendor}:`, pdfError.message);
      // Continue sending email without PDF
    }
  }

  console.log('📧 Sending email via Gmail for', order.vendor);

  const info = await transporter.sendMail(mailOptions);
  console.log(`✅ Order email sent for ${order.vendor}:`, info.messageId);
  return true;
}

/**
 * Generate HTML email for order - Clean, simple, modern design
 */
function generateOrderEmailHTML(order, orderDate) {
  const orderDateStr = orderDate.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
  const generatedDateStr = new Date().toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
  const generatedTimeStr = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  const consumptionTrend = calculateOverallTrend(order.items) || 'Stable';

  // Generate items HTML
  const itemsHTML = order.items.map(item => {
    // Format last counted date
    let lastCountedStr = 'Unknown';
    if (item.lastCounted) {
      const lastCountedDate = new Date(item.lastCounted);
      const now = new Date();
      const diffHours = Math.floor((now - lastCountedDate) / (1000 * 60 * 60));

      if (diffHours < 24) {
        lastCountedStr = `${diffHours}h ago`;
      } else {
        const diffDays = Math.floor(diffHours / 24);
        lastCountedStr = `${diffDays}d ago`;
      }
    }

    // Format last cost and date
    let lastCostStr = '';
    if (item.lastCost) {
      const costFormatted = `$${parseFloat(item.lastCost).toFixed(2)}`;
      if (item.lastCostDate) {
        const costDate = new Date(item.lastCostDate);
        const costDateStr = costDate.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' });
        lastCostStr = `<div style="font-size: 11px; color: #999; margin-top: 2px;">Last price: ${costFormatted} (${costDateStr})</div>`;
      } else {
        lastCostStr = `<div style="font-size: 11px; color: #999; margin-top: 2px;">Last price: ${costFormatted}</div>`;
      }
    }

    // Format AI reasoning (very small text)
    let reasoningStr = '';
    if (item.reasoning) {
      if (item.reasoning.method === 'Simple (no historical data)') {
        reasoningStr = `<div style="font-size: 9px; color: #bbb; margin-top: 2px; font-style: italic;">AI: Par ${item.reasoning.parLevel} - Stock ${item.reasoning.currentStock} = ${item.qty} to order</div>`;
      } else {
        const avg = item.reasoning.avgDailyConsumption;
        const days = item.reasoning.daysUntilNextDelivery;
        const base = item.reasoning.baseQty;
        const buffer = item.reasoning.safetyBuffer;
        const trend = item.reasoning.trendAdjustment;
        const predicted = item.reasoning.predictedNeed;

        reasoningStr = `<div style="font-size: 9px; color: #bbb; margin-top: 2px; font-style: italic;">AI: ${avg}/day × ${days}d = ${base} + buffer ${buffer}${trend > 0 ? ` + trend ${trend}` : ''} = ${predicted} needed - ${item.stock} on hand</div>`;
      }
    }

    return `
    <tr style="border-bottom: 1px solid #e8e8e8;">
      <td style="padding: 10px 12px; font-size: 13px; color: #2c2c2c;">
        ${item.name}
        <div style="font-size: 11px; color: #999; margin-top: 2px;">Last count: ${lastCountedStr}</div>
        ${lastCostStr}
        ${reasoningStr}
      </td>
      <td style="padding: 10px 12px; text-align: center; font-size: 14px; font-weight: 600; color: #000;">${item.qty}</td>
      <td style="padding: 10px 12px; text-align: center; font-size: 13px; color: #666;">${item.unit}</td>
      <td style="padding: 10px 12px; text-align: center; font-size: 13px; color: #666;">${item.stock}</td>
      <td style="padding: 10px 12px; text-align: center; font-size: 13px; color: #666;">${item.par}</td>
    </tr>`;
  }).join('');

  // Generate AI suggestions HTML
  let aiSuggestionsHTML = '';
  if (order.parSuggestions.length > 0) {
    aiSuggestionsHTML = `
    <div style="margin-top: 24px;">
      <h3 style="margin: 0 0 12px 0; font-size: 11px; font-weight: 600; letter-spacing: 0.8px; text-transform: uppercase; color: #666;">AI PAR LEVEL SUGGESTIONS</h3>
      <div style="background: #f9f9f9; padding: 16px; border-radius: 4px;">
        ${order.parSuggestions.map(p => `
          <div style="margin-bottom: 8px; font-size: 13px; color: #2c2c2c;">
            <strong>${p.item}:</strong> Par ${p.current} → ${p.suggested} <span style="color: #666; font-style: italic;">(${p.reason})</span>
          </div>
        `).join('')}
      </div>
    </div>`;
  }

  // Generate alerts HTML
  let alertsHTML = '';
  if (order.alerts.length > 0) {
    alertsHTML = `
    <div style="margin-top: 24px;">
      <h3 style="margin: 0 0 12px 0; font-size: 11px; font-weight: 600; letter-spacing: 0.8px; text-transform: uppercase; color: #666;">INVENTORY ALERTS</h3>
      <div style="background: #fff4e6; padding: 16px; border-radius: 4px; border-left: 3px solid #ff9800;">
        ${order.alerts.map(a => `
          <div style="margin-bottom: 6px; font-size: 13px; color: #2c2c2c;">${a.message}</div>
        `).join('')}
      </div>
    </div>`;
  }

  // AI Learning section
  const aiLearningHTML = `
    <div style="margin-top: 24px;">
      <h3 style="margin: 0 0 12px 0; font-size: 11px; font-weight: 600; letter-spacing: 0.8px; text-transform: uppercase; color: #666;">AI ANALYSIS</h3>
      <div style="background: #f9f9f9; padding: 16px; border-radius: 4px;">
        <div style="margin-bottom: 8px; font-size: 13px; color: #2c2c2c;">
          <strong>Consumption Trend:</strong> ${consumptionTrend}
        </div>
        <div style="margin-bottom: 8px; font-size: 13px; color: #2c2c2c;">
          <strong>Days Covered:</strong> ${order.daysUntilNextDelivery} days until next delivery
        </div>
        <div style="font-size: 13px; color: #2c2c2c;">
          <strong>Historical Data:</strong> 30-day consumption analysis with predictive ordering
        </div>
      </div>
    </div>`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order - ${order.vendor}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif; background-color: #ffffff; color: #2c2c2c;">
  <div style="max-width: 650px; margin: 0 auto; padding: 32px 24px;">

    <!-- Header -->
    <div style="margin-bottom: 8px;">
      <h1 style="margin: 0; font-size: 13px; font-weight: 600; letter-spacing: 0.8px; text-transform: uppercase; color: #000;">AUTO-GENERATED ORDER SUGGESTION</h1>
      <p style="margin: 4px 0 0 0; font-size: 11px; color: #999; font-weight: 400;">Please double-check all quantities and inventory levels before placing this order.</p>
    </div>
    <div style="margin-bottom: 24px; padding-bottom: 24px; border-bottom: 2px solid #000;">
      <div style="font-size: 24px; font-weight: 600; color: #000; margin-bottom: 4px;">${order.vendor}</div>
      <div style="font-size: 13px; color: #666;">
        Order Date: ${orderDateStr} | Cutoff: ${order.cutoffTime} | Delivery: ${order.deliveryDate}
      </div>
    </div>

    <!-- Order Table -->
    <div style="margin-bottom: 24px;">
      <h3 style="margin: 0 0 12px 0; font-size: 11px; font-weight: 600; letter-spacing: 0.8px; text-transform: uppercase; color: #666;">ORDER ITEMS (${order.items.length})</h3>
      <table style="width: 100%; border-collapse: collapse; border: 1px solid #e8e8e8;">
        <thead>
          <tr style="background-color: #fafafa;">
            <th style="padding: 10px 12px; text-align: left; font-size: 10px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; color: #666; border-bottom: 1px solid #e8e8e8;">ITEM</th>
            <th style="padding: 10px 12px; text-align: center; font-size: 10px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; color: #666; border-bottom: 1px solid #e8e8e8; width: 70px;">ORDER</th>
            <th style="padding: 10px 12px; text-align: center; font-size: 10px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; color: #666; border-bottom: 1px solid #e8e8e8; width: 60px;">UNIT</th>
            <th style="padding: 10px 12px; text-align: center; font-size: 10px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; color: #666; border-bottom: 1px solid #e8e8e8; width: 70px;">ON HAND</th>
            <th style="padding: 10px 12px; text-align: center; font-size: 10px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; color: #666; border-bottom: 1px solid #e8e8e8; width: 60px;">PAR</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHTML}
        </tbody>
      </table>
    </div>

    ${aiLearningHTML}
    ${aiSuggestionsHTML}
    ${alertsHTML}

    <!-- Audit Footer -->
    <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e8e8e8; font-size: 11px; color: #999;">
      Generated: ${generatedDateStr} at ${generatedTimeStr}
    </div>

  </div>
</body>
</html>
  `;
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
  // Insert into order_log table
  const { data: orderLog, error: orderLogError } = await supabase
    .from('order_log')
    .insert([{
      order_date: orderDate.toISOString().split('T')[0],
      vendor: order.vendor,
      order_items: order.items,
      total_items: order.items.length,
      email_sent_at: status === 'sent' ? new Date().toISOString() : null,
      email_status: status,
      notes: errorMessage || `Automated order - ${order.items.length} items`,
      delivery_date: order.deliveryDate
    }])
    .select();

  if (orderLogError) {
    console.error('⚠️ Failed to log order to database:', orderLogError);
    return;
  }

  const orderLogId = orderLog && orderLog[0] ? orderLog[0].id : null;

  // Insert into item_order_history for each item
  if (orderLogId && status === 'sent') {
    const itemHistoryRecords = order.items.map(item => ({
      item_id: item.itemId || null, // Will need to match by name if itemId not available
      order_log_id: orderLogId,
      order_date: orderDate.toISOString().split('T')[0],
      vendor: order.vendor,
      quantity_ordered: item.qty,
      unit: item.unit,
      stock_at_order: item.stock,
      par_at_order: item.par,
      ai_calculation_method: item.reasoning?.method || 'Predictive algorithm',
      ai_reasoning: item.reasoning || null,
      consumption_trend: calculateOverallTrend(order.items),
      days_until_next_delivery: order.daysUntilNextDelivery,
      was_auto_generated: true,
      was_manually_adjusted: false
    }));

    const { error: historyError } = await supabase
      .from('item_order_history')
      .insert(itemHistoryRecords);

    if (historyError) {
      console.error('⚠️ Failed to log item order history:', historyError);
    }
  }
}

/**
 * Generate ordering guide PDF (VENDOR ITEM LIST ONLY - no blank worksheet)
 */
async function generateOrderingGuidePDF(vendorName, orderItems) {
  const { jsPDF } = await import('jspdf');
  await import('jspdf-autotable');

  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });

  const today = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  // SINGLE PAGE: Complete inventory list from database
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(`${vendorName} - Item List`, 40, 40);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${today}`, 40, 60);
  doc.text('Full list of all inventory items for this vendor', 40, 75);

  // Load ALL inventory items for this vendor from database
  const { data: vendorItems, error: inventoryError } = await supabase
    .from('inventory_items')
    .select('*')
    .eq('vendor', vendorName)
    .order('item_name');

  if (inventoryError || !vendorItems || vendorItems.length === 0) {
    doc.setFontSize(10);
    doc.text(`No inventory items found for ${vendorName}`, 40, 80);
  } else {
    // Prepare table data
    const inventoryTableData = vendorItems.map(item => {
      const lastCounted = item.last_counted_at
        ? new Date(item.last_counted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
        : 'Never';

      return [
        item.item_name || 'N/A',
        `${item.current_stock || 0} ${item.unit || ''}`,
        item.par_level || 0,
        lastCounted
      ];
    });

    doc.autoTable({
      head: [['ITEM NAME', 'CURRENT STOCK', 'PAR', 'LAST COUNT']],
      body: inventoryTableData,
      startY: 90,
      theme: 'grid',
      styles: {
        fontSize: 7,
        cellPadding: 3,
        lineColor: [200, 200, 200],
        lineWidth: 0.3
      },
      headStyles: {
        fillColor: [100, 100, 100],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 7,
        halign: 'center'
      },
      columnStyles: {
        0: { cellWidth: 280 },                    // ITEM NAME
        1: { cellWidth: 90, halign: 'center' },   // CURRENT STOCK
        2: { cellWidth: 50, halign: 'center' },   // PAR
        3: { cellWidth: 80, halign: 'center' }    // LAST COUNT
      },
      margin: { left: 40, right: 40, bottom: 40 }
    });

    // Add item count at bottom
    const finalY = doc.lastAutoTable.finalY || 500;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text(
      `Total: ${inventoryTableData.length} items in inventory`,
      40,
      finalY + 15
    );
  }

  // Footer for all pages
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Page ${i} of ${pageCount}`,
      doc.internal.pageSize.width / 2,
      doc.internal.pageSize.height - 20,
      { align: 'center' }
    );
  }

  // Convert to base64
  return doc.output('datauristring').split(',')[1];
}
