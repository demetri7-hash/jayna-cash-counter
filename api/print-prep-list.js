/**
 * Vercel Serverless Function: Print Catering Prep List to Epson Printer
 * Generates formatted prep list PDF and sends via Gmail to Epson printer
 */

import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import { jsPDF } from 'jspdf';

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
function formatPacificDateShort(dateStr) {
  if (!dateStr) return 'N/A';

  // Parse YYYY-MM-DD manually
  const [year, month, day] = dateStr.split('-').map(Number);

  // Create UTC date at noon (avoids DST edge cases)
  const utcDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

  // Format in Pacific timezone (short format)
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
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

    console.log(`🖨️ Generating prep list for order ${order_id}...`);

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

    // Calculate prep list
    const prep = calculatePrepList(lineItems || [], order);

    // Generate PDF prep list
    const pdfBase64 = generatePrepListPDF(prep, order, lineItems || []);
    const filename = `Prep_List_Order_${order.order_number || order_id}_${new Date().toISOString().split('T')[0]}.pdf`;

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
      subject: `Print: Prep List - Order ${order.order_number || order_id}`,
      text: `Prep list for ${order.customer_name || 'Customer'} - ${order.delivery_date}`,
      html: `<p><strong>PREP LIST</strong></p><p>Order #${order.order_number || order_id}</p><p>${order.customer_name || 'Customer'}</p>`,
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
      message: 'Prep list sent to printer successfully',
      messageId: info.messageId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Print prep list error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to print prep list',
      details: error.message
    });
  }
}

/**
 * Calculate prep requirements from line items
 */
function calculatePrepList(lineItems, order) {
  const prep = {
    byoGyros: { total: 0, items: [] },
    salads: [],
    dips: [],
    greekFries: [],
    dolmas: [],
    spanakopita: [],
    sides: [],
    desserts: [],
    pinwheels: []
  };

  lineItems.forEach(item => {
    const itemName = (item.item_name || '').toUpperCase();
    const qty = parseFloat(item.quantity || 1);
    const modifiers = item.modifiers || [];

    // BYO GYRO PITAS (all types combined)
    if (itemName.includes('GYRO PITA') && itemName.includes('MAKE YOUR OWN')) {
      prep.byoGyros.total += qty;
      prep.byoGyros.items.push({ name: item.item_name, qty });
    }
    // SALADS
    else if (itemName.includes('SALAD') && !itemName.includes('HOUSE SALAD')) {
      prep.salads.push({ name: item.item_name, qty, modifiers });
    }
    // DIPS
    else if (itemName.includes('HUMMUS') || itemName.includes('BABA GHANOUSH') || itemName.includes('TZATZIKI')) {
      const dipMods = modifiers.map(m => {
        const modName = (m.name || '').toUpperCase();
        // Parse GF pita quantity from dollar amount (e.g., "+ Gluten Free Pita $4.00" → 4)
        let gfPitaQty = null;
        if (modName.includes('GLUTEN FREE PITA') && m.name) {
          const priceMatch = m.name.match(/\$(\d+(?:\.\d+)?)/);
          if (priceMatch) {
            gfPitaQty = parseFloat(priceMatch[1]);
          }
        }
        return { name: modName, gfPitaQty };
      });
      prep.dips.push({ name: item.item_name, qty, modifiers: dipMods });
    }
    // GREEK FRIES BAR
    else if (itemName.includes('GREEK FRIES BAR')) {
      prep.greekFries.push({ name: item.item_name, qty, modifiers });
    }
    // DOLMAS (separate because needs tzatziki + tong)
    else if (itemName.includes('DOLMAS')) {
      prep.dolmas.push({ name: item.item_name, qty, modifiers });
    }
    // SPANAKOPITA (separate because needs tzatziki + tong)
    else if (itemName.includes('SPANAKOPITA')) {
      prep.spanakopita.push({ name: item.item_name, qty, modifiers });
    }
    // SIDES (everything else)
    else if (itemName.includes('GREEK FRIES') || itemName.includes('CHICKPEA') || itemName.includes('GRILLED PITA') || itemName.includes('VEGETABLE STICKS') || itemName.includes('MARINATED OLIVES')) {
      prep.sides.push({ name: item.item_name, qty, modifiers });
    }
    // DESSERTS
    else if (itemName.includes('BAKLAVA') || itemName.includes('RICE PUDDING')) {
      prep.desserts.push({ name: item.item_name, qty, modifiers });
    }
    // PINWHEELS
    else if (itemName.includes('PINWHEEL')) {
      prep.pinwheels.push({ name: item.item_name, qty });
    }
  });

  return prep;
}

/**
 * Generate prep list PDF - Modern, clean design
 * All caps, grayscale with blue accents, checkboxes, handwriting space
 */
function generatePrepListPDF(prep, order, lineItems) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });

  // Jayna Blue
  const jaynaBlue = [30, 64, 175]; // #1e40af
  const lightGray = [243, 244, 246]; // #f3f4f6
  const mediumGray = [156, 163, 175]; // #9ca3af
  const darkGray = [55, 65, 81]; // #374151

  let yPos = 50;

  // ===== HEADER =====
  doc.setFillColor(...jaynaBlue);
  doc.rect(0, 0, 612, 80, 'F');

  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('PREP LIST', 40, 50);

  // Reset text color
  doc.setTextColor(0, 0, 0);
  yPos = 90;

  // ===== ORDER INFO BOX =====
  doc.setFillColor(...lightGray);
  doc.rect(40, yPos, 532, 60, 'F');
  doc.setDrawColor(...mediumGray);
  doc.setLineWidth(1);
  doc.rect(40, yPos, 532, 60, 'S');

  yPos += 20;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkGray);
  doc.text(`ORDER #${order.order_number || 'N/A'}`, 50, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(`${order.customer_name || 'Customer'}`.toUpperCase(), 150, yPos);
  yPos += 16;

  if (order.delivery_date && order.delivery_time) {
    doc.setFont('helvetica', 'bold');
    doc.text(order.delivery_address ? 'DELIVERY:' : 'PICKUP:', 50, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(`${formatPacificDateShort(order.delivery_date).toUpperCase()} AT ${formatPacificTime(order.delivery_time).toUpperCase()}`, 120, yPos);
  }
  yPos += 16;

  if (order.headcount) {
    doc.setFont('helvetica', 'bold');
    doc.text('HEADCOUNT:', 50, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(`${order.headcount} GUESTS`, 120, yPos);
  }

  doc.setTextColor(0, 0, 0);
  yPos += 30;

  // Containers summary
  let halfPans = 0, deliContainers = 0, brownBowls = 0, tongs = 0, spoons = 0;

  // BYO Gyros
  if (prep.byoGyros.total > 0) {
    const sets = Math.ceil(prep.byoGyros.total / 10);
    deliContainers += sets * 3; // tzatziki, aioli, lemon vin
    halfPans += sets; // mixed greens
    halfPans += 3; // tomatoes, onions, pepperoncini
    halfPans += 1; // pitas
    spoons += sets * 3; // 1 spoon per sauce
    tongs += sets + 3 + 1; // greens, tomatoes, onions, pepperoncini, pitas
  }

  // Salads
  prep.salads.forEach(salad => {
    halfPans += salad.qty < 4 ? salad.qty : Math.ceil(salad.qty / 2);
    deliContainers += salad.qty; // lemon vinaigrette
    tongs += salad.qty; // 1 tong per salad
    spoons += salad.qty; // 1 spoon for vinaigrette per salad
  });

  // Dips
  prep.dips.forEach(dip => {
    deliContainers += dip.qty;
    spoons += dip.qty; // 1 small spoon per dip

    const hasVeggies = dip.modifiers.some(m => m.name && (m.name.includes('VEGGIES') || m.name.includes('VEGGIE')));
    const hasPita = dip.modifiers.some(m => m.name && m.name.includes('PITA') && !m.name.includes('GLUTEN FREE'));
    const hasGFPita = dip.modifiers.some(m => m.name && m.name.includes('GLUTEN FREE PITA'));

    if (hasVeggies) {
      brownBowls += dip.qty * 2; // carrots + celery
      tongs += 2; // 1 for carrots, 1 for celery (per order, not per qty)
    }
    if (hasPita || hasGFPita) {
      halfPans += dip.qty;
      tongs += dip.qty; // 1 tong per pita side
    }
    if (!hasVeggies && !hasPita && !hasGFPita) {
      halfPans += dip.qty;
    }
  });

  // Greek Fries Bar
  prep.greekFries.forEach(fries => {
    halfPans += fries.qty < 2 ? fries.qty : fries.qty * 2;
    deliContainers += 3; // aioli, tzatziki, feta per order
    tongs += fries.qty;
    spoons += 3; // per order
  });

  // Dolmas
  prep.dolmas.forEach(dolma => {
    deliContainers += dolma.qty; // 16oz tzatziki per order
    tongs += dolma.qty; // 1 tong per order
    spoons += dolma.qty; // 1 spoon for tzatziki
  });

  // Spanakopita
  prep.spanakopita.forEach(span => {
    deliContainers += span.qty; // 16oz tzatziki per order
    tongs += span.qty; // 1 tong per order
    spoons += span.qty; // 1 spoon for tzatziki
  });

  // Sides
  prep.sides.forEach(side => {
    tongs += side.qty; // 1 tong per side
  });

  // Desserts
  prep.desserts.forEach(dessert => {
    tongs += dessert.qty; // 1 tong per dessert
  });

  // Pinwheels
  prep.pinwheels.forEach(pinwheel => {
    tongs += pinwheel.qty; // 1 tong per pinwheel
  });

  // ===== CONTAINERS NEEDED =====
  doc.setFillColor(...lightGray);
  doc.rect(40, yPos, 532, 45, 'F');
  doc.setDrawColor(...mediumGray);
  doc.setLineWidth(1);
  doc.rect(40, yPos, 532, 45, 'S');

  yPos += 18;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...jaynaBlue);
  doc.text('CONTAINERS NEEDED:', 50, yPos);
  yPos += 15;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  let containerParts = [];
  if (halfPans > 0) containerParts.push(`${halfPans}x ½ PANS`);
  if (deliContainers > 0) containerParts.push(`${deliContainers}x 16OZ DELIS`);
  if (brownBowls > 0) containerParts.push(`${brownBowls}x BROWN BOWLS`);
  doc.text(containerParts.join('  •  '), 50, yPos);

  yPos += 20;

  // ===== UTENSILS TO PACK =====
  doc.setFillColor(...lightGray);
  doc.rect(40, yPos, 532, 45, 'F');
  doc.setDrawColor(...mediumGray);
  doc.setLineWidth(1);
  doc.rect(40, yPos, 532, 45, 'S');

  yPos += 18;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...jaynaBlue);
  doc.text('UTENSILS TO PACK:', 50, yPos);
  yPos += 15;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  let utensilParts = [];
  if (tongs > 0) utensilParts.push(`${tongs}x TONGS`);
  if (spoons > 0) utensilParts.push(`${spoons}x SMALL SPOONS`);
  doc.text(utensilParts.join('  •  '), 50, yPos);

  yPos += 25;

  // BYO GYROS
  if (prep.byoGyros.total > 0) {
    const sets = Math.ceil(prep.byoGyros.total / 10);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...jaynaBlue);
    doc.text(`BYO GYRO PITAS (${prep.byoGyros.total} TOTAL PORTIONS)`, 40, yPos);
    doc.setTextColor(0, 0, 0);
    yPos += 15;

    // PROTEIN BREAKDOWN - Show each BYO gyro type
    if (prep.byoGyros.items && prep.byoGyros.items.length > 0) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...darkGray);
      doc.text('PROTEIN BREAKDOWN:', 50, yPos);
      yPos += 13;

      doc.setFont('helvetica', 'normal');
      prep.byoGyros.items.forEach(item => {
        doc.text(`  • ${item.qty}x ${item.name.toUpperCase()}`, 50, yPos);
        yPos += 12;
      });
      yPos += 6;
    }

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('PREP ITEMS:', 50, yPos);
    yPos += 13;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`☐ ${sets}x 16oz Tzatziki (no dill) - ${sets} SPOON${sets > 1 ? 'S' : ''}`, 50, yPos); yPos += 13;
    doc.text(`☐ ${sets}x 16oz Spicy Aioli - ${sets} SPOON${sets > 1 ? 'S' : ''}`, 50, yPos); yPos += 13;
    doc.text(`☐ ${sets}x 16oz Lemon Vinaigrette - ${sets} SPOON${sets > 1 ? 'S' : ''}`, 50, yPos); yPos += 13;
    doc.text(`☐ ${sets}x ½ pan Mixed Greens - ${sets} TONG${sets > 1 ? 'S' : ''}`, 50, yPos); yPos += 13;
    doc.text(`☐ ${prep.byoGyros.total} portions Diced Tomatoes (${prep.byoGyros.total < 10 ? 'brown bowls' : '½ pans'}) - 1 SPOON`, 50, yPos); yPos += 13;
    doc.text(`☐ ${prep.byoGyros.total} portions Sliced Red Onion (${prep.byoGyros.total < 10 ? 'brown bowls' : '½ pans'}) - 1 TONG`, 50, yPos); yPos += 13;
    doc.text(`☐ ${prep.byoGyros.total} Whole Pepperoncini (${prep.byoGyros.total < 10 ? 'brown bowls' : '½ pans'}) - 1 TONG`, 50, yPos); yPos += 13;
    const pitasNeeded = prep.byoGyros.total + Math.ceil(prep.byoGyros.total / 10);
    doc.text(`☐ ${pitasNeeded} Whole Grilled Pita (½ pan) - 1 TONG`, 50, yPos); yPos += 18;
  }

  // SALADS
  if (prep.salads.length > 0) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...jaynaBlue);
    doc.text('SALADS', 40, yPos);
    doc.setTextColor(0, 0, 0);
    yPos += 15;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    prep.salads.forEach(salad => {
      doc.text(`☐ ${salad.qty}x ${salad.name.toUpperCase()} (${salad.qty < 4 ? '½ PANS' : 'FULL PANS'}) - ${salad.qty} TONG${salad.qty > 1 ? 'S' : ''}`, 50, yPos); yPos += 12;
      doc.setTextColor(...darkGray);
      doc.text(`   → ${salad.qty}x 16OZ LEMON VINAIGRETTE - ${salad.qty} SPOON${salad.qty > 1 ? 'S' : ''}`, 60, yPos);
      doc.setTextColor(0, 0, 0);
      yPos += 14;
    });
    yPos += 6;
  }

  // DIPS
  if (prep.dips.length > 0 && yPos < 700) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...jaynaBlue);
    doc.text('DIPS', 40, yPos);
    doc.setTextColor(0, 0, 0);
    yPos += 15;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    prep.dips.forEach(dip => {
      doc.text(`☐ ${dip.qty}x 16OZ ${dip.name.toUpperCase()} (GARNISH) - ${dip.qty} SMALL SPOON${dip.qty > 1 ? 'S' : ''}`, 50, yPos); yPos += 12;

      const hasVeggies = dip.modifiers.some(m => m.name && (m.name.includes('VEGGIES') || m.name.includes('VEGGIE')));
      const hasPita = dip.modifiers.some(m => m.name && m.name.includes('PITA') && !m.name.includes('GLUTEN FREE'));
      const gfPitaMod = dip.modifiers.find(m => m.name && m.name.includes('GLUTEN FREE PITA'));
      const hasGFPita = !!gfPitaMod;

      doc.setTextColor(...darkGray);
      if (hasVeggies) {
        doc.text(`   → ${dip.qty * 24} CARROTS + ${dip.qty * 24} CELERY (BROWN BOWLS) - 2 TONGS`, 60, yPos); yPos += 12;
      }
      if (hasPita) {
        doc.text(`   → ${dip.qty * 6} PITAS SLICED 8 PIECES (½ PANS) - ${dip.qty} TONG${dip.qty > 1 ? 'S' : ''}`, 60, yPos); yPos += 12;
      }
      if (hasGFPita && gfPitaMod) {
        const gfQty = gfPitaMod.gfPitaQty || (dip.qty * 6);
        doc.text(`   → ${gfQty} GF PITAS SLICED 8 PIECES (½ PANS) - ${dip.qty} TONG${dip.qty > 1 ? 'S' : ''}`, 60, yPos); yPos += 12;
      }
      doc.setTextColor(0, 0, 0);
      yPos += 3;
    });
    yPos += 6;
  }

  // GREEK FRIES BAR
  if (prep.greekFries.length > 0 && yPos < 700) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...jaynaBlue);
    doc.text('GREEK FRIES BAR', 40, yPos);
    doc.setTextColor(0, 0, 0);
    yPos += 15;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    prep.greekFries.forEach(fries => {
      doc.text(`☐ ${fries.qty}x ${fries.name.toUpperCase()}`, 50, yPos); yPos += 12;
      doc.setTextColor(...darkGray);
      doc.text(`   → ½ PAN FRIES + 16OZ AIOLI + 16OZ TZATZIKI + 16OZ FETA`, 60, yPos); yPos += 12;
      doc.text(`   → ${fries.qty} TONG${fries.qty > 1 ? 'S' : ''}, 3 SPOONS`, 60, yPos);
      doc.setTextColor(0, 0, 0);
      yPos += 14;
    });
    yPos += 6;
  }

  // DOLMAS
  if (prep.dolmas.length > 0 && yPos < 700) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...jaynaBlue);
    doc.text('DOLMAS', 40, yPos);
    doc.setTextColor(0, 0, 0);
    yPos += 15;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    prep.dolmas.forEach(dolma => {
      if (yPos < 720) {
        doc.text(`☐ ${dolma.qty}x ${dolma.name.toUpperCase()} (½ PAN OR ROUND TRAY + LEMON WEDGES) - ${dolma.qty} TONG${dolma.qty > 1 ? 'S' : ''}`, 50, yPos); yPos += 12;
        doc.setTextColor(...darkGray);
        doc.text(`   → ${dolma.qty}x 16OZ TZATZIKI (DILL STRIPE) - ${dolma.qty} SMALL SPOON${dolma.qty > 1 ? 'S' : ''}`, 60, yPos);
        doc.setTextColor(0, 0, 0);
        yPos += 14;
      }
    });
    yPos += 6;
  }

  // SPANAKOPITA
  if (prep.spanakopita.length > 0 && yPos < 700) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...jaynaBlue);
    doc.text('SPANAKOPITA', 40, yPos);
    doc.setTextColor(0, 0, 0);
    yPos += 15;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    prep.spanakopita.forEach(span => {
      if (yPos < 720) {
        doc.text(`☐ ${span.qty}x ${span.name.toUpperCase()} (ROUND TRAY ON ARUGULA OR ½/FULL PAN) - ${span.qty} TONG${span.qty > 1 ? 'S' : ''}`, 50, yPos); yPos += 12;
        doc.setTextColor(...darkGray);
        doc.text(`   → ${span.qty}x 16OZ TZATZIKI (DILL STRIPE) - ${span.qty} SMALL SPOON${span.qty > 1 ? 'S' : ''}`, 60, yPos);
        doc.setTextColor(0, 0, 0);
        yPos += 14;
      }
    });
    yPos += 6;
  }

  // SIDES
  if (prep.sides.length > 0 && yPos < 700) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...jaynaBlue);
    doc.text('SIDES', 40, yPos);
    doc.setTextColor(0, 0, 0);
    yPos += 15;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    prep.sides.forEach(side => {
      if (yPos < 720) {
        doc.text(`☐ ${side.qty}x ${side.name.toUpperCase()} - ${side.qty} TONG${side.qty > 1 ? 'S' : ''}`, 50, yPos); yPos += 12;
      }
    });
    yPos += 6;
  }

  // DESSERTS
  if (prep.desserts.length > 0 && yPos < 700) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...jaynaBlue);
    doc.text('DESSERTS', 40, yPos);
    doc.setTextColor(0, 0, 0);
    yPos += 15;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    prep.desserts.forEach(dessert => {
      if (yPos < 720) {
        doc.text(`☐ ${dessert.qty}x ${dessert.name.toUpperCase()} - ${dessert.qty} TONG${dessert.qty > 1 ? 'S' : ''}`, 50, yPos); yPos += 12;
      }
    });
    yPos += 6;
  }

  // PINWHEELS
  if (prep.pinwheels.length > 0 && yPos < 700) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...jaynaBlue);
    doc.text('PINWHEELS', 40, yPos);
    doc.setTextColor(0, 0, 0);
    yPos += 15;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    prep.pinwheels.forEach(pinwheel => {
      if (yPos < 720) {
        doc.text(`☐ ${pinwheel.qty}x ${pinwheel.name.toUpperCase()} - ${pinwheel.qty} TONG${pinwheel.qty > 1 ? 'S' : ''}`, 50, yPos); yPos += 12;
      }
    });
    yPos += 6;
  }

  // SPECIAL NOTES
  if (order.delivery_notes && yPos < 680) {
    yPos += 8;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...jaynaBlue);
    doc.text('SPECIAL NOTES:', 40, yPos);
    doc.setTextColor(0, 0, 0);
    yPos += 15;

    // Notes box with background
    doc.setFillColor(255, 250, 240);
    const noteLines = doc.splitTextToSize(order.delivery_notes.toUpperCase(), 510);
    const notesHeight = Math.min(noteLines.length * 13 + 16, 80);
    doc.rect(40, yPos - 10, 532, notesHeight, 'F');
    doc.setDrawColor(...mediumGray);
    doc.setLineWidth(1);
    doc.rect(40, yPos - 10, 532, notesHeight, 'S');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    noteLines.forEach((line, idx) => {
      if (idx < 5 && yPos < 750) {  // Limit to 5 lines
        doc.text(line, 50, yPos);
        yPos += 13;
      }
    });
    yPos += 15;
  }

  // HANDWRITTEN NOTES SECTION
  if (yPos < 700) {
    yPos += 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkGray);
    doc.text('PREP NOTES:', 40, yPos);
    doc.setTextColor(0, 0, 0);
    yPos += 8;

    // Draw lines for handwritten notes
    for (let i = 0; i < 3; i++) {
      if (yPos < 740) {
        doc.setDrawColor(...lightGray);
        doc.setLineWidth(0.5);
        doc.line(40, yPos, 572, yPos);
        yPos += 18;
      }
    }
  }

  // Footer
  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...mediumGray);
  doc.text(`Generated: ${formatPacificDateTime(new Date())} PST`, 40, 782);
  doc.setTextColor(0, 0, 0);

  // Convert to base64
  return doc.output('datauristring').split(',')[1];
}
