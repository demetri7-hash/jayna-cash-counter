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

    if (!order_id) {
      return res.status(400).json({
        success: false,
        error: 'order_id is required'
      });
    }

    console.log(`🖨️ Printing Toast order ${order_id}...`);

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
    const filename = `Toast_Order_${order.order_number || order_id}_${new Date().toISOString().split('T')[0]}.pdf`;

    // Send to printer via Gmail
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
      subject: `Print: Order ${order.order_number || order_id} - ${order.customer_name || 'Customer'}`,
      text: `Catering order for ${order.delivery_date}`,
      html: `<p><strong>Catering Order Receipt</strong></p><p>Order #${order.order_number || order_id}</p>`,
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

  let yPos = 40;

  // Header - JAYNA GYRO
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('JAYNA GYRO', 40, yPos);
  yPos += 25;

  // Order title
  doc.setFontSize(16);
  doc.text(`CATERING ORDER #${order.order_number || 'N/A'}`, 40, yPos);
  yPos += 20;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Source: ${order.source_type || 'Toast POS'}`, 40, yPos);
  yPos += 15;
  doc.text(`Status: ${(order.status || 'CONFIRMED').toUpperCase()}`, 40, yPos);
  yPos += 25;

  // Delivery/Pickup Information Box
  const isPickup = order.source_type === 'In Store';

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
    const deliveryDate = new Date(order.delivery_date);
    doc.text(`Date: ${deliveryDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/Los_Angeles' })}`, 50, yPos);
    yPos += 15;
  }

  // Delivery Time (Due Time)
  if (order.delivery_time) {
    const dueTime = new Date(order.delivery_time);
    const dueTimeStr = dueTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'America/Los_Angeles' });
    doc.setFont('helvetica', 'bold');

    // For pickup orders, say "PICKUP TIME" instead of "DUE TIME"
    doc.text(`${isPickup ? 'PICKUP TIME' : 'DUE TIME'}: ${dueTimeStr}`, 50, yPos);
    doc.setFont('helvetica', 'normal');
    yPos += 20;

    // SUGGESTED LEAVE JAYNA AT TIME (ONLY for deliveries, NOT pickups)
    if (!isPickup) {
      const leaveTime = new Date(dueTime.getTime() - 25 * 60000); // 25 minutes before
      const leaveTimeStr = leaveTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'America/Los_Angeles' });
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

  // Customer Name
  if (order.customer_name) {
    doc.text(`Customer: ${order.customer_name}`, 50, yPos);
    yPos += 15;
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
    doc.text(`Phone: ${order.customer_phone}`, 50, yPos);
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

  // Special Notes
  if (order.delivery_notes) {
    yPos += 10;
    doc.setFillColor(255, 240, 200);
    doc.rect(40, yPos, 515, 50, 'F');
    doc.setDrawColor(200, 150, 0);
    doc.rect(40, yPos, 515, 50, 'S');

    yPos += 20;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('SPECIAL NOTES:', 50, yPos);
    yPos += 15;
    doc.setFont('helvetica', 'normal');
    const notesLines = doc.splitTextToSize(order.delivery_notes, 495);
    doc.text(notesLines, 50, yPos);
  }

  // Footer
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text(`Printed: ${new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })}`, 40, 770);
  doc.text('Generated by Jayna Catering Management System', 40, 780);

  // Convert to base64
  return doc.output('datauristring').split(',')[1];
}
