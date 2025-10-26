/**
 * Auto-Print Prep List at 4am
 *
 * Runs at 4:00 AM PST (11:00 AM UTC) daily
 *
 * Logic:
 * - Check if any prep items were counted between 9pm and 4am (8 hour window)
 * - If yes, generate prep list PDF and send to Epson printer
 * - Uses same PRIORITY-BASED format as manual prep sheet (index.html)
 */

import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Gmail configuration
const GMAIL_USER = 'jaynascans@gmail.com';
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;
const PRINTER_EMAIL = 'GSS4168CTJJA73@print.epsonconnect.com';

/**
 * PACIFIC TIMEZONE UTILITIES
 * Server-side date/time formatting (Vercel runs in UTC, can't rely on local timezone)
 */
function formatPacificDate() {
  const now = new Date();
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'America/Los_Angeles'
  }).format(now);
}

function formatPacificDateShort() {
  const now = new Date();
  return new Intl.DateTimeFormat('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
    timeZone: 'America/Los_Angeles'
  }).format(now);
}

function formatPacificDateTime(dateObj) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/Los_Angeles'
  }).format(dateObj);
}

export default async function handler(req, res) {
  console.log('🤖 Auto-print prep list triggered at', new Date().toISOString());

  // Verify cron secret
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Calculate 8-hour window (9pm yesterday to 4am today Pacific time)
    const now = new Date();
    const pacificNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));

    const fourAmToday = new Date(pacificNow);
    fourAmToday.setHours(4, 0, 0, 0);

    const ninePmYesterday = new Date(fourAmToday);
    ninePmYesterday.setHours(ninePmYesterday.getHours() - 7); // 9pm = 4am - 7 hours

    console.log(`Checking prep counts between ${ninePmYesterday.toISOString()} and ${fourAmToday.toISOString()}`);

    // Check if any prep items were counted in the 8-hour window
    const { data: recentCounts, error: countError } = await supabase
      .from('inventory_items')
      .select('*')
      .or('vendor.eq.PREP,item_type.eq.prep')
      .gte('last_counted_date', ninePmYesterday.toISOString())
      .lte('last_counted_date', fourAmToday.toISOString());

    if (countError) {
      throw new Error(`Failed to check prep counts: ${countError.message}`);
    }

    if (!recentCounts || recentCounts.length === 0) {
      console.log('✅ No prep items counted in window - skipping auto-print');
      return res.status(200).json({
        success: true,
        message: 'No prep items counted - no print needed',
        timestamp: now.toISOString()
      });
    }

    console.log(`📋 Found ${recentCounts.length} prep items counted - generating PDF`);

    // Load ALL prep items for the sheet
    const { data: allPrepItems, error: prepError } = await supabase
      .from('inventory_items')
      .select('*')
      .or('vendor.eq.PREP,item_type.eq.prep')
      .order('item_name');

    if (prepError || !allPrepItems) {
      throw new Error('Failed to load prep items');
    }

    // Generate PDF with priority-based format
    const pdfBase64 = await generatePrepListPDF(allPrepItems);
    const filename = `Prep_Sheet_${formatPacificDateShort().replace(/\//g, '-')}.pdf`;

    // Send to printer via email
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: GMAIL_USER,
        pass: GMAIL_APP_PASSWORD
      }
    });

    const mailOptions = {
      from: `Jayna Prep List <${GMAIL_USER}>`,
      to: PRINTER_EMAIL,
      subject: `Print: Prep Sheet - ${formatPacificDateShort()}`,
      text: 'Daily prep sheet for morning crew.',
      html: `<p><strong>Daily Prep Sheet</strong></p><p>Auto-generated at 4:00 AM for morning prep cook.</p>`,
      attachments: [{
        filename: filename,
        content: Buffer.from(pdfBase64, 'base64'),
        contentType: 'application/pdf'
      }]
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Prep list sent to printer:`, info.messageId);

    return res.status(200).json({
      success: true,
      message: 'Prep list sent to printer',
      itemsCounted: recentCounts.length,
      totalPrepItems: allPrepItems.length,
      messageId: info.messageId,
      timestamp: now.toISOString()
    });

  } catch (error) {
    console.error('❌ Error in auto-print prep:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Generate prep list PDF with PRIORITY-BASED format (matching index.html)
 */
async function generatePrepListPDF(prepItems) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'in', format: 'letter' });

  const jaynaBlue = [33, 150, 243];
  const darkGray = [66, 66, 66];
  const black = [33, 33, 33];

  let yPos = 0.5;

  // ===== HEADER =====
  doc.setFillColor(33, 150, 243);
  doc.rect(0, 0, 8.5, 0.55, 'F');

  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('PREP SHEET - ' + formatPacificDateShort(), 0.5, 0.35);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'America/Los_Angeles' })}`, 6.8, 0.35);

  yPos = 0.7;
  doc.setTextColor(0, 0, 0);

  // Calculate stock percentages and recommendations
  const recommendations = prepItems.map(item => {
    const currentStock = parseFloat(item.current_stock) || 0;
    const parLevel = parseFloat(item.par_level) || 0;
    const makeAmount = parseFloat(item.make_amount) || 0;

    let stockPercentage = 0;
    if (parLevel > 0) {
      stockPercentage = (currentStock / parLevel) * 100;
    }

    let priority = 'low';
    let reason = 'Stock good';

    if (currentStock === 0) {
      priority = 'urgent';
      if (item.not_made_daily) {
        reason = 'Out of stock - Not made daily, check with manager first';
      } else {
        reason = 'Out of stock - make immediately';
      }
    } else if (stockPercentage < 50) {
      priority = 'high';
      if (item.not_made_daily) {
        reason = `Low stock (${stockPercentage.toFixed(0)}%) - Not made daily, check with manager`;
      } else {
        reason = `Stock below 50% (${stockPercentage.toFixed(0)}%)`;
      }
    } else if (stockPercentage === 50) {
      priority = 'medium';
      if (item.not_made_daily) {
        reason = `Stock at 50% - Not made daily, check with manager`;
      } else {
        reason = `Stock at 50%`;
      }
    } else if (stockPercentage <= 100) {
      if (stockPercentage < 75) {
        priority = 'medium';
        reason = `Stock good (${stockPercentage.toFixed(0)}%)`;
      } else {
        priority = 'low';
        reason = `Stock good (${stockPercentage.toFixed(0)}%)`;
      }
    }

    // Critical low (25%) override
    if (stockPercentage > 0 && stockPercentage <= 25) {
      if (item.not_made_daily) {
        reason = `Critical low (${stockPercentage.toFixed(0)}%) - Not made daily, check with manager`;
      } else {
        reason = `Stock below 50% (${stockPercentage.toFixed(0)}%)`;
      }
    }

    return {
      ...item,
      currentStock,
      parLevel,
      makeAmount,
      stockPercentage,
      priority,
      reason,
      urgent: item.urgent || false,
      lineCooksPrep: item.line_cooks_prep || false,
      notMadeDaily: item.not_made_daily || false,
      showInBottleCount: item.show_in_bottle_count || false
    };
  });

  // Filter bottled items
  const bottledItems = recommendations.filter(r => r.showInBottleCount === true);
  const prepItemsOnly = recommendations.filter(r => !r.showInBottleCount);

  // Group by priority
  const makeFirst = prepItemsOnly.filter(r => r.urgent === true)
    .sort((a, b) => a.stockPercentage - b.stockPercentage);

  const urgent = prepItemsOnly.filter(r => r.priority === 'urgent' && !r.urgent && !r.lineCooksPrep);
  const high = prepItemsOnly.filter(r => r.priority === 'high' && !r.urgent && !r.lineCooksPrep);
  const medium = prepItemsOnly.filter(r => r.priority === 'medium' && !r.urgent && !r.lineCooksPrep);
  const low = prepItemsOnly.filter(r => r.priority === 'low' && !r.urgent && !r.lineCooksPrep);

  const lineCooksPrep = prepItemsOnly.filter(r => r.lineCooksPrep === true && !r.urgent)
    .sort((a, b) => a.stockPercentage - b.stockPercentage);

  // ===== BOTTLED & TO-GO PREP CHECK =====
  if (bottledItems.length > 0) {
    yPos = renderCompactList(doc, 'BOTTLED & TO-GO PREP CHECK', bottledItems, yPos, jaynaBlue, 3);
  }

  // ===== MAKE FIRST =====
  if (makeFirst.length > 0) {
    yPos = renderPrioritySection(doc, 'MAKE FIRST', makeFirst, yPos, [220, 0, 0]);
  }

  // ===== URGENT =====
  if (urgent.length > 0) {
    yPos = renderPrioritySection(doc, 'URGENT - Out of Stock', urgent, yPos, black);
  }

  // ===== HIGH PRIORITY =====
  if (high.length > 0) {
    yPos = renderPrioritySection(doc, 'HIGH PRIORITY - Low Stock', high, yPos, darkGray);
  }

  // ===== MEDIUM PRIORITY =====
  if (medium.length > 0) {
    yPos = renderPrioritySection(doc, 'MEDIUM PRIORITY', medium, yPos, darkGray);
  }

  // ===== LOW PRIORITY =====
  if (low.length > 0) {
    yPos = renderCompactList(doc, 'LOW PRIORITY - Stock Good', low, yPos, darkGray, 2);
  }

  // ===== LINE COOKS PREP =====
  if (lineCooksPrep.length > 0) {
    yPos = renderPrioritySection(doc, 'LINE COOKS PREP', lineCooksPrep, yPos, [75, 0, 130]);
  }

  // ===== FOOTER =====
  if (yPos < 10) {
    doc.setDrawColor(224, 224, 224);
    doc.line(0.5, 10.2, 8, 10.2);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(153, 153, 153);
    doc.text('MISTAKES HAPPEN, PLEASE USE YOUR BRAIN WHEN READING THIS LIST AND', 4.25, 10.32, { align: 'center' });
    doc.text('DOUBLE CHECK BY CLARIFYING WITH YOUR MANAGER IF YOU DOUBT ANYTHING.', 4.25, 10.40, { align: 'center' });

    doc.setFontSize(5.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(170, 170, 170);
    doc.text('PREP GENERATION FLOW CREATED AND DESIGNED BY DEMETRI GREGORAKIS', 4.25, 10.52, { align: 'center' });
  }

  // Convert to base64
  return doc.output('datauristring').split(',')[1];
}

/**
 * Render priority section (table format)
 */
function renderPrioritySection(doc, title, items, startY, headerColor) {
  let yPos = startY;

  // Section header
  doc.setFillColor(...headerColor);
  doc.rect(0.5, yPos, 7.5, 0.25, 'F');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(`${title} (${items.length})`, 0.55, yPos + 0.17);

  yPos += 0.3;

  // Table header
  doc.setFillColor(245, 245, 245);
  doc.rect(0.5, yPos, 7.5, 0.25, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('ITEM', 0.6, yPos + 0.17);
  doc.text('CURRENT', 2.5, yPos + 0.17);
  doc.text('MAKE', 3.5, yPos + 0.17);
  doc.text('PAR', 4.3, yPos + 0.17);
  doc.text('REASON', 5.0, yPos + 0.17);
  doc.text('LAST COUNTED', 7.0, yPos + 0.17);

  yPos += 0.3;

  // Table rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  items.forEach(item => {
    if (yPos > 10) {
      doc.addPage();
      yPos = 0.5;
    }

    const lastCounted = item.last_counted_date
      ? formatPacificDateTime(new Date(item.last_counted_date))
      : 'Never';

    doc.text(item.item_name || 'N/A', 0.6, yPos);
    doc.text(`${item.currentStock} ${item.unit || ''}`.substring(0, 20), 2.5, yPos);
    doc.text(`${item.makeAmount || '-'} ${item.unit || ''}`.substring(0, 15), 3.5, yPos);
    doc.text(`${item.parLevel} ${item.unit || ''}`.substring(0, 15), 4.3, yPos);
    doc.text(item.reason.substring(0, 35), 5.0, yPos);
    doc.setFontSize(7);
    doc.text(lastCounted.substring(0, 25), 7.0, yPos);
    doc.setFontSize(9);

    yPos += 0.2;
  });

  return yPos + 0.1;
}

/**
 * Render compact list (multi-column format for low priority items)
 */
function renderCompactList(doc, title, items, startY, headerColor, columns) {
  let yPos = startY;

  // Section header
  doc.setFillColor(...headerColor);
  doc.rect(0.5, yPos, 7.5, 0.25, 'F');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(`${title} (${items.length})`, 0.55, yPos + 0.17);

  yPos += 0.35;

  // Render items in columns
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);

  const colWidth = 7.5 / columns;
  let col = 0;

  items.forEach((item, idx) => {
    const xPos = 0.5 + (col * colWidth);

    const lastCounted = item.last_counted_date
      ? formatPacificDateTime(new Date(item.last_counted_date))
      : 'Never';

    const displayText = `${item.item_name}: ${item.currentStock} ${item.unit || ''}`.substring(0, 40);

    doc.text(displayText, xPos, yPos);
    doc.setFontSize(7);
    doc.setTextColor(102, 102, 102);
    doc.text(` Last: ${lastCounted}`, xPos, yPos + 0.12);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);

    col++;
    if (col >= columns) {
      col = 0;
      yPos += 0.3;
    }
  });

  if (col > 0) {
    yPos += 0.3;
  }

  return yPos + 0.1;
}
