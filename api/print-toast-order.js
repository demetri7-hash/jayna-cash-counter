/**
 * Vercel Serverless Function: Print Toast Order to Epson Printer
 * Generates formatted order receipt and sends via Gmail to Epson printer
 * REDESIGNED: Clean, modern, tight, APTOS-style (Helvetica), grayscale + Jayna blue
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
 */
function formatPacificDate(dateStr) {
  if (!dateStr) return 'N/A';
  const [year, month, day] = dateStr.split('-').map(Number);
  const utcDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
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
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Los_Angeles'
  }).format(dateObj);
}

function formatPhoneNumber(phone) {
  if (!phone) return 'N/A';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  if (cleaned.length === 11 && cleaned[0] === '1') {
    return `(${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  return phone;
}

function decodeHTMLEntities(text) {
  if (!text) return text;
  const entities = {
    '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'",
    '&nbsp;': ' ', '&ndash;': '–', '&mdash;': '—', '&hellip;': '...',
    '&trade;': '™', '&copy;': '©', '&reg;': '®', '&thorn;': '', '&THORN;': ''
  };
  let decoded = text;
  for (const [entity, char] of Object.entries(entities)) {
    decoded = decoded.replace(new RegExp(entity, 'gi'), char);
  }
  decoded = decoded.replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec));
  decoded = decoded.replace(/&#x([0-9A-Fa-f]+);/g, (match, hex) => String.fromCharCode(parseInt(hex, 16)));
  decoded = decoded.replace(/&\s*þ/g, '');
  decoded = decoded.replace(/&\s*[\u0080-\uFFFF]/g, '');
  return decoded.replace(/\s+/g, ' ').trim();
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { order_id } = req.body;
    const downloadMode = req.query.download === 'true';

    if (!order_id) {
      return res.status(400).json({ success: false, error: 'order_id is required' });
    }

    console.log(`${downloadMode ? '📥' : '🖨️'} Generating Toast order ${order_id}...`);

    const { data: order, error: orderError } = await supabase
      .from('catering_orders').select('*').eq('id', order_id).single();

    if (orderError || !order) throw new Error('Order not found');

    const { data: lineItems, error: itemsError } = await supabase
      .from('catering_order_items').select('*').eq('order_id', order_id).order('id', { ascending: true });

    if (itemsError) throw new Error('Failed to fetch order line items');

    const pdfBase64 = await generateOrderReceiptPDF(order, lineItems || []);

    let orderNum;
    if (order.source_system === 'EZCATER') {
      orderNum = order.order_number || order_id;
    } else {
      orderNum = order.check_number || order.order_number || order_id;
    }

    const filename = `${order.source_system}_Order_${orderNum}_${new Date().toISOString().split('T')[0]}.pdf`;

    if (downloadMode) {
      console.log(`✅ Order PDF generated for download`);
      const pdfBuffer = Buffer.from(pdfBase64, 'base64');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      return res.status(200).send(pdfBuffer);
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD }
    });

    const mailOptions = {
      from: `Jayna Catering <${GMAIL_USER}>`,
      to: PRINTER_EMAIL,
      subject: `Print: Order #${orderNum} - ${order.customer_name || 'Customer'}`,
      text: '', html: '',
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
 * Generate formatted order receipt PDF - REDESIGNED
 * Clean, modern, tight, APTOS-style design with grayscale + Jayna blue
 */
async function generateOrderReceiptPDF(order, lineItems) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });
  doc.setCharSpace(0);

  // DESIGN SYSTEM: Color palette (grayscale only, no color blocks)
  const black = [0, 0, 0];
  const darkGray = [60, 60, 60];
  const gray = [127, 127, 127]; // 50% gray for borders/lines
  const lightGray = [200, 200, 200];

  // NARROW MARGINS: 30pt left/right, 25pt top
  const margin = { left: 30, right: 30, top: 25 };
  const pageWidth = 612; // Letter width
  const contentWidth = pageWidth - margin.left - margin.right;

  let y = margin.top;

  // ===== HEADER: JAYNA GYRO (simple black text, no color bar) =====
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...black);
  doc.text('JAYNA GYRO CATERING', margin.left, y);
  y += 16;

  // ===== ORDER NUMBER & STATUS (tight, black text) =====
  y += 8;
  let orderNum, orderLabel;
  if (order.source_system === 'EZCATER') {
    orderNum = order.order_number || 'N/A';
    orderLabel = 'EZCATER ORDER';
  } else {
    orderNum = order.check_number || order.order_number || 'N/A';
    orderLabel = 'TOAST ORDER';
  }

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`${orderLabel} #${orderNum}`, margin.left, y);
  y += 12;

  // Status line (compact)
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...darkGray);
  let statusLine = `STATUS: ${(order.status || 'CONFIRMED').toUpperCase()}`;
  if (order.payment_status) statusLine += ` | PAYMENT: ${order.payment_status.toUpperCase()}`;
  if (order.check_number) statusLine += ` | CHECK #${order.check_number}`;
  doc.text(statusLine, margin.left, y);
  doc.setTextColor(...black);
  y += 9;

  // Gray separator line (2pt, 50% gray)
  doc.setDrawColor(...gray);
  doc.setLineWidth(2);
  doc.line(margin.left, y, pageWidth - margin.right, y);
  y += 12;

  // ===== DELIVERY/PICKUP INFO (no box, just clean text) =====
  const isPickup = !order.delivery_address;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...black);
  doc.text(isPickup ? 'PICKUP INFORMATION' : 'DELIVERY INFORMATION', margin.left, y);
  y += 14;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...darkGray);

  if (order.delivery_date && order.delivery_time) {
    const dateStr = formatPacificDate(order.delivery_date);
    const timeStr = formatPacificTime(order.delivery_time);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...black);
    doc.text(`${isPickup ? 'PICKUP' : 'DUE'}:`, margin.left, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`${dateStr} at ${timeStr}`, margin.left + 55, y);
    y += 12;

    // LEAVE JAYNA AT (delivery only, MUCH BIGGER AND BOLDER!)
    if (!isPickup) {
      const dueTime = new Date(order.delivery_time);
      const leaveTime = new Date(dueTime.getTime() - 25 * 60000);
      const leaveTimeStr = new Intl.DateTimeFormat('en-US', {
        hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'America/Los_Angeles'
      }).format(leaveTime);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...black);
      doc.text(`LEAVE JAYNA AT: ${leaveTimeStr}`, margin.left, y);
      y += 16;
    }
  }

  if (order.customer_name) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...black);
    doc.text('CUSTOMER:', margin.left, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...darkGray);
    doc.text(order.customer_name, margin.left + 55, y);
    y += 12;
  }

  if (order.customer_phone) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...black);
    doc.text('PHONE:', margin.left, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...darkGray);
    doc.text(formatPhoneNumber(order.customer_phone), margin.left + 55, y);
    y += 12;
  }

  if (order.customer_email) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...black);
    doc.text('EMAIL:', margin.left, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...darkGray);
    doc.text(order.customer_email, margin.left + 55, y);
    y += 12;
  }

  if (order.delivery_address) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...black);
    doc.text('ADDRESS:', margin.left, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...darkGray);
    const addressLines = doc.splitTextToSize(order.delivery_address, contentWidth - 55);
    addressLines.forEach((line, idx) => {
      doc.text(line, margin.left + (idx === 0 ? 55 : 0), y);
      if (idx < addressLines.length - 1) y += 10;
    });
    y += 12;
  }

  if (order.headcount) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...black);
    doc.text('HEADCOUNT:', margin.left, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...darkGray);
    doc.text(`${order.headcount} guests`, margin.left + 55, y);
    y += 12;
  }

  if (order.utensils_required !== null && order.utensils_required !== undefined) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...black);
    doc.text('UTENSILS:', margin.left, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...darkGray);
    const utensilText = order.utensils_required
      ? (order.utensils_quantity || order.headcount ? `${order.utensils_quantity || order.headcount} sets` : 'Yes')
      : 'No';
    doc.text(utensilText, margin.left + 55, y);
    y += 12;
  }

  // Gray separator line (2pt, 50% gray)
  y += 4;
  doc.setDrawColor(...gray);
  doc.setLineWidth(2);
  doc.line(margin.left, y, pageWidth - margin.right, y);
  y += 12;

  // ===== ORDER ITEMS TABLE (compact, grayscale, no thick borders) =====
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...black);
  doc.text('ORDER ITEMS', margin.left, y);
  y += 7;

  if (lineItems.length === 0) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...gray);
    doc.text('No line items available', margin.left, y);
    y += 15;
  } else {
    const tableData = [];
    lineItems.forEach(item => {
      const itemName = item.item_name || 'Unknown Item';
      const quantity = parseFloat(item.quantity || 1);
      const unitPrice = parseFloat(item.unit_price || 0).toFixed(2);
      const totalPrice = parseFloat(item.total_price || 0).toFixed(2);

      tableData.push([`${quantity}x ${itemName}`, `$${unitPrice}`, `$${totalPrice}`]);

      if (item.modifiers && Array.isArray(item.modifiers) && item.modifiers.length > 0) {
        item.modifiers.forEach(mod => {
          const modPrice = mod.price ? ` (+$${parseFloat(mod.price).toFixed(2)})` : '';
          const modName = decodeHTMLEntities(mod.name || '');
          tableData.push([`  + ${modName}${modPrice}`, '', '']);
        });
      }

      if (item.special_requests) {
        const cleanedRequest = decodeHTMLEntities(item.special_requests);
        tableData.push([
          { content: `  NOTE: ${cleanedRequest}`, styles: { fontStyle: 'italic', textColor: [100, 100, 100] } },
          '', ''
        ]);
      }
    });

    doc.autoTable({
      head: [['ITEM', 'UNIT', 'TOTAL']],
      body: tableData,
      startY: y,
      theme: 'plain',
      styles: {
        fontSize: 8,
        cellPadding: { top: 3, right: 4, bottom: 3, left: 0 },
        lineColor: [127, 127, 127], // 50% gray
        lineWidth: 1,
        textColor: [0, 0, 0]
      },
      headStyles: {
        fillColor: [245, 245, 245],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        fontSize: 8,
        halign: 'left',
        cellPadding: { top: 5, right: 4, bottom: 5, left: 0 }
      },
      columnStyles: {
        0: { cellWidth: contentWidth - 100 },
        1: { cellWidth: 50, halign: 'right' },
        2: { cellWidth: 50, halign: 'right' }
      },
      margin: { left: margin.left, right: margin.right },
      didDrawPage: (data) => {
        // Add gray border around table (2pt)
        const tableHeight = data.cursor.y - data.settings.startY;
        doc.setDrawColor(127, 127, 127); // 50% gray
        doc.setLineWidth(2);
        doc.rect(margin.left, data.settings.startY, contentWidth, tableHeight);
      }
    });

    y = doc.lastAutoTable.finalY + 10;
  }

  // ===== FINANCIAL BREAKDOWN (better spacing, right-aligned) =====
  if (order.subtotal !== null && order.subtotal !== undefined) {
    y += 6;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...darkGray);

    const rightX = pageWidth - margin.right;

    if (order.subtotal) {
      doc.text('Subtotal:', rightX - 70, y, { align: 'left' });
      doc.text(`$${parseFloat(order.subtotal || 0).toFixed(2)}`, rightX, y, { align: 'right' });
      y += 10;
    }

    if (order.delivery_fee && parseFloat(order.delivery_fee) > 0) {
      doc.text('Delivery Fee:', rightX - 70, y, { align: 'left' });
      doc.text(`$${parseFloat(order.delivery_fee).toFixed(2)}`, rightX, y, { align: 'right' });
      y += 10;
    }

    if (order.tax !== null && order.tax !== undefined) {
      doc.text('Tax:', rightX - 70, y, { align: 'left' });
      doc.text(`$${parseFloat(order.tax || 0).toFixed(2)}`, rightX, y, { align: 'right' });
      y += 10;
    }

    if (order.tip && parseFloat(order.tip) > 0) {
      doc.text('Tip:', rightX - 70, y, { align: 'left' });
      doc.text(`$${parseFloat(order.tip).toFixed(2)}`, rightX, y, { align: 'right' });
      y += 10;
    }

    y += 6;
  }

  // ===== ORDER TOTAL (gray border box, black text) =====
  doc.setDrawColor(...gray);
  doc.setLineWidth(2);
  doc.rect(margin.left, y, contentWidth, 20);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...black);
  doc.text('ORDER TOTAL:', margin.left + 4, y + 14);
  doc.text(`$${parseFloat(order.total_amount || 0).toFixed(2)}`, pageWidth - margin.right - 4, y + 14, { align: 'right' });
  y += 24;

  // ===== SPECIAL NOTES (compact, minimal styling) =====
  if (order.delivery_notes && y < 730) {
    y += 6;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('SPECIAL NOTES:', margin.left, y);
    y += 9;

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...darkGray);
    const notesLines = doc.splitTextToSize(order.delivery_notes, contentWidth);
    notesLines.forEach((line, idx) => {
      if (idx < 5 && y < 755) {
        doc.text(line, margin.left, y);
        y += 8;
      }
    });
    doc.setTextColor(...black);
  }

  // ===== FOOTER (minimal, gray) - ensure no overlap =====
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...gray);
  doc.text(`Generated: ${formatPacificDateTime(new Date())} PST`, margin.left, 774);

  return doc.output('datauristring').split(',')[1];
}
