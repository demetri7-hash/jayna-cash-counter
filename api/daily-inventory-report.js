/**
 * Daily Inventory Report Cron Job
 *
 * Runs at 4:00 AM PST (12:00 PM UTC) daily
 *
 * Sends combined daily report for:
 * - PREP items inventory counts
 * - DRY GOODS inventory counts
 *
 * Email includes:
 * - Item name
 * - Current count
 * - Par level
 * - Last counted date/time
 * - Last counted by (user)
 * - Status indicators (OK/LOW/OUT/NOT COUNTED)
 */

import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Gmail configuration
const GMAIL_USER = 'jaynascans@gmail.com';  // Sending account
const GMAIL_APP_PASSWORD = process.env.ORDERS_GMAIL_APP_PASSWORD;
const REPORT_EMAIL = 'smanager@jaynagyro.com';  // Recipient

/**
 * Main handler function
 */
export default async function handler(req, res) {
  console.log('📊 Daily inventory report cron job triggered at', new Date().toISOString());

  // Verify cron secret for security (prevents unauthorized calls)
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.error('❌ Unauthorized cron job access attempt');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Fetch PREP items
    const { data: prepItems, error: prepError } = await supabase
      .from('inventory_items')
      .select('*')
      .or('item_type.eq.prep,vendor.eq.PREP')
      .order('item_name', { ascending: true });

    if (prepError) throw new Error(`Failed to load prep items: ${prepError.message}`);

    // Fetch DRY GOODS items
    const { data: dryGoodsItems, error: dryGoodsError } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('item_type', 'dry_goods')
      .order('item_name', { ascending: true });

    if (dryGoodsError) throw new Error(`Failed to load dry goods: ${dryGoodsError.message}`);

    console.log(`📦 Loaded ${prepItems?.length || 0} prep items`);
    console.log(`📦 Loaded ${dryGoodsItems?.length || 0} dry goods items`);

    // Generate and send email
    const emailSent = await sendInventoryReportEmail(prepItems || [], dryGoodsItems || []);

    if (emailSent) {
      console.log('✅ Daily inventory report sent successfully');
      return res.status(200).json({
        success: true,
        timestamp: new Date().toISOString(),
        prepItemsCount: prepItems?.length || 0,
        dryGoodsCount: dryGoodsItems?.length || 0,
        emailSent: true
      });
    } else {
      throw new Error('Failed to send email');
    }

  } catch (error) {
    console.error('❌ Fatal error in daily inventory report:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

/**
 * Send inventory report email via Gmail
 */
async function sendInventoryReportEmail(prepItems, dryGoodsItems) {
  // Create transporter
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_APP_PASSWORD
    }
  });

  // Generate HTML email
  const html = generateInventoryReportHTML(prepItems, dryGoodsItems);

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  const mailOptions = {
    from: `Jayna Gyro Inventory <${GMAIL_USER}>`,
    to: REPORT_EMAIL,
    subject: `Daily Inventory Report - ${today}`,
    html: html
  };

  console.log('📧 Sending inventory report email via Gmail');

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent successfully:`, info.messageId);
    return true;
  } catch (error) {
    console.error('❌ Failed to send email:', error);
    throw error;
  }
}

/**
 * Generate HTML email for inventory report
 */
function generateInventoryReportHTML(prepItems, dryGoodsItems) {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
  const timeGenerated = new Date().toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  // Calculate stats for PREP items
  const prepStats = calculateSectionStats(prepItems);
  const dryGoodsStats = calculateSectionStats(dryGoodsItems);

  // Generate PREP items table
  const prepItemsHTML = prepItems.length > 0
    ? prepItems.map(item => generateItemRow(item)).join('')
    : '<tr><td colspan="5" style="padding: 20px; text-align: center; color: #999; font-style: italic;">No prep items found</td></tr>';

  // Generate DRY GOODS items table
  const dryGoodsItemsHTML = dryGoodsItems.length > 0
    ? dryGoodsItems.map(item => generateItemRow(item)).join('')
    : '<tr><td colspan="5" style="padding: 20px; text-align: center; color: #999; font-style: italic;">No dry goods items found</td></tr>';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Daily Inventory Report</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Aptos', 'Segoe UI Variable', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; background-color: #ffffff; color: #2c2c2c;">
  <div style="max-width: 800px; margin: 0 auto; padding: 32px 24px;">

    <!-- Header -->
    <div style="margin-bottom: 8px;">
      <h1 style="margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #000;">DAILY INVENTORY REPORT</h1>
      <p style="margin: 4px 0 0 0; font-size: 13px; color: #666; font-weight: 400;">${today} • Generated at ${timeGenerated}</p>
    </div>
    <div style="margin-bottom: 32px; padding-bottom: 24px; border-bottom: 3px solid #00A8E1;"></div>

    <!-- Summary Stats -->
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 32px;">
      <div style="background: #f9f9f9; padding: 20px; border: 2px solid #e0e0e0;">
        <div style="font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: #666; margin-bottom: 12px;">PREP ITEMS</div>
        <div style="font-size: 28px; font-weight: 700; color: #00A8E1; margin-bottom: 8px;">${prepStats.total}</div>
        <div style="font-size: 12px; color: #666;">
          <span style="color: #f59e0b; font-weight: 600;">${prepStats.lowStock}</span> Low Stock •
          <span style="color: #dc2626; font-weight: 600;">${prepStats.outOfStock}</span> Out •
          <span style="color: #999; font-weight: 600;">${prepStats.notCounted}</span> Not Counted
        </div>
      </div>
      <div style="background: #f9f9f9; padding: 20px; border: 2px solid #e0e0e0;">
        <div style="font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: #666; margin-bottom: 12px;">DRY GOODS</div>
        <div style="font-size: 28px; font-weight: 700; color: #00A8E1; margin-bottom: 8px;">${dryGoodsStats.total}</div>
        <div style="font-size: 12px; color: #666;">
          <span style="color: #f59e0b; font-weight: 600;">${dryGoodsStats.lowStock}</span> Low Stock •
          <span style="color: #dc2626; font-weight: 600;">${dryGoodsStats.outOfStock}</span> Out •
          <span style="color: #999; font-weight: 600;">${dryGoodsStats.notCounted}</span> Not Counted
        </div>
      </div>
    </div>

    <!-- PREP ITEMS SECTION -->
    <div style="margin-bottom: 40px;">
      <h2 style="margin: 0 0 16px 0; font-size: 14px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; color: #00A8E1; padding-bottom: 8px; border-bottom: 2px solid #00A8E1;">PREP ITEMS (${prepItems.length})</h2>
      <table style="width: 100%; border-collapse: collapse; border: 2px solid #e0e0e0;">
        <thead>
          <tr style="background-color: #f5f5f5;">
            <th style="padding: 12px 14px; text-align: left; font-size: 10px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase; color: #666; border-bottom: 2px solid #e0e0e0;">ITEM NAME</th>
            <th style="padding: 12px 14px; text-align: center; font-size: 10px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase; color: #666; border-bottom: 2px solid #e0e0e0; width: 90px;">CURRENT</th>
            <th style="padding: 12px 14px; text-align: center; font-size: 10px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase; color: #666; border-bottom: 2px solid #e0e0e0; width: 80px;">PAR</th>
            <th style="padding: 12px 14px; text-align: center; font-size: 10px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase; color: #666; border-bottom: 2px solid #e0e0e0; width: 120px;">LAST COUNT</th>
            <th style="padding: 12px 14px; text-align: center; font-size: 10px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase; color: #666; border-bottom: 2px solid #e0e0e0; width: 90px;">STATUS</th>
          </tr>
        </thead>
        <tbody>
          ${prepItemsHTML}
        </tbody>
      </table>
    </div>

    <!-- DRY GOODS SECTION -->
    <div style="margin-bottom: 40px;">
      <h2 style="margin: 0 0 16px 0; font-size: 14px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; color: #00A8E1; padding-bottom: 8px; border-bottom: 2px solid #00A8E1;">DRY GOODS (${dryGoodsItems.length})</h2>
      <table style="width: 100%; border-collapse: collapse; border: 2px solid #e0e0e0;">
        <thead>
          <tr style="background-color: #f5f5f5;">
            <th style="padding: 12px 14px; text-align: left; font-size: 10px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase; color: #666; border-bottom: 2px solid #e0e0e0;">ITEM NAME</th>
            <th style="padding: 12px 14px; text-align: center; font-size: 10px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase; color: #666; border-bottom: 2px solid #e0e0e0; width: 90px;">CURRENT</th>
            <th style="padding: 12px 14px; text-align: center; font-size: 10px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase; color: #666; border-bottom: 2px solid #e0e0e0; width: 80px;">PAR</th>
            <th style="padding: 12px 14px; text-align: center; font-size: 10px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase; color: #666; border-bottom: 2px solid #e0e0e0; width: 120px;">LAST COUNT</th>
            <th style="padding: 12px 14px; text-align: center; font-size: 10px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase; color: #666; border-bottom: 2px solid #e0e0e0; width: 90px;">STATUS</th>
          </tr>
        </thead>
        <tbody>
          ${dryGoodsItemsHTML}
        </tbody>
      </table>
    </div>

    <!-- Footer -->
    <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #e0e0e0; font-size: 11px; color: #999; text-align: center;">
      <div style="margin-bottom: 8px;">Daily Inventory Report • Jayna Gyro</div>
      <div>This report is automatically generated daily at 4:00 AM Pacific Time</div>
    </div>

  </div>
</body>
</html>
  `;
}

/**
 * Generate table row for single item
 */
function generateItemRow(item) {
  const currentStock = item.current_stock || 0;
  const parLevel = item.par_level || 0;
  const unit = item.unit || '';

  // Determine status
  let status = 'OK';
  let statusColor = '#059669'; // Green
  let rowBg = '#ffffff';

  if (!item.last_counted_date) {
    status = 'NOT COUNTED';
    statusColor = '#999999'; // Gray
    rowBg = '#f9f9f9';
  } else if (currentStock === 0) {
    status = 'OUT';
    statusColor = '#dc2626'; // Red
    rowBg = '#fee2e2';
  } else if (currentStock <= parLevel * 0.3) {
    status = 'LOW';
    statusColor = '#f59e0b'; // Orange/Yellow
    rowBg = '#fef3c7';
  }

  // Format last counted
  let lastCountedText = 'Never';
  let countedByText = 'Unknown';

  if (item.last_counted_date) {
    const lastCounted = new Date(item.last_counted_date);
    const now = new Date();
    const diffHours = Math.floor((now - lastCounted) / (1000 * 60 * 60));

    if (diffHours < 1) {
      lastCountedText = 'Just now';
    } else if (diffHours < 24) {
      lastCountedText = `${diffHours}h ago`;
    } else {
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays === 1) {
        lastCountedText = 'Yesterday';
      } else {
        lastCountedText = `${diffDays}d ago`;
      }
    }

    countedByText = item.last_counted_by || 'Unknown';
  }

  return `
    <tr style="border-bottom: 1px solid #e0e0e0; background: ${rowBg};">
      <td style="padding: 12px 14px; font-size: 13px; color: #2c2c2c; font-weight: 600;">
        ${item.item_name}
      </td>
      <td style="padding: 12px 14px; text-align: center; font-size: 15px; font-weight: 700; color: #000;">
        ${currentStock} <span style="font-size: 11px; font-weight: 500; color: #666;">${unit}</span>
      </td>
      <td style="padding: 12px 14px; text-align: center; font-size: 14px; color: #666;">
        ${parLevel}
      </td>
      <td style="padding: 12px 14px; text-align: center; font-size: 11px; color: #666;">
        <div style="margin-bottom: 3px;">${lastCountedText}</div>
        <div style="font-size: 10px; color: #999; font-style: italic;">by ${countedByText}</div>
      </td>
      <td style="padding: 12px 14px; text-align: center;">
        <span style="display: inline-block; padding: 4px 10px; background: ${statusColor}; color: white; font-size: 9px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase; border-radius: 0;">${status}</span>
      </td>
    </tr>`;
}

/**
 * Calculate stats for a section (prep or dry goods)
 */
function calculateSectionStats(items) {
  let total = items.length;
  let lowStock = 0;
  let outOfStock = 0;
  let notCounted = 0;

  items.forEach(item => {
    const currentStock = item.current_stock || 0;
    const parLevel = item.par_level || 0;

    if (!item.last_counted_date) {
      notCounted++;
    } else if (currentStock === 0) {
      outOfStock++;
    } else if (currentStock <= parLevel * 0.3) {
      lowStock++;
    }
  });

  return {
    total,
    lowStock,
    outOfStock,
    notCounted
  };
}
