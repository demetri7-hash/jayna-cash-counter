/**
 * Auto-Print Prep List at 4am
 *
 * Runs at 4:00 AM PST (11:00 AM UTC) daily
 *
 * Logic:
 * - Check if any prep items were counted between 9pm and 4am (8 hour window)
 * - If yes, generate prep list PDF and send to Epson printer
 * - Uses same printer email method as ordering guide
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
    month: 'short',
    day: 'numeric',
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

    // Generate PDF
    const pdfBase64 = await generatePrepListPDF(allPrepItems);
    const filename = `Prep_List_${new Date().toISOString().split('T')[0]}.pdf`;

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
      subject: `Print: Prep List - ${formatPacificDateShort()}`,
      text: 'Daily prep list for morning crew.',
      html: `<p><strong>Daily Prep List</strong></p><p>Auto-generated at 4:00 AM for morning prep cook.</p>`,
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
 * Generate prep list PDF
 */
async function generatePrepListPDF(prepItems) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });

  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('PREP LIST', 40, 40);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Date: ${formatPacificDate()}`, 40, 60);
  doc.text('Auto-generated at 4:00 AM', 40, 75);

  // Prep table data
  const tableData = prepItems.map(item => {
    const lastCounted = item.last_counted_date
      ? formatPacificDateTime(new Date(item.last_counted_date))
      : 'Never';

    return [
      item.item_name || 'N/A',
      `${item.current_stock || 0} ${item.unit || ''}`,
      item.par_level || 0,
      lastCounted
    ];
  });

  doc.autoTable({
    head: [['ITEM NAME', 'CURRENT STOCK', 'PAR LEVEL', 'LAST COUNTED']],
    body: tableData,
    startY: 95,
    theme: 'grid',
    styles: {
      fontSize: 9,
      cellPadding: 6,
      lineColor: [200, 200, 200],
      lineWidth: 0.5
    },
    headStyles: {
      fillColor: [74, 74, 74],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'center'
    },
    columnStyles: {
      0: { cellWidth: 220 },                  // ITEM NAME
      1: { cellWidth: 110, halign: 'center' }, // CURRENT STOCK
      2: { cellWidth: 80, halign: 'center' },  // PAR LEVEL
      3: { cellWidth: 110, halign: 'center' }  // LAST COUNTED
    },
    margin: { left: 40, right: 40 }
  });

  // Footer
  const finalY = doc.lastAutoTable.finalY || 500;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text(`Total: ${prepItems.length} prep items`, 40, finalY + 15);

  // Convert to base64
  return doc.output('datauristring').split(',')[1];
}
