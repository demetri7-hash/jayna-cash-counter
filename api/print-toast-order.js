/**
 * Vercel Serverless Function: Print Toast Order to Epson Printer
 * Generates formatted order receipt and sends via Gmail to Epson printer
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

// Gmail configuration (same as auto-print-prep.js)
const GMAIL_USER = 'jaynascans@gmail.com';
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;
const PRINTER_EMAIL = 'GSS4168CTJJA73@print.epsonconnect.com';

/**
 * PACIFIC TIMEZONE UTILITIES
 * Server-side date/time formatting (Vercel runs in UTC, can't rely on local timezone)
 */
function formatPacificDate(dateStr) {
  if (!dateStr) return 'N/A';

  // Parse YYYY-MM-DD manually
  const [year, month, day] = dateStr.split('-').map(Number);

  // Create UTC date at noon (avoids DST edge cases)
  const utcDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

  // Format in Pacific timezone
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'America/Los_Angeles'
  }).format(utcDate);
}

function formatPacificTime(isoTimeStr) {
  if (!isoTimeStr) return 'N/A';

  const date = new Date(isoTimeStr);
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/Los_Angeles'
  }).format(date);
}

function formatPacificDateTime(dateObj) {
  if (!dateObj) return 'N/A';

  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'America/Los_Angeles'
  }).format(dateObj);
}

function formatPhoneNumber(phone) {
  if (!phone) return 'N/A';

  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');

  // Handle 10-digit US phone numbers
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }

  // Handle 11-digit numbers (with country code 1)
  if (cleaned.length === 11 && cleaned[0] === '1') {
    return `(${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }

  // Return original if format doesn't match
  return phone;
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { order_id } = req.body;
    const downloadMode = req.query.download === 'true';

    if (!order_id) {
      return res.status(400).json({
        success: false,
        error: 'order_id is required'
      });
    }

    console.log(`${downloadMode ? '📥' : '🖨️'} Generating Toast order ${order_id}...`);

    // Fetch order details
    const { data: order, error: orderError } = await supabase
      .from('catering_orders')
      .select('*')
      .eq('id', order_id)
      .single();

    if (orderError || !order) {
      throw new Error('Order not found');
    }

    // Fetch line items
    const { data: lineItems, error: itemsError } = await supabase
      .from('catering_order_items')
      .select('*')
      .eq('order_id', order_id)
      .order('id', { ascending: true });

    if (itemsError) {
      throw new Error('Failed to fetch order line items');
    }

    // Generate PDF receipt
    const pdfBase64 = await generateOrderReceiptPDF(order, lineItems || []);

    // Use REAL order number from ezCater or Toast (NO sequential numbers)
    let orderNum;
    if (order.source_system === 'EZCATER') {
      // For ezCater: Use the actual ezCater order number
      orderNum = order.order_number || order_id;
    } else {
      // For Toast: Use the check number or order number
      orderNum = order.check_number || order.order_number || order_id;
    }

    const filename = `${order.source_system}_Order_${orderNum}_${new Date().toISOString().split('T')[0]}.pdf`;

    // DOWNLOAD MODE: Return PDF as blob for download
    if (downloadMode) {
      console.log(`✅ Order PDF generated for download`);

      const pdfBuffer = Buffer.from(pdfBase64, 'base64');

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);

      return res.status(200).send(pdfBuffer);
    }

    // PRINT MODE: Send to printer via Gmail
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: GMAIL_USER,
        pass: GMAIL_APP_PASSWORD
      }
    });

    const mailOptions = {
      from: `Jayna Catering <${GMAIL_USER}>`,
      to: PRINTER_EMAIL,
      subject: `Print: Order #${orderNum} - ${order.customer_name || 'Customer'}`,
      text: '',  // Empty text body - only print PDF attachment
      html: '',  // Empty HTML body - only print PDF attachment
      attachments: [{
        filename: filename,
        content: Buffer.from(pdfBase64, 'base64'),
        contentType: 'application/pdf'
      }]
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Order sent to printer:`, info.messageId);

    return res.status(200).json({
      success: true,
      message: 'Order sent to printer successfully',
      messageId: info.messageId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Print order error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to print order',
      details: error.message
    });
  }
}

/**
 * Generate formatted order receipt PDF
 */
async function generateOrderReceiptPDF(order, lineItems) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });

  // Set normal character spacing (fixes spacing issues)
  doc.setCharSpace(0);

  let yPos = 40;

  // Header - JAYNA GYRO
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('JAYNA GYRO', 40, yPos);
  yPos += 25;

  // Order title with REAL order number (ezCater or Toast)
  doc.setFontSize(16);
  let orderNum;
  let orderLabel;

  if (order.source_system === 'EZCATER') {
    // For ezCater: Show ezCater order number
    orderNum = order.order_number || 'N/A';
    orderLabel = 'EZCATER ORDER';
  } else {
    // For Toast: Show check number
    orderNum = order.check_number || order.order_number || 'N/A';
    orderLabel = 'TOAST ORDER';
  }

  doc.text(`${orderLabel} #${orderNum}`, 40, yPos);
  yPos += 20;

  // BEO Fields row (Check #, Payment Status, Utensils)
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  let beoInfoLine = `Source: ${order.source_type || 'Toast POS'}`;
  if (order.check_number) {
    beoInfoLine += ` • Check #${order.check_number}`;
  }
  if (order.payment_status) {
    beoInfoLine += ` • ${order.payment_status.toUpperCase()}`;
  }
  if (order.utensils_required !== null && order.utensils_required !== undefined) {
    beoInfoLine += ` • Utensils: ${order.utensils_required ? 'Yes' : 'No'}`;
  }
  doc.text(beoInfoLine, 40, yPos);
  yPos += 15;

  doc.text(`Status: ${(order.status || 'CONFIRMED').toUpperCase()}`, 40, yPos);
  yPos += 15;

  // Created timestamp if available
  if (order.created_in_toast_at) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.text(`Created in Toast: ${formatPacificDateTime(new Date(order.created_in_toast_at))}`, 40, yPos);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    yPos += 15;
  }

  yPos += 10;

  // Delivery/Pickup Information Box
  const isPickup = !order.delivery_address; // No delivery address = pickup

  doc.setFillColor(240, 240, 240);
  doc.rect(40, yPos, 515, 110, 'F');
  doc.setDrawColor(100, 100, 100);
  doc.rect(40, yPos, 515, 110, 'S');

  yPos += 20;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(isPickup ? 'PICKUP INFORMATION' : 'DELIVERY INFORMATION', 50, yPos);
  yPos += 20;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  // Delivery Date
  if (order.delivery_date) {
    doc.text(`Date: ${formatPacificDate(order.delivery_date)}`, 50, yPos);
    yPos += 15;
  }

  // Delivery Time (Due Time)
  if (order.delivery_time) {
    const dueTimeStr = formatPacificTime(order.delivery_time);
    doc.setFont('helvetica', 'bold');

    // For pickup orders, say "PICKUP TIME" instead of "DUE TIME"
    doc.text(`${isPickup ? 'PICKUP TIME' : 'DUE TIME'}: ${dueTimeStr}`, 50, yPos);
    doc.setFont('helvetica', 'normal');
    yPos += 20;

    // SUGGESTED LEAVE JAYNA AT TIME (ONLY for deliveries, NOT pickups)
    if (!isPickup) {
      const dueTime = new Date(order.delivery_time);
      const leaveTime = new Date(dueTime.getTime() - 25 * 60000); // 25 minutes before
      const leaveTimeStr = new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'America/Los_Angeles'
      }).format(leaveTime);
      doc.setFillColor(255, 255, 200); // Light yellow highlight
      doc.rect(50, yPos - 12, 250, 16, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(`LEAVE JAYNA AT: ${leaveTimeStr}`, 55, yPos);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      yPos += 20;
    }
  }

  // Customer Name - LARGE AND BOLD
  if (order.customer_name) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(`Customer: ${order.customer_name}`, 50, yPos);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    yPos += 18;
  }

  yPos += 10; // Bottom padding of box

  // Customer Contact Box
  yPos += 20;
  doc.setFillColor(245, 245, 250);
  const contactBoxHeight = (order.customer_phone ? 15 : 0) + (order.customer_email ? 15 : 0) + (order.delivery_address ? 30 : 0) + (order.headcount ? 15 : 0) + 30;
  doc.rect(40, yPos, 515, contactBoxHeight, 'F');
  doc.setDrawColor(100, 100, 100);
  doc.rect(40, yPos, 515, contactBoxHeight, 'S');

  yPos += 20;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('CUSTOMER DETAILS', 50, yPos);
  yPos += 20;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  if (order.customer_phone) {
    doc.text(`Phone: ${formatPhoneNumber(order.customer_phone)}`, 50, yPos);
    yPos += 15;
  }

  if (order.customer_email) {
    doc.text(`Email: ${order.customer_email}`, 50, yPos);
    yPos += 15;
  }

  if (order.delivery_address) {
    doc.text(`Address: ${order.delivery_address}`, 50, yPos);
    yPos += 30;
  }

  if (order.headcount) {
    doc.setFont('helvetica', 'bold');
    doc.text(`Headcount: ${order.headcount} guests`, 50, yPos);
    doc.setFont('helvetica', 'normal');
    yPos += 15;
  }

  yPos += 15;

  // ORDER ITEMS TABLE
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('ORDER ITEMS', 40, yPos);
  yPos += 10;

  if (lineItems.length === 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.text('No line items available', 40, yPos + 15);
    yPos += 30;
  } else {
    // Build table data
    const tableData = [];

    lineItems.forEach(item => {
      // Main item row
      const itemName = item.item_name || 'Unknown Item';
      const quantity = parseFloat(item.quantity || 1);
      const unitPrice = parseFloat(item.unit_price || 0).toFixed(2);
      const totalPrice = parseFloat(item.total_price || 0).toFixed(2);

      tableData.push([
        `${quantity}x ${itemName}`,
        `$${unitPrice}`,
        `$${totalPrice}`
      ]);

      // Add modifiers as sub-rows
      if (item.modifiers && Array.isArray(item.modifiers) && item.modifiers.length > 0) {
        item.modifiers.forEach(mod => {
          const modPrice = mod.price ? ` (+$${parseFloat(mod.price).toFixed(2)})` : '';
          tableData.push([
            `   + ${mod.name}${modPrice}`,
            '',
            ''
          ]);
        });
      }

      // Add special requests
      if (item.special_requests) {
        tableData.push([
          `   ⚠️ ${item.special_requests}`,
          '',
          ''
        ]);
      }
    });

    doc.autoTable({
      head: [['ITEM', 'UNIT PRICE', 'TOTAL']],
      body: tableData,
      startY: yPos + 5,
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
        fontSize: 10,
        halign: 'left'
      },
      columnStyles: {
        0: { cellWidth: 340 },  // ITEM
        1: { cellWidth: 85, halign: 'right' },  // UNIT PRICE
        2: { cellWidth: 85, halign: 'right' }   // TOTAL
      },
      margin: { left: 40, right: 40 }
    });

    yPos = doc.lastAutoTable.finalY + 10;
  }

  // FINANCIAL BREAKDOWN (if BEO fields available)
  if (order.subtotal !== null && order.subtotal !== undefined) {
    yPos += 15;
    doc.setFillColor(250, 250, 250);
    doc.rect(40, yPos, 515, 90, 'F');
    doc.setDrawColor(150, 150, 150);
    doc.rect(40, yPos, 515, 90, 'S');

    yPos += 18;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('FINANCIAL BREAKDOWN', 50, yPos);
    yPos += 15;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    // Subtotal
    doc.text('Subtotal:', 50, yPos);
    doc.text(`$${parseFloat(order.subtotal || 0).toFixed(2)}`, 520, yPos, { align: 'right' });
    yPos += 14;

    // Delivery Fee
    if (order.delivery_fee && parseFloat(order.delivery_fee) > 0) {
      doc.text('Delivery Fee:', 50, yPos);
      doc.text(`$${parseFloat(order.delivery_fee).toFixed(2)}`, 520, yPos, { align: 'right' });
      yPos += 14;
    }

    // Tax
    if (order.tax !== null && order.tax !== undefined) {
      doc.text('Tax:', 50, yPos);
      doc.text(`$${parseFloat(order.tax || 0).toFixed(2)}`, 520, yPos, { align: 'right' });
      yPos += 14;
    }

    // Tip
    if (order.tip && parseFloat(order.tip) > 0) {
      doc.text('Tip:', 50, yPos);
      doc.text(`$${parseFloat(order.tip).toFixed(2)}`, 520, yPos, { align: 'right' });
      yPos += 14;
    }

    yPos += 10;
  }

  // ORDER TOTAL
  yPos += 10;
  doc.setFillColor(0, 150, 0);
  doc.rect(40, yPos, 515, 35, 'F');
  yPos += 23;
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('ORDER TOTAL:', 50, yPos);
  doc.text(`$${parseFloat(order.total_amount || 0).toFixed(2)}`, 520, yPos, { align: 'right' });
  doc.setTextColor(0, 0, 0);

  yPos += 30;

  // Special Notes - Improved formatting
  if (order.delivery_notes) {
    yPos += 10;

    // Calculate dynamic box height based on text content
    const notesLines = doc.splitTextToSize(order.delivery_notes, 495);
    const boxHeight = Math.max(60, 40 + (notesLines.length * 14));

    doc.setFillColor(255, 240, 200);
    doc.rect(40, yPos, 515, boxHeight, 'F');
    doc.setDrawColor(200, 150, 0);
    doc.setLineWidth(1.5);
    doc.rect(40, yPos, 515, boxHeight, 'S');

    yPos += 22;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('SPECIAL NOTES:', 50, yPos);
    yPos += 18;

    // Render notes with better spacing and readability
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setCharSpace(0); // Explicitly ensure no extra character spacing

    notesLines.forEach((line, index) => {
      if (index < 5) { // Limit to 5 lines max
        doc.text(line, 50, yPos);
        yPos += 14;
      }
    });

    yPos += 10; // Bottom padding
  }

  // Footer
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text(`Printed: ${formatPacificDateTime(new Date())}`, 40, 770);
  doc.text('Generated by Jayna Catering Management System', 40, 780);

  // Convert to base64
  return doc.output('datauristring').split(',')[1];
}
