/**
 * Vercel Serverless Function: Print 3-Inch Round Labels to Epson Printer
 * Generates formatted 3" round labels PDF (6 per page: 2 columns x 3 rows)
 * and sends via Gmail to Epson printer
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
 */
function formatPacificDateShort(dateStr) {
  if (!dateStr) return 'N/A';
  const [year, month, day] = dateStr.split('-').map(Number);
  const utcDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const formatted = new Intl.DateTimeFormat('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: '2-digit',
    timeZone: 'America/Los_Angeles'
  }).format(utcDate);
  return formatted.replace(/\//g, ''); // Remove slashes: 11/14/25 -> 111425
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

    console.log(`${downloadMode ? '📥' : '🖨️'} Generating 3" labels for order ${order_id}...`);

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

    // Generate labels
    const labels = generateLabelsFromPrep(prep, order);
    const ingredientLabels = generateIngredientLabels(labels);

    if (labels.length === 0 && ingredientLabels.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No labels to generate for this order'
      });
    }

    // Generate PDF with 3-inch round labels
    const pdfBase64 = generate3InchLabelsPDF(labels, ingredientLabels, order);

    // Filename
    const orderNum = order.order_number || order.id;
    const filename = `3Inch_Labels_${order.source_system}_${orderNum}_${new Date().toISOString().split('T')[0]}.pdf`;

    // DOWNLOAD MODE: Return PDF as blob for download
    if (downloadMode) {
      console.log(`✅ 3" labels PDF generated for download (${labels.length} item labels + ${ingredientLabels.length} ingredient labels)`);

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
      subject: `Print: 3" Labels - Order #${orderNum}`,
      text: '',  // Empty text body - only print PDF attachment
      html: '',  // Empty HTML body - only print PDF attachment
      attachments: [{
        filename: filename,
        content: Buffer.from(pdfBase64, 'base64'),
        contentType: 'application/pdf'
      }]
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ 3" labels sent to printer:`, info.messageId);

    return res.status(200).json({
      success: true,
      message: '3" labels sent to printer successfully',
      messageId: info.messageId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Print 3" labels error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to print 3" labels',
      details: error.message
    });
  }
}

/**
 * Generate 3-inch round labels PDF
 * Layout: 2 columns x 3 rows = 6 labels per page
 * Page: 8.5" x 11" (612pt x 792pt)
 * Label: 3" diameter (216pt)
 * Font: BOLD, ALL CAPS, IMPACT STYLE
 */
function generate3InchLabelsPDF(labels, ingredientLabels, order) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });

  // Label positioning constants
  const LABEL_DIAMETER = 216; // 3 inches = 216pt
  const LABEL_RADIUS = 108;

  // Column centers (2 columns)
  const COL_1_X = 168; // Left column center
  const COL_2_X = 444; // Right column center

  // Row centers (3 rows)
  const ROW_1_Y = 144; // Top row center
  const ROW_2_Y = 396; // Middle row center
  const ROW_3_Y = 648; // Bottom row center

  // 6 label positions per page
  const positions = [
    { x: COL_1_X, y: ROW_1_Y }, // Top left
    { x: COL_2_X, y: ROW_1_Y }, // Top right
    { x: COL_1_X, y: ROW_2_Y }, // Middle left
    { x: COL_2_X, y: ROW_2_Y }, // Middle right
    { x: COL_1_X, y: ROW_3_Y }, // Bottom left
    { x: COL_2_X, y: ROW_3_Y }  // Bottom right
  ];

  let labelIndex = 0;
  let pageStarted = false;

  // Helper: Add label to PDF
  const addLabel = (label, isIngredient = false) => {
    // Start new page if needed
    if (labelIndex > 0 && labelIndex % 6 === 0) {
      doc.addPage();
      pageStarted = false;
    }

    if (!pageStarted) {
      pageStarted = true;
    }

    const pos = positions[labelIndex % 6];
    const centerX = pos.x;
    const centerY = pos.y;

    // Draw circle outline for alignment (very light gray)
    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(0.5);
    doc.circle(centerX, centerY, LABEL_RADIUS, 'S');

    if (isIngredient) {
      // ========== INGREDIENT LABEL ==========
      // Top tagline (3 lines) - BOLD ALL CAPS
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(100, 100, 100);
      doc.text('MADE WITH LOVE', centerX, centerY - 85, { align: 'center' });
      doc.text('BY YOUR FRIENDS', centerX, centerY - 76, { align: 'center' });
      doc.text('AT JAYNA 💙', centerX, centerY - 67, { align: 'center' });

      // Item name (big, center, BOLD ALL CAPS)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.setTextColor(0, 0, 0);

      // Wrap text if too long
      const itemText = (label.item || '').toUpperCase();
      const maxWidth = LABEL_DIAMETER - 40;
      const wrappedItem = doc.splitTextToSize(itemText, maxWidth);

      // Calculate starting Y position for centered multiline text
      const lineHeight = 22;
      const totalHeight = wrappedItem.length * lineHeight;
      let itemY = centerY - (totalHeight / 2) + 10;

      // Adjust font size if text is too long
      if (wrappedItem.length > 2) {
        doc.setFontSize(16);
        itemY = centerY - 20;
      }

      wrappedItem.forEach((line) => {
        doc.text(line, centerX, itemY, { align: 'center' });
        itemY += (doc.internal.getFontSize() * 1.15);
      });

      // Ingredients (smaller, below item name, NORMAL weight but still caps)
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(60, 60, 60);

      const ingredientsText = (label.ingredients || '').toUpperCase();
      const wrappedIngredients = doc.splitTextToSize(ingredientsText, maxWidth);

      let ingredientsY = centerY + 35;
      wrappedIngredients.forEach((line) => {
        if (ingredientsY < centerY + LABEL_RADIUS - 10) { // Stay within label bounds
          doc.text(line, centerX, ingredientsY, { align: 'center' });
          ingredientsY += 9;
        }
      });

    } else {
      // ========== REGULAR ITEM LABEL ==========
      // Top tagline (3 lines) - BOLD ALL CAPS
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(100, 100, 100);
      doc.text('MADE WITH LOVE', centerX, centerY - 85, { align: 'center' });
      doc.text('BY YOUR FRIENDS', centerX, centerY - 76, { align: 'center' });
      doc.text('AT JAYNA 💙', centerX, centerY - 67, { align: 'center' });

      // Item name (big, center, BOLD ALL CAPS)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(24);
      doc.setTextColor(0, 0, 0);

      // Wrap text if too long
      const itemText = (label.item || '').toUpperCase();
      const maxWidth = LABEL_DIAMETER - 40;
      const wrappedItem = doc.splitTextToSize(itemText, maxWidth);

      // Calculate starting Y position for centered multiline text
      let lineHeight = 26;
      const totalHeight = wrappedItem.length * lineHeight;
      let itemY = centerY - (totalHeight / 2) + 5;

      // Adjust font size if text is too long
      if (wrappedItem.length > 2) {
        doc.setFontSize(18);
        lineHeight = 20;
        itemY = centerY - 25;
      } else if (wrappedItem.length > 1) {
        doc.setFontSize(20);
        lineHeight = 22;
        itemY = centerY - 15;
      }

      wrappedItem.forEach((line) => {
        doc.text(line, centerX, itemY, { align: 'center' });
        itemY += lineHeight;
      });

      // Quantity (smaller, below item name, BOLD ALL CAPS)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
      const qtyText = (label.qty || '').toUpperCase();
      doc.text(qtyText, centerX, centerY + 40, { align: 'center' });

      // Customer name and date (bottom, small, BOLD ALL CAPS)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(80, 80, 80);

      const customerName = (order.customer_name || '').toUpperCase();
      doc.text(customerName, centerX, centerY + 80, { align: 'center' });

      const dateStr = formatPacificDateShort(order.delivery_date);
      doc.text(dateStr, centerX, centerY + 90, { align: 'center' });
    }

    labelIndex++;
  };

  // Add all regular item labels
  labels.forEach(label => addLabel(label, false));

  // Add all ingredient labels
  ingredientLabels.forEach(label => addLabel(label, true));

  // Convert to base64
  return doc.output('datauristring').split(',')[1];
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
      itemMap.get(key).qty += item.qty;
    } else {
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

    // BYO GYRO PITAS
    if (itemName.includes('MAKE YOUR OWN') || itemName.includes('BYO')) {
      prep.byoGyros.total += qty;
      prep.byoGyros.items.push({ name: item.item_name, qty });
    }
    // SALADS
    else if (itemName.includes('SALAD')) {
      prep.salads.push({ name: item.item_name, qty, modifiers });
    }
    // DIPS
    else if (itemName.includes('HUMMUS') || itemName.includes('BABA GHANOUSH') || itemName.includes('BABA GANOUSH') || itemName.includes('TZATZIKI')) {
      prep.dips.push({ name: item.item_name, qty, modifiers });
    }
    // GREEK FRIES BAR
    else if (itemName.includes('GREEK FRIES BAR')) {
      prep.greekFries.push({ name: item.item_name, qty, modifiers });
    }
    // DOLMAS
    else if (itemName.includes('DOLMAS')) {
      prep.dolmas.push({ name: item.item_name, qty, modifiers });
    }
    // SPANAKOPITA
    else if (itemName.includes('SPANAKOPITA')) {
      prep.spanakopita.push({ name: item.item_name, qty, modifiers });
    }
    // SIDES
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

  // Consolidate duplicates
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
 * Map old label names to new ALL CAPS names
 */
function getLabelName(currentName) {
  const nameMap = {
    'Tzatziki Sauce': 'TZATZIKI',
    'Spicy Aioli Sauce': 'SPICY AIOLI',
    'Lemon Vinaigrette': 'LEMON VINAIGRETTE',
    'Mixed Greens': 'MIXED GREENS',
    'Diced Tomatoes': 'DICED TOMATOES',
    'Sliced Red Onion': 'RED ONIONS',
    'Whole Pepperoncini': 'PEPPERONCINI',
    'Grilled Pita Bread': 'GRILLED PITA',
    'Hummus': 'HUMMUS',
    'Tzatziki': 'TZATZIKI',
    'Baba Ganoush': 'BABA GANOUSH',
    'Baba Ghanoush': 'BABA GANOUSH'
  };

  return nameMap[currentName] || currentName.toUpperCase();
}

/**
 * Calculate protein pans from BYO items
 */
function calculateProteinPans(byoItems) {
  const proteins = {};

  byoItems.forEach(item => {
    const itemName = (item.name || '').toUpperCase();
    const qty = parseFloat(item.qty || 0);

    let proteinKey = null;
    let proteinName = null;

    if (itemName.includes('BEEF') && (itemName.includes('LAMB') || itemName.includes('&'))) {
      proteinKey = 'BEEF_LAMB';
      proteinName = 'BEEF & LAMB GYRO MEAT';
    } else if (itemName.includes('CHICKEN')) {
      proteinKey = 'CHICKEN';
      proteinName = 'CHICKEN GYRO MEAT';
    } else if (itemName.includes('FALAFEL')) {
      proteinKey = 'FALAFEL';
      proteinName = 'FALAFEL';
    } else if (itemName.includes('ROASTED') && itemName.includes('CHICKPEA')) {
      proteinKey = 'ROASTED_CHICKPEAS';
      proteinName = 'ROASTED CHICKPEAS';
    }

    if (proteinKey) {
      if (!proteins[proteinKey]) {
        proteins[proteinKey] = { name: proteinName, qty: 0 };
      }
      proteins[proteinKey].qty += qty;
    }
  });

  // Calculate container types
  const proteinPrep = [];
  Object.values(proteins).forEach(protein => {
    const qty = protein.qty;
    let containerType = '';

    if (qty < 5) {
      containerType = 'BROWN BOWLS';
    } else if (qty <= 20) {
      containerType = '1 HALF PAN';
    } else {
      const halfPansNeeded = Math.ceil(qty / 10);
      const fullPans = Math.floor(halfPansNeeded / 2);
      const remainingHalfPans = halfPansNeeded % 2;

      if (fullPans > 0 && remainingHalfPans > 0) {
        containerType = `${fullPans} FULL PAN${fullPans > 1 ? 'S' : ''} + 1 HALF PAN`;
      } else if (fullPans > 0) {
        containerType = `${fullPans} FULL PAN${fullPans > 1 ? 'S' : ''}`;
      } else {
        containerType = '1 HALF PAN';
      }
    }

    proteinPrep.push({
      name: protein.name,
      container: containerType
    });
  });

  return proteinPrep;
}

/**
 * Generate labels from prep list
 */
function generateLabelsFromPrep(prep, order) {
  const labels = [];

  // BYO GYROS
  if (prep.byoGyros.total > 0) {
    const sets = Math.ceil(prep.byoGyros.total / 10);

    // Protein labels
    const proteinPans = calculateProteinPans(prep.byoGyros.items || []);
    proteinPans.forEach(protein => {
      labels.push({
        item: getLabelName(protein.name),
        qty: protein.container
      });
    });

    // Sauce containers
    for (let i = 1; i <= sets; i++) {
      labels.push({
        item: getLabelName('Tzatziki Sauce'),
        qty: sets > 1 ? `16OZ DELI - ${i} OF ${sets}` : `16OZ DELI`
      });
      labels.push({
        item: getLabelName('Spicy Aioli Sauce'),
        qty: sets > 1 ? `16OZ DELI - ${i} OF ${sets}` : `16OZ DELI`
      });
      labels.push({
        item: getLabelName('Lemon Vinaigrette'),
        qty: sets > 1 ? `16OZ DELI - ${i} OF ${sets}` : `16OZ DELI`
      });
    }

    // Mixed Greens
    const greensSets = Math.ceil(prep.byoGyros.total / 15);
    for (let i = 1; i <= greensSets; i++) {
      labels.push({
        item: getLabelName('Mixed Greens'),
        qty: greensSets > 1 ? `HALF PAN - ${i} OF ${greensSets}` : `HALF PAN`
      });
    }

    // Toppings
    labels.push({ item: getLabelName('Diced Tomatoes'), qty: 'AS NEEDED' });
    labels.push({ item: getLabelName('Sliced Red Onion'), qty: 'AS NEEDED' });
    labels.push({ item: getLabelName('Whole Pepperoncini'), qty: 'AS NEEDED' });
    labels.push({ item: getLabelName('Grilled Pita Bread'), qty: 'AS NEEDED' });
  }

  // SALADS
  prep.salads.forEach(salad => {
    labels.push({
      item: salad.name.toUpperCase(),
      qty: `${salad.qty}X`
    });
  });

  // DIPS
  prep.dips.forEach(dip => {
    labels.push({
      item: getLabelName(dip.name),
      qty: `${dip.qty}X 16OZ DELI`
    });
  });

  // GREEK FRIES BAR
  prep.greekFries.forEach(fries => {
    labels.push({
      item: fries.name.toUpperCase(),
      qty: `${fries.qty}X`
    });
  });

  // DOLMAS
  prep.dolmas.forEach(dolma => {
    labels.push({
      item: dolma.name.toUpperCase(),
      qty: `${dolma.qty}X`
    });
  });

  // SPANAKOPITA
  prep.spanakopita.forEach(span => {
    labels.push({
      item: span.name.toUpperCase(),
      qty: `${span.qty}X`
    });
  });

  // SIDES
  prep.sides.forEach(side => {
    labels.push({
      item: side.name.toUpperCase(),
      qty: `${side.qty}X`
    });
  });

  // DESSERTS
  prep.desserts.forEach(dessert => {
    labels.push({
      item: dessert.name.toUpperCase(),
      qty: `${dessert.qty}X`
    });
  });

  // PINWHEELS
  prep.pinwheels.forEach(pinwheel => {
    labels.push({
      item: pinwheel.name.toUpperCase(),
      qty: `${pinwheel.qty}X`
    });
  });

  return labels;
}

/**
 * Generate ingredient labels for sauces
 * Only creates labels for items with ingredient mappings
 */
function generateIngredientLabels(labels) {
  const ingredientMapping = {
    'TZATZIKI': 'Yogurt, kefir cheese, mint, garlic, cucumber, salt.',
    'SPICY AIOLI': 'Mayonnaise, crushed red pepper, garlic powder, cayenne, lemon, pepperoncini',
    'LEMON VINAIGRETTE': 'Whole grain mustard, shallots, lemon, black pepper, salt, olive oil.',
    'HUMMUS': 'Garbanzo beans, dill, garlic, lemon, salt, cumin, tahini, olive oil.',
    'BABA GANOUSH': 'Charred Eggplant, kefir cheese, tahini, lemon, garlic, olive oil, allepo pepper, parsley.'
  };

  const ingredientLabels = [];
  const addedIngredients = new Set(); // Track to avoid duplicates

  labels.forEach(label => {
    const itemName = String(label.item || '').toUpperCase();

    // Check if this label contains any of the tracked sauces
    for (const [sauceName, ingredients] of Object.entries(ingredientMapping)) {
      if (itemName.includes(sauceName) && !addedIngredients.has(sauceName)) {
        ingredientLabels.push({
          item: sauceName,
          ingredients: ingredients
        });
        addedIngredients.add(sauceName);
      }
    }
  });

  return ingredientLabels;
}
