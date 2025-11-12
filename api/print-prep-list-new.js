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
    const downloadMode = req.query.download === 'true';

    if (!order_id) {
      return res.status(400).json({
        success: false,
        error: 'order_id is required'
      });
    }

    console.log(`${downloadMode ? '📥' : '🖨️'} Generating prep list for order ${order_id}...`);

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

    // Use REAL order number from ezCater or Toast (NO sequential numbers)
    let orderNum;
    if (order.source_system === 'EZCATER') {
      // For ezCater: Use the actual ezCater order number
      orderNum = order.order_number || order_id;
    } else {
      // For Toast: Use the check number or order number
      orderNum = order.check_number || order.order_number || order_id;
    }

    const filename = `Prep_List_${order.source_system}_${orderNum}_${new Date().toISOString().split('T')[0]}.pdf`;

    // DOWNLOAD MODE: Return PDF as blob for download
    if (downloadMode) {
      console.log(`✅ Prep list PDF generated for download`);

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
      subject: `Print: Prep List - Order #${orderNum}`,
      text: '',  // Empty text body - only print PDF attachment
      html: '',  // Empty HTML body - only print PDF attachment
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
 * Helper: Consolidate duplicate items by name (combine quantities)
 */
function consolidateItems(items) {
  const consolidated = [];
  const itemMap = new Map();

  items.forEach(item => {
    const key = item.name.toUpperCase();
    if (itemMap.has(key)) {
      // Add quantity to existing item
      itemMap.get(key).qty += item.qty;
    } else {
      // New item
      itemMap.set(key, { ...item });
      consolidated.push(itemMap.get(key));
    }
  });

  return consolidated;
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

    // BYO GYRO PITAS (all protein options: Beef & Lamb, Chicken, Roasted Chickpeas, Falafel)
    if (itemName.includes('MAKE YOUR OWN') || itemName.includes('BYO')) {
      prep.byoGyros.total += qty;
      prep.byoGyros.items.push({ name: item.item_name, qty });
    }
    // SALADS (including House Salad)
    else if (itemName.includes('SALAD')) {
      prep.salads.push({ name: item.item_name, qty, modifiers });
    }
    // DIPS
    else if (itemName.includes('HUMMUS') || itemName.includes('BABA GHANOUSH') || itemName.includes('TZATZIKI')) {
      const dipMods = modifiers.map(m => {
        const modName = (m.name || '').toUpperCase();
        // Parse GF pita quantity from dollar amount
        // Example: "+ Gluten Free Pita ($4.00)" → $4.00 / $2.00 per pita = 2 pitas
        let gfPitaQty = null;
        if (modName.includes('GLUTEN FREE PITA')) {
          // Try multiple methods to get GF pita quantity

          // Method 1: Check if modifier has a price field directly
          if (m.price && typeof m.price === 'number') {
            gfPitaQty = Math.round(m.price / 200); // Price in cents, GF pitas are 200 cents ($2) each
          }
          // Method 2: Parse from name string (e.g., "+ Gluten Free Pita ($4.00)")
          else if (m.name) {
            const priceMatch = m.name.match(/\$(\d+(?:\.\d{1,2})?)/);
            if (priceMatch) {
              const totalPrice = parseFloat(priceMatch[1]);
              gfPitaQty = Math.round(totalPrice / 2); // GF pitas cost $2 each
            }
          }
          // Method 3: Check for quantity field directly
          if (!gfPitaQty && m.quantity && typeof m.quantity === 'number') {
            gfPitaQty = m.quantity;
          }
        }
        return { name: modName, gfPitaQty, originalModifier: m };
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

  // Consolidate duplicates in all categories (combines duplicate item names with summed quantities)
  prep.byoGyros.items = consolidateItems(prep.byoGyros.items);
  prep.salads = consolidateItems(prep.salads);
  prep.dips = consolidateItems(prep.dips);
  prep.greekFries = consolidateItems(prep.greekFries);
  prep.dolmas = consolidateItems(prep.dolmas);
  prep.spanakopita = consolidateItems(prep.spanakopita);
  prep.sides = consolidateItems(prep.sides);
  prep.desserts = consolidateItems(prep.desserts);
  prep.pinwheels = consolidateItems(prep.pinwheels);

  return prep;
}

/**
 * Helper: Convert ALL CAPS text to Title Case
 * Example: "CHICKEN GYRO PITA (MAKE YOUR OWN)" -> "Chicken Gyro Pita (Make Your Own)"
 */
function toTitleCase(str) {
  return str.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Helper: Extract and calculate protein pans from BYO items
 * Returns array of protein prep items with pan calculations
 */
function calculateProteinPans(byoItems) {
  const proteins = {};

  // Parse BYO items and extract protein types
  byoItems.forEach(item => {
    const itemName = (item.name || '').toUpperCase();
    const qty = parseFloat(item.qty || 0);

    let proteinKey = null;
    let proteinName = null;
    let equipment = null;

    // Match protein types (catch all variations)
    if (itemName.includes('BEEF') && (itemName.includes('LAMB') || itemName.includes('&'))) {
      proteinKey = 'BEEF_LAMB';
      proteinName = 'Beef & Lamb Gyro Meat';
      equipment = '1 tong';
    } else if (itemName.includes('CHICKEN')) {
      proteinKey = 'CHICKEN';
      proteinName = 'Chicken Gyro Meat';
      equipment = '1 tong';
    } else if (itemName.includes('FALAFEL')) {
      proteinKey = 'FALAFEL';
      proteinName = 'Falafel Portions';
      equipment = '1 tong';
    } else if (itemName.includes('ROASTED') && itemName.includes('CHICKPEA')) {
      proteinKey = 'ROASTED_CHICKPEAS';
      proteinName = 'Roasted Chickpeas Portions';
      equipment = '1 large serving spoon';
    }

    // Aggregate protein quantities
    if (proteinKey) {
      if (!proteins[proteinKey]) {
        proteins[proteinKey] = { name: proteinName, qty: 0, equipment };
      }
      proteins[proteinKey].qty += qty;
    }
  });

  // Calculate pans for each protein type
  const proteinPrep = [];
  Object.values(proteins).forEach(protein => {
    const qty = protein.qty;
    let containerType = '';

    // Pan calculation logic:
    // <5 = brown bowls
    // 6-20 = 1 half pan
    // 21+ = calculate half pans, combine 2 half pans into full pans
    if (qty < 5) {
      containerType = 'brown bowls';
    } else if (qty <= 20) {
      containerType = '1 half pan';
    } else {
      // Calculate half pans needed (10 portions per half pan for proteins)
      const halfPansNeeded = Math.ceil(qty / 10);
      const fullPans = Math.floor(halfPansNeeded / 2);
      const remainingHalfPans = halfPansNeeded % 2;

      if (fullPans > 0 && remainingHalfPans > 0) {
        containerType = `${fullPans} full pan${fullPans > 1 ? 's' : ''} + 1 half pan`;
      } else if (fullPans > 0) {
        containerType = `${fullPans} full pan${fullPans > 1 ? 's' : ''}`;
      } else {
        containerType = '1 half pan';
      }
    }

    proteinPrep.push({
      qty,
      name: protein.name,
      container: containerType,
      equipment: protein.equipment
    });
  });

  return proteinPrep;
}

/**
 * Helper: Convert 1/2 pan count to full pans + 1/2 pan format
 * Example: 9 half pans → "4 full pans + 1 1/2 pan"
 * Example: 8 half pans → "4 full pans"
 * Example: 1 half pan → "1 1/2 pan"
 */
function formatPanCount(halfPanCount) {
  const fullPans = Math.floor(halfPanCount / 2);
  const remainingHalfPans = halfPanCount % 2;

  if (fullPans > 0 && remainingHalfPans > 0) {
    return `${fullPans} full pan${fullPans > 1 ? 's' : ''} + 1 half pan`;
  } else if (fullPans > 0) {
    return `${fullPans} full pan${fullPans > 1 ? 's' : ''}`;
  } else {
    return `1 half pan`;
  }
}

/**
 * Generate prep list PDF - Modern, clean design
 * All caps, grayscale with blue accents, checkboxes, handwriting space
 */
function generatePrepListPDF(prep, order, lineItems) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });

  // Set normal character spacing (no extra spacing)
  doc.setCharSpace(0);

  // Simple grayscale colors (no blue!)
  const black = [0, 0, 0];
  const darkGray = [75, 75, 75];
  const lightGray = [200, 200, 200];

  let yPos = 40;

  // ===== HEADER - Simple black text =====
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...black);
  doc.text('PREP LIST', 40, yPos);
  yPos += 25;

  // ===== ORDER INFO - No box, just text =====
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...black);

  // Use REAL order number from ezCater or Toast (NO sequential numbers)
  let orderNum;
  let orderLabel;

  if (order.source_system === 'EZCATER') {
    // For ezCater: Show ezCater order number
    orderNum = order.order_number || 'N/A';
    orderLabel = 'EZCATER ORDER';
  } else {
    // For Toast: Show check number
    orderNum = order.check_number || order.order_number || 'N/A';
    orderLabel = 'TOAST CHECK';
  }

  doc.text(`${orderLabel} #${orderNum}`, 40, yPos);
  yPos += 14;
  doc.setFont('helvetica', 'normal');
  doc.text(`${order.customer_name || 'Customer'}`, 40, yPos);
  yPos += 14;

  if (order.delivery_date && order.delivery_time) {
    doc.setFont('helvetica', 'bold');
    doc.text(order.delivery_address ? 'DELIVERY:' : 'PICKUP:', 40, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(`${formatPacificDateShort(order.delivery_date)} at ${formatPacificTime(order.delivery_time)}`, 110, yPos);
    yPos += 14;

    // Add delivery address if available
    if (order.delivery_address) {
      doc.setFont('helvetica', 'bold');
      doc.text('ADDRESS:', 40, yPos);
      doc.setFont('helvetica', 'normal');
      const addressLines = doc.splitTextToSize(order.delivery_address, 450);
      addressLines.forEach((line, idx) => {
        if (idx === 0) {
          doc.text(line, 110, yPos);
        } else {
          yPos += 12;
          doc.text(line, 110, yPos);
        }
      });
      yPos += 14;
    }
  }

  if (order.headcount) {
    doc.setFont('helvetica', 'bold');
    doc.text('HEADCOUNT: ', 40, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(`${order.headcount} guests`, 115, yPos);
    yPos += 14;
  }

  // ===== ORDER MUST BE READY AT - Highlighted in yellow/orange =====
  if (order.delivery_time) {
    yPos += 6;
    const readyByBoxHeight = 30;
    doc.setFillColor(255, 243, 205); // Soft orange/yellow highlight
    doc.rect(40, yPos, 532, readyByBoxHeight, 'F');
    doc.setDrawColor(255, 153, 0); // Orange border
    doc.setLineWidth(2);
    doc.rect(40, yPos, 532, readyByBoxHeight, 'S');

    // Calculate ready time (40 minutes before delivery)
    const deliveryTime = new Date(order.delivery_time);
    const readyByTime = new Date(deliveryTime.getTime() - 40 * 60000); // 40 minutes before
    const readyByStr = new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'America/Los_Angeles'
    }).format(readyByTime);

    yPos += 20;
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(180, 80, 0); // Dark orange text
    doc.text(`ORDER MUST BE READY AT EXACTLY: ${readyByStr}`, 50, yPos);
    doc.setTextColor(...black);
    yPos += 16;
  }

  // Add simple line separator
  doc.setDrawColor(...lightGray);
  doc.setLineWidth(1);
  doc.line(40, yPos, 572, yPos);
  yPos += 20;

  // Containers summary
  let halfPans = 0, fullPans = 0, deliContainers = 0, deli32ozContainers = 0, brownBowls = 0, roundTrays = 0, tongs = 0;
  let largeServingSpoons = 0, smallSpoons = 0;

  // BYO Gyros
  if (prep.byoGyros.total > 0) {
    const sets = Math.ceil(prep.byoGyros.total / 15);
    deliContainers += sets * 3; // tzatziki, aioli, lemon vin
    halfPans += sets; // mixed greens
    smallSpoons += 3; // tzatziki (no dill), spicy aioli, lemon vinaigrette
    largeServingSpoons += 1; // diced tomatoes
    let byoTongs = 5; // greens, tomatoes, onions, pepperoncini, pitas

    // DICED TOMATO LOGIC: 30 portions per half pan
    let tomatoUsesBrownBowl = false;
    if (prep.byoGyros.total < 10) {
      deliContainers += 1; // 16oz deli container
    } else if (prep.byoGyros.total <= 20) {
      brownBowls += 1; // Brown Jayna bowl
      tomatoUsesBrownBowl = true; // Flag for coordinated brown bowl logic
    } else {
      const tomatoHalfPans = Math.ceil(prep.byoGyros.total / 30);
      halfPans += tomatoHalfPans;
    }

    // SLICED RED ONION LOGIC: 50 portions per half pan
    // COORDINATED LOGIC: If tomatoes use brown bowl, onions must also use brown bowl
    if (tomatoUsesBrownBowl) {
      brownBowls += 1; // Brown Jayna bowl
    } else if (prep.byoGyros.total < 20) {
      deliContainers += 1; // 16oz deli container
    } else if (prep.byoGyros.total <= 45) {
      brownBowls += 1; // Brown Jayna bowl
    } else {
      const onionHalfPans = Math.ceil(prep.byoGyros.total / 50);
      halfPans += onionHalfPans;
    }

    // PEPPERONCINI LOGIC: 100 portions per half pan, full pans for 100+
    // COORDINATED LOGIC: If tomatoes use brown bowl, pepperoncini must also use brown bowl
    if (tomatoUsesBrownBowl) {
      brownBowls += 1; // Brown Jayna bowl
    } else if (prep.byoGyros.total < 10) {
      deliContainers += 1; // 16oz deli
    } else if (prep.byoGyros.total <= 20) {
      deli32ozContainers += 1; // 32oz deli
    } else if (prep.byoGyros.total < 100) {
      halfPans += 1; // Half pan
    } else {
      const pepperFullPans = Math.floor(prep.byoGyros.total / 100);
      const pepperRemainder = prep.byoGyros.total % 100;
      fullPans += pepperFullPans;
      if (pepperRemainder > 0) {
        halfPans += 1;
      }
    }

    // PITA LOGIC: 25 whole pita fit in one FULL pan
    const pitasNeeded = prep.byoGyros.total + Math.ceil(prep.byoGyros.total / 10);
    const pitaFullPans = Math.ceil(pitasNeeded / 25);
    fullPans += pitaFullPans;

    tongs += byoTongs;
  }

  // Salads - 1 tong per type, 1 small spoon per type for lemon vin, 2 large serving spoons total
  if (prep.salads.length > 0) {
    prep.salads.forEach(salad => {
      halfPans += salad.qty < 4 ? salad.qty : Math.ceil(salad.qty / 2);
      deliContainers += salad.qty; // lemon vinaigrette
    });
    tongs += prep.salads.length; // 1 tong per salad type
    smallSpoons += prep.salads.length; // 1 small spoon per salad type for lemon vinaigrette
    largeServingSpoons += 2; // 2 large serving spoons for all salads
  }

  // Dips - 1 small spoon per DIP TYPE (hummus, baba ghanoush, tzatziki, chimichurri)
  if (prep.dips.length > 0) {
    let hasVeggiesInAnyDip = false;
    let hasPitaInAnyDip = false;

    prep.dips.forEach(dip => {
      deliContainers += dip.qty;

      const hasVeggies = dip.modifiers.some(m => m.name && (m.name.includes('VEGGIES') || m.name.includes('VEGGIE')));
      const hasPita = dip.modifiers.some(m => m.name && m.name.includes('PITA') && !m.name.includes('GLUTEN FREE'));
      const hasGFPita = dip.modifiers.some(m => m.name && m.name.includes('GLUTEN FREE PITA'));

      if (hasVeggies) {
        brownBowls += dip.qty * 2; // carrots + celery
        hasVeggiesInAnyDip = true;
      }
      if (hasPita || hasGFPita) {
        halfPans += dip.qty;
        hasPitaInAnyDip = true;
      }
      if (!hasVeggies && !hasPita && !hasGFPita) {
        halfPans += dip.qty;
      }
    });

    smallSpoons += prep.dips.length; // 1 small spoon per dip type
    if (hasVeggiesInAnyDip) tongs += 2; // 1 for carrots, 1 for celery
    if (hasPitaInAnyDip) tongs += 1; // 1 for pita
  }

  // Greek Fries Bar - 1 tong per type, small spoons for toppings
  if (prep.greekFries.length > 0) {
    prep.greekFries.forEach(fries => {
      halfPans += fries.qty < 2 ? fries.qty : fries.qty * 2;
      deliContainers += 3; // aioli, tzatziki, feta per order
    });
    tongs += prep.greekFries.length; // 1 tong per greek fries type
    smallSpoons += 3; // aioli, tzatziki, feta (3 types total, not per order)
  }

  // Dolmas - Container logic: brown bowls for 1, round trays for 2-4, half pans for 5+
  // Tzatziki: 1x 16oz per 2 orders (round up)
  if (prep.dolmas.length > 0) {
    prep.dolmas.forEach(dolma => {
      const totalOrders = dolma.qty;

      // Calculate tzatziki: 1x 16oz per 2 orders (round up)
      const tzatzikiCount = Math.ceil(totalOrders / 2);
      deliContainers += tzatzikiCount;

      // Container logic
      if (totalOrders === 1) {
        brownBowls += 1;
      } else if (totalOrders >= 2 && totalOrders <= 4) {
        roundTrays += totalOrders;
      } else {
        halfPans += 1;
      }
    });
    tongs += prep.dolmas.length; // 1 tong per dolma type
    smallSpoons += prep.dolmas.length; // 1 small spoon per dolma type for tzatziki
  }

  // Spanakopita - 1 tong and 1 small spoon per ITEM TYPE (tzatziki)
  if (prep.spanakopita.length > 0) {
    prep.spanakopita.forEach(span => {
      deliContainers += span.qty;
    });
    tongs += prep.spanakopita.length; // 1 tong per spanakopita type
    smallSpoons += prep.spanakopita.length; // 1 small spoon per spanakopita type for tzatziki
  }

  // Sides - 1 tong per ITEM TYPE, check for rice (needs large serving spoon)
  if (prep.sides.length > 0) {
    tongs += prep.sides.length;
    prep.sides.forEach(side => {
      const sideName = (side.name || '').toUpperCase();
      if (sideName.includes('RICE')) {
        largeServingSpoons += 1; // 1 large serving spoon for rice
      }
    });
  }

  // Desserts - 1 tong per ITEM TYPE
  if (prep.desserts.length > 0) {
    tongs += prep.desserts.length;
  }

  // Pinwheels - 1 tong per ITEM TYPE
  if (prep.pinwheels.length > 0) {
    tongs += prep.pinwheels.length;
  }

  // ===== CONTAINERS NEEDED - Gray box =====
  const containerBoxHeight = 45;
  doc.setFillColor(245, 245, 245);
  doc.rect(40, yPos, 532, containerBoxHeight, 'F');
  doc.setDrawColor(...lightGray);
  doc.setLineWidth(1);
  doc.rect(40, yPos, 532, containerBoxHeight, 'S');

  yPos += 18;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...black);
  doc.text('CONTAINERS NEEDED', 50, yPos);
  yPos += 16;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  // Combine full pans and half pans
  const totalHalfPanEquivalent = (fullPans * 2) + halfPans;

  let containerParts = [];
  if (totalHalfPanEquivalent > 0) containerParts.push(formatPanCount(totalHalfPanEquivalent));
  if (roundTrays > 0) containerParts.push(`${roundTrays}x Round Trays with Dome Lids`);
  if (deliContainers > 0) containerParts.push(`${deliContainers}x 16oz Deli Containers`);
  if (deli32ozContainers > 0) containerParts.push(`${deli32ozContainers}x 32oz Deli Containers`);
  if (brownBowls > 0) containerParts.push(`${brownBowls}x Brown Jayna Bowls`);
  doc.text(`* ${containerParts.join('  *  ')}`, 50, yPos);
  yPos += 18;

  // ===== UTENSILS TO PACK - Gray box =====
  const utensilBoxHeight = 45;
  doc.setFillColor(245, 245, 245);
  doc.rect(40, yPos, 532, utensilBoxHeight, 'F');
  doc.setDrawColor(...lightGray);
  doc.setLineWidth(1);
  doc.rect(40, yPos, 532, utensilBoxHeight, 'S');

  yPos += 18;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...black);
  doc.text('UTENSILS TO PACK', 50, yPos);
  yPos += 16;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  let utensilParts = [];
  if (tongs > 0) utensilParts.push(`${tongs}x Tongs`);
  if (largeServingSpoons > 0) utensilParts.push(`${largeServingSpoons}x Large Serving Spoons`);
  if (smallSpoons > 0) utensilParts.push(`${smallSpoons}x Small Spoons`);
  doc.text(`* ${utensilParts.join('  *  ')}`, 50, yPos);
  yPos += 22;

  // BYO GYRO PITAS (Beef & Lamb, Chicken, Roasted Chickpeas, Falafel)
  if (prep.byoGyros.total > 0) {
    const sets = Math.ceil(prep.byoGyros.total / 15);

    // Calculate box height dynamically
    const proteinLines = prep.byoGyros.items?.length || 0;
    const byoBoxHeight = 60 + (proteinLines * 12) + 145; // Header + proteins + prep items
    doc.setFillColor(250, 250, 250);
    doc.rect(40, yPos, 532, byoBoxHeight, 'F');
    doc.setDrawColor(...lightGray);
    doc.setLineWidth(1);
    doc.rect(40, yPos, 532, byoBoxHeight, 'S');

    yPos += 18;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...black);
    doc.text(`BYO GYRO PITAS (${prep.byoGyros.total} TOTAL PORTIONS)`, 50, yPos);
    yPos += 16;

    // PROTEIN BREAKDOWN - Show each BYO gyro type
    if (prep.byoGyros.items && prep.byoGyros.items.length > 0) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('PROTEIN BREAKDOWN:', 50, yPos);
      yPos += 13;

      doc.setFont('helvetica', 'normal');
      prep.byoGyros.items.forEach(item => {
        doc.text(`* ${item.qty}x ${toTitleCase(item.name)}`, 50, yPos);
        yPos += 12;
      });
      yPos += 6;
    }

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('PREP ITEMS:', 50, yPos);
    yPos += 13;

    doc.setFont('helvetica', 'normal');

    // === PROTEINS (ALWAYS AT TOP) ===
    const proteinPans = calculateProteinPans(prep.byoGyros.items || []);
    proteinPans.forEach(protein => {
      doc.text(`[ ] ${protein.qty}x ${protein.name} (${protein.container}) - ${protein.equipment}`, 50, yPos);
      yPos += 12;
    });

    // Add spacing after proteins if they exist
    if (proteinPans.length > 0) {
      yPos += 6;
    }

    doc.text(`[ ] ${sets}x 16oz Tzatziki (no dill) - 1 small spoon`, 50, yPos); yPos += 12;
    doc.text(`[ ] ${sets}x 16oz Spicy Aioli - 1 small spoon`, 50, yPos); yPos += 12;
    doc.text(`[ ] ${sets}x 16oz Lemon Vinaigrette - 1 small spoon`, 50, yPos); yPos += 12;
    doc.text(`[ ] ${formatPanCount(sets)} Mixed Greens - 1 tong`, 50, yPos); yPos += 12;

    // DICED TOMATO LOGIC: 30 portions per half pan
    // Below 10: 16oz deli container
    // 10-20: Brown Jayna bowl
    // 21+: Calculate half pans (30 portions per half pan)
    let tomatoContainer = '';
    let tomatoUsesBrownBowlDisplay = false;
    if (prep.byoGyros.total < 10) {
      tomatoContainer = '16oz deli container';
    } else if (prep.byoGyros.total <= 20) {
      tomatoContainer = 'brown Jayna bowl';
      tomatoUsesBrownBowlDisplay = true; // Flag for coordinated display logic
    } else {
      const tomatoHalfPans = Math.ceil(prep.byoGyros.total / 30);
      tomatoContainer = formatPanCount(tomatoHalfPans);
    }
    doc.text(`[ ] ${prep.byoGyros.total} portions Diced Tomatoes (${tomatoContainer}) - 1 large serving spoon`, 50, yPos); yPos += 12;

    // SLICED RED ONION LOGIC: 50 portions per half pan
    // COORDINATED LOGIC: If tomatoes use brown bowl, onions must also use brown bowl
    let onionContainer = '';
    if (tomatoUsesBrownBowlDisplay) {
      onionContainer = 'brown Jayna bowl';
    } else if (prep.byoGyros.total < 20) {
      onionContainer = '16oz deli container';
    } else if (prep.byoGyros.total <= 45) {
      onionContainer = 'brown Jayna bowl';
    } else {
      const onionHalfPans = Math.ceil(prep.byoGyros.total / 50);
      onionContainer = formatPanCount(onionHalfPans);
    }
    doc.text(`[ ] ${prep.byoGyros.total} portions Sliced Red Onion (${onionContainer}) - 1 tong`, 50, yPos); yPos += 12;

    // PEPPERONCINI LOGIC: 100 portions per half pan
    // COORDINATED LOGIC: If tomatoes use brown bowl, pepperoncini must also use brown bowl
    let pepperonciniContainer = '';
    if (tomatoUsesBrownBowlDisplay) {
      pepperonciniContainer = 'brown Jayna bowl';
    } else if (prep.byoGyros.total < 10) {
      pepperonciniContainer = '16oz deli container';
    } else if (prep.byoGyros.total <= 20) {
      pepperonciniContainer = '32oz deli container';
    } else if (prep.byoGyros.total < 100) {
      pepperonciniContainer = '1 half pan';
    } else {
      const pepperFullPans = Math.floor(prep.byoGyros.total / 100);
      const pepperRemainder = prep.byoGyros.total % 100;
      if (pepperRemainder > 0) {
        pepperonciniContainer = `${pepperFullPans} full pan${pepperFullPans > 1 ? 's' : ''} + 1 half pan`;
      } else {
        pepperonciniContainer = `${pepperFullPans} full pan${pepperFullPans > 1 ? 's' : ''}`;
      }
    }
    doc.text(`[ ] ${prep.byoGyros.total} whole Pepperoncini (${pepperonciniContainer}) - 1 tong`, 50, yPos); yPos += 12;

    // PITA LOGIC: 25 whole pita fit in one FULL pan
    const pitasNeeded = prep.byoGyros.total + Math.ceil(prep.byoGyros.total / 10);
    const pitaFullPans = Math.ceil(pitasNeeded / 25);
    doc.text(`[ ] ${pitasNeeded} whole Grilled Pita (${pitaFullPans} full pan${pitaFullPans > 1 ? 's' : ''}) - 1 tong`, 50, yPos); yPos += 18;
  }

  // SALADS
  if (prep.salads.length > 0) {
    const saladBoxHeight = 60 + (prep.salads.length * 26);
    doc.setFillColor(250, 250, 250);
    doc.rect(40, yPos, 532, saladBoxHeight, 'F');
    doc.setDrawColor(...lightGray);
    doc.setLineWidth(1);
    doc.rect(40, yPos, 532, saladBoxHeight, 'S');

    yPos += 18;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...black);
    doc.text('SALADS', 50, yPos);
    yPos += 15;

    // Note about large serving spoons
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...darkGray);
    doc.text('(2 large serving spoons total for all salads)', 50, yPos);
    doc.setTextColor(...black);
    yPos += 13;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    prep.salads.forEach(salad => {
      // Calculate pan count: 1/2 pan each if < 4, or 2 half pans per salad if >= 4
      const halfPans = salad.qty < 4 ? salad.qty : salad.qty * 2;
      doc.text(`[ ] ${salad.qty}x ${toTitleCase(salad.name)} (${formatPanCount(halfPans)}) - 1 tong`, 50, yPos); yPos += 11;
      doc.setTextColor(...darkGray);
      doc.text(`    - ${salad.qty}x 16oz Lemon Vinaigrette - 1 small spoon`, 56, yPos);
      doc.setTextColor(...black);
      yPos += 13;
    });
    yPos += 6;
  }

  // DIPS
  if (prep.dips.length > 0 && yPos < 700) {
    // Calculate dynamic height
    let dipLinesCount = 0;
    prep.dips.forEach(dip => {
      dipLinesCount += 1; // main line
      const hasVeggies = dip.modifiers.some(m => m.name && (m.name.includes('VEGGIES') || m.name.includes('VEGGIE')));
      const hasPita = dip.modifiers.some(m => m.name && m.name.includes('PITA') && !m.name.includes('GLUTEN FREE'));
      const hasGFPita = dip.modifiers.some(m => m.name && m.name.includes('GLUTEN FREE PITA'));
      if (hasVeggies) dipLinesCount += 1;
      if (hasPita) dipLinesCount += 1;
      if (hasGFPita) dipLinesCount += 1;
    });
    const dipBoxHeight = 40 + (dipLinesCount * 12);
    doc.setFillColor(250, 250, 250);
    doc.rect(40, yPos, 532, dipBoxHeight, 'F');
    doc.setDrawColor(...lightGray);
    doc.setLineWidth(1);
    doc.rect(40, yPos, 532, dipBoxHeight, 'S');

    yPos += 18;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...black);
    doc.text('DIPS', 50, yPos);
    yPos += 15;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    prep.dips.forEach(dip => {
      doc.text(`[ ] ${dip.qty}x 16oz ${toTitleCase(dip.name)} (garnish) - 1 small spoon`, 50, yPos); yPos += 11;

      const hasVeggies = dip.modifiers.some(m => m.name && (m.name.includes('VEGGIES') || m.name.includes('VEGGIE')));
      const hasPita = dip.modifiers.some(m => m.name && m.name.includes('PITA') && !m.name.includes('GLUTEN FREE'));
      const gfPitaMod = dip.modifiers.find(m => m.name && m.name.includes('GLUTEN FREE PITA'));
      const hasGFPita = !!gfPitaMod;

      doc.setTextColor(...darkGray);
      if (hasVeggies) {
        doc.text(`    - ${dip.qty * 24} carrots + ${dip.qty * 24} celery (brown bowls) - 2 tongs total`, 56, yPos); yPos += 11;
      }
      if (hasPita) {
        const regularPitaHalfPans = dip.qty; // 1 half pan per dip (6 pitas sliced)
        doc.text(`    - ${dip.qty * 6} pitas sliced 8 pieces (${formatPanCount(regularPitaHalfPans)}) - 1 tong`, 56, yPos); yPos += 11;
      }
      if (hasGFPita && gfPitaMod) {
        // GF pita is an ADDON - only prep exactly what customer paid for (no defaults!)
        // Try to parse from modifier name, or check if there's a price/amount field
        let gfQty = gfPitaMod.gfPitaQty;

        // If parsing from name failed, try to parse from the modifier object directly
        if (!gfQty && gfPitaMod.name) {
          const priceMatch = gfPitaMod.name.match(/\$(\d+(?:\.\d+)?)/);
          if (priceMatch) {
            const totalPrice = parseFloat(priceMatch[1]);
            gfQty = Math.round(totalPrice / 2); // $2 per GF pita
          }
        }

        if (gfQty && gfQty > 0) {
          const gfPitaHalfPans = Math.ceil(gfQty / 6);
          doc.text(`    - ${gfQty} GF pitas sliced 8 pieces (${formatPanCount(gfPitaHalfPans)}) - 1 tong`, 56, yPos); yPos += 11;
        } else {
          // Parsing failed - show manual entry needed
          doc.text(`    - GF Pitas (CHECK ORDER FOR QUANTITY) - 1 tong`, 56, yPos); yPos += 11;
        }
      }
      doc.setTextColor(...black);
      yPos += 2;
    });
    yPos += 6;
  }

  // GREEK FRIES BAR
  if (prep.greekFries.length > 0 && yPos < 700) {
    const friesBoxHeight = 40 + (prep.greekFries.length * 26);
    doc.setFillColor(250, 250, 250);
    doc.rect(40, yPos, 532, friesBoxHeight, 'F');
    doc.setDrawColor(...lightGray);
    doc.setLineWidth(1);
    doc.rect(40, yPos, 532, friesBoxHeight, 'S');

    yPos += 18;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...black);
    doc.text('GREEK FRIES BAR', 50, yPos);
    yPos += 15;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    prep.greekFries.forEach(fries => {
      // Greek fries: 1 half pan if qty < 2, or 2 half pans per order if >= 2
      const friesHalfPans = fries.qty < 2 ? fries.qty : fries.qty * 2;
      doc.text(`[ ] ${fries.qty}x ${toTitleCase(fries.name)} - 1 tong`, 50, yPos); yPos += 11;
      doc.setTextColor(...darkGray);
      doc.text(`    - ${formatPanCount(friesHalfPans)} fries + 16oz Aioli + 16oz Tzatziki + 16oz Feta`, 56, yPos); yPos += 11;
      doc.text(`    - 3 small spoons (Aioli, Tzatziki, Feta)`, 56, yPos);
      doc.setTextColor(...black);
      yPos += 13;
    });
    yPos += 6;
  }

  // DOLMAS
  if (prep.dolmas.length > 0 && yPos < 700) {
    const dolmasBoxHeight = 40 + (prep.dolmas.length * 24);
    doc.setFillColor(250, 250, 250);
    doc.rect(40, yPos, 532, dolmasBoxHeight, 'F');
    doc.setDrawColor(...lightGray);
    doc.setLineWidth(1);
    doc.rect(40, yPos, 532, dolmasBoxHeight, 'S');

    yPos += 18;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...black);
    doc.text('DOLMAS', 50, yPos);
    yPos += 15;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    prep.dolmas.forEach(dolma => {
      if (yPos < 720) {
        doc.text(`[ ] ${dolma.qty}x ${toTitleCase(dolma.name)} (1/2 pan or round tray + lemon wedges) - 1 tong`, 50, yPos); yPos += 11;
        doc.setTextColor(...darkGray);
        doc.text(`    - ${dolma.qty}x 16oz Tzatziki (dill stripe) - 1 small spoon`, 56, yPos);
        doc.setTextColor(...black);
        yPos += 13;
      }
    });
    yPos += 6;
  }

  // SPANAKOPITA
  if (prep.spanakopita.length > 0 && yPos < 700) {
    const spanBoxHeight = 40 + (prep.spanakopita.length * 24);
    doc.setFillColor(250, 250, 250);
    doc.rect(40, yPos, 532, spanBoxHeight, 'F');
    doc.setDrawColor(...lightGray);
    doc.setLineWidth(1);
    doc.rect(40, yPos, 532, spanBoxHeight, 'S');

    yPos += 18;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...black);
    doc.text('SPANAKOPITA', 50, yPos);
    yPos += 15;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    prep.spanakopita.forEach(span => {
      if (yPos < 720) {
        doc.text(`[ ] ${span.qty}x ${toTitleCase(span.name)} (round tray on arugula or 1/2/full pan) - 1 tong`, 50, yPos); yPos += 11;
        doc.setTextColor(...darkGray);
        doc.text(`    - ${span.qty}x 16oz Tzatziki (dill stripe) - 1 small spoon`, 56, yPos);
        doc.setTextColor(...black);
        yPos += 13;
      }
    });
    yPos += 6;
  }

  // SIDES
  if (prep.sides.length > 0 && yPos < 700) {
    const sidesBoxHeight = 40 + (prep.sides.length * 13);
    doc.setFillColor(250, 250, 250);
    doc.rect(40, yPos, 532, sidesBoxHeight, 'F');
    doc.setDrawColor(...lightGray);
    doc.setLineWidth(1);
    doc.rect(40, yPos, 532, sidesBoxHeight, 'S');

    yPos += 18;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...black);
    doc.text('SIDES', 50, yPos);
    yPos += 15;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    prep.sides.forEach(side => {
      if (yPos < 720) {
        const sideName = (side.name || '');
        const isRice = sideName.toUpperCase().includes('RICE');
        doc.text(`[ ] ${side.qty}x ${toTitleCase(sideName)} - 1 tong${isRice ? ' + 1 large serving spoon' : ''}`, 50, yPos); yPos += 12;
      }
    });
    yPos += 6;
  }

  // DESSERTS
  if (prep.desserts.length > 0 && yPos < 700) {
    const dessertsBoxHeight = 40 + (prep.desserts.length * 13);
    doc.setFillColor(250, 250, 250);
    doc.rect(40, yPos, 532, dessertsBoxHeight, 'F');
    doc.setDrawColor(...lightGray);
    doc.setLineWidth(1);
    doc.rect(40, yPos, 532, dessertsBoxHeight, 'S');

    yPos += 18;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...black);
    doc.text('DESSERTS', 50, yPos);
    yPos += 15;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    prep.desserts.forEach(dessert => {
      if (yPos < 720) {
        doc.text(`[ ] ${dessert.qty}x ${toTitleCase(dessert.name)} - 1 tong`, 50, yPos); yPos += 12;
      }
    });
    yPos += 6;
  }

  // PINWHEELS
  if (prep.pinwheels.length > 0 && yPos < 700) {
    const pinwheelsBoxHeight = 40 + (prep.pinwheels.length * 13);
    doc.setFillColor(250, 250, 250);
    doc.rect(40, yPos, 532, pinwheelsBoxHeight, 'F');
    doc.setDrawColor(...lightGray);
    doc.setLineWidth(1);
    doc.rect(40, yPos, 532, pinwheelsBoxHeight, 'S');

    yPos += 18;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...black);
    doc.text('PINWHEELS', 50, yPos);
    yPos += 15;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    prep.pinwheels.forEach(pinwheel => {
      if (yPos < 720) {
        doc.text(`[ ] ${pinwheel.qty}x ${toTitleCase(pinwheel.name)} - 1 tong`, 50, yPos); yPos += 12;
      }
    });
    yPos += 6;
  }

  // SPECIAL NOTES
  if (order.delivery_notes && yPos < 680) {
    yPos += 25;  // Extra spacing before special notes section
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...black);
    doc.text('SPECIAL NOTES:', 40, yPos);
    yPos += 14;

    // Simple notes text without background box
    const noteLines = doc.splitTextToSize(order.delivery_notes, 520);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    noteLines.forEach((line, idx) => {
      if (idx < 5 && yPos < 750) {  // Limit to 5 lines
        doc.text(line, 40, yPos);
        yPos += 13;
      }
    });
    yPos += 10;
  }

  // HANDWRITTEN NOTES SECTION
  if (yPos < 700) {
    yPos += 8;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...black);
    doc.text('PREP NOTES:', 40, yPos);
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
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...black);
  doc.text(`Generated: ${formatPacificDateTime(new Date())} PST`, 40, 782);

  // Convert to base64
  return doc.output('datauristring').split(',')[1];
}
