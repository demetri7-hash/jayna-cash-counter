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
  return formatted; // Keep slashes: 11/14/25
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

    // SORT LABELS: Group similar items together (e.g., all TZATZIKI labels consecutive)
    labels.sort((a, b) => {
      const itemA = (a.item || '').toUpperCase();
      const itemB = (b.item || '').toUpperCase();

      // Extract base item name (remove container info like "- 1 OF 3")
      const baseA = itemA.split(' - ')[0].split(',')[0].trim();
      const baseB = itemB.split(' - ')[0].split(',')[0].trim();

      // Sort alphabetically by base item name
      return baseA.localeCompare(baseB);
    });

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
      const totalLabels = labels.length + ingredientLabels.length;
      const pageCount = Math.ceil(totalLabels / 6); // 6 labels per page

      console.log(`✅ 3" labels PDF generated for download (${labels.length} item labels + ${ingredientLabels.length} ingredient labels = ${totalLabels} total, ${pageCount} pages)`);

      const pdfBuffer = Buffer.from(pdfBase64, 'base64');

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);

      // Add custom headers for page count and label counts
      res.setHeader('X-Page-Count', pageCount.toString());
      res.setHeader('X-Total-Labels', totalLabels.toString());
      res.setHeader('X-Item-Labels', labels.length.toString());
      res.setHeader('X-Ingredient-Labels', ingredientLabels.length.toString());

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
 * Draw a blue heart shape at the specified position
 * @param {object} doc - jsPDF document instance
 * @param {number} x - X coordinate (center)
 * @param {number} y - Y coordinate (top of heart)
 * @param {number} size - Size of heart (default 5pt)
 */
function drawBlueHeart(doc, x, y, size = 5) {
  const halfWidth = size * 0.5;
  const height = size * 0.9;

  // Save current state
  const currentColor = doc.getFillColor();

  // Set blue color (RGB: 59, 130, 246 = #3b82f6)
  doc.setFillColor(59, 130, 246);

  // Draw heart using bezier curves
  // Left lobe
  doc.circle(x - halfWidth * 0.5, y + halfWidth * 0.5, halfWidth * 0.65, 'F');
  // Right lobe
  doc.circle(x + halfWidth * 0.5, y + halfWidth * 0.5, halfWidth * 0.65, 'F');

  // Bottom triangle
  doc.triangle(
    x - halfWidth * 1.1, y + halfWidth * 0.4,  // Left point
    x + halfWidth * 1.1, y + halfWidth * 0.4,  // Right point
    x, y + height,                              // Bottom point
    'F'
  );

  // Restore previous fill color
  doc.setFillColor(currentColor);
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
  const COL_1_X = 154; // Left column center (adjusted 14pt right from 140)
  const COL_2_X = 452; // Right column center (adjusted 6pt left from 458)

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

    // Circle outline removed per user request - no border needed

    if (isIngredient) {
      // ========== INGREDIENT LABEL ==========
      // Top tagline (3 lines) - BOLD ALL CAPS
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(100, 100, 100);
      doc.text('MADE WITH LOVE', centerX, centerY - 85, { align: 'center' });
      doc.text('BY YOUR FRIENDS', centerX, centerY - 76, { align: 'center' });
      doc.text('AT JAYNA GYRO', centerX, centerY - 67, { align: 'center' });

      // Draw blue heart after "AT JAYNA GYRO"
      const gyroText = 'AT JAYNA GYRO';
      const gyroTextWidth = doc.getTextWidth(gyroText);
      const heartX = centerX + (gyroTextWidth / 2) + 4; // 4pt spacing after text
      const heartY = centerY - 67 - 3; // Align with text baseline
      drawBlueHeart(doc, heartX, heartY, 5);

      // Website and phone (ingredient labels only, same style as tagline)
      doc.text('www.jaynagyro.com', centerX, centerY - 58, { align: 'center' });
      doc.text('(916) 898-2708', centerX, centerY - 49, { align: 'center' });

      // Item name (big, center, BOLD ALL CAPS)
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);

      const itemText = (label.item || '').toUpperCase();
      const maxWidth = LABEL_DIAMETER - 40;

      // Dynamic font sizing - scale down to fit without breaking words
      let fontSize = 20;
      let wrappedLines = [];

      // Keep reducing font size until text fits without breaking words mid-line
      while (fontSize >= 12) {
        doc.setFontSize(fontSize);

        // Split ONLY on spaces (preserve whole words)
        const words = itemText.split(' ');
        wrappedLines = [];
        let currentLine = '';

        words.forEach((word, idx) => {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          const testWidth = doc.getTextWidth(testLine);

          if (testWidth <= maxWidth) {
            currentLine = testLine;
          } else {
            if (currentLine) wrappedLines.push(currentLine);
            currentLine = word;
          }
        });

        if (currentLine) wrappedLines.push(currentLine);

        // Check if any single word is too wide
        const maxLineWidth = Math.max(...wrappedLines.map(line => doc.getTextWidth(line)));

        if (maxLineWidth <= maxWidth && wrappedLines.length <= 3) {
          break; // Found a font size that fits!
        }

        fontSize -= 2; // Reduce and try again
      }

      // Calculate starting Y position for centered multiline text
      const lineHeight = fontSize * 1.1;
      const totalHeight = wrappedLines.length * lineHeight;
      let itemY = centerY - (totalHeight / 2) + 10;

      wrappedLines.forEach((line) => {
        doc.text(line, centerX, itemY, { align: 'center' });
        itemY += lineHeight;
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
      doc.text('AT JAYNA GYRO', centerX, centerY - 67, { align: 'center' });

      // Draw blue heart after "AT JAYNA GYRO"
      const gyroText = 'AT JAYNA GYRO';
      const gyroTextWidth = doc.getTextWidth(gyroText);
      const heartX = centerX + (gyroTextWidth / 2) + 4; // 4pt spacing after text
      const heartY = centerY - 67 - 3; // Align with text baseline
      drawBlueHeart(doc, heartX, heartY, 5);

      // Item name (big, center, BOLD ALL CAPS)
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);

      const itemText = (label.item || '').toUpperCase();
      const maxWidth = LABEL_DIAMETER - 40;

      // Dynamic font sizing - scale down to fit without breaking words
      let fontSize = 24;
      let textWidth = 0;
      let wrappedLines = [];

      // Keep reducing font size until text fits without breaking words mid-line
      while (fontSize >= 12) {
        doc.setFontSize(fontSize);

        // Split ONLY on spaces (preserve whole words)
        const words = itemText.split(' ');
        wrappedLines = [];
        let currentLine = '';

        words.forEach((word, idx) => {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          const testWidth = doc.getTextWidth(testLine);

          if (testWidth <= maxWidth) {
            currentLine = testLine;
          } else {
            if (currentLine) wrappedLines.push(currentLine);
            currentLine = word;
          }
        });

        if (currentLine) wrappedLines.push(currentLine);

        // Check if any single word is too wide
        const maxLineWidth = Math.max(...wrappedLines.map(line => doc.getTextWidth(line)));

        if (maxLineWidth <= maxWidth && wrappedLines.length <= 3) {
          break; // Found a font size that fits!
        }

        fontSize -= 2; // Reduce and try again
      }

      // Calculate starting Y position for centered multiline text
      const lineHeight = fontSize * 1.1;
      const totalHeight = wrappedLines.length * lineHeight;
      let itemY = centerY - (totalHeight / 2) + (fontSize * 0.3);

      wrappedLines.forEach((line) => {
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
 * Convert half pans to full pans when possible
 * 2 half pans → 1 full pan
 * 3 half pans → 1 full pan + 1 half pan
 * etc.
 */
function convertHalfPansToFullPans(halfPanCount) {
  const fullPans = Math.floor(halfPanCount / 2);
  const remainingHalfPans = halfPanCount % 2;

  const pans = [];

  // Add full pans
  for (let i = 1; i <= fullPans; i++) {
    pans.push({ type: 'FULL PAN', index: i, total: fullPans + remainingHalfPans });
  }

  // Add remaining half pan if any
  if (remainingHalfPans > 0) {
    pans.push({ type: 'HALF PAN', index: fullPans + 1, total: fullPans + remainingHalfPans });
  }

  return pans;
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
      qty: protein.qty,
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

  // BYO GYROS - COPIED FROM WORKING exportLabelsCSV
  if (prep.byoGyros.total > 0) {
    const sets = Math.ceil(prep.byoGyros.total / 10);
    const greensSets = Math.ceil(prep.byoGyros.total / 15);

    // === PROTEIN LABELS (COPIED FROM EXPORT LABELS) ===
    const proteinPans = calculateProteinPans(prep.byoGyros.items || []);
    proteinPans.forEach(protein => {
      // Extract container type for label
      let containerLabel = '';
      if (protein.container.includes('BROWN BOWLS')) {
        containerLabel = 'BROWN BOWLS';
      } else if (protein.container.includes('HALF PAN')) {
        containerLabel = protein.container;
      } else if (protein.container.includes('FULL PAN')) {
        containerLabel = protein.container;
      }

      // Parse container string to count total pans for duplicate labels
      let totalPans = 0;
      const fullPanMatch = protein.container.match(/(\d+)\s*FULL\s*PAN/i);
      if (fullPanMatch) totalPans += parseInt(fullPanMatch[1]);
      const halfPanMatch = protein.container.match(/(\d+)\s*HALF\s*PAN/i);
      if (halfPanMatch) totalPans += parseInt(halfPanMatch[1]);
      if (protein.container.includes('BROWN BOWLS')) totalPans = 1;
      const labelsToGenerate = Math.max(1, totalPans);

      // Generate one label per pan (all identical)
      for (let i = 0; i < labelsToGenerate; i++) {
        labels.push({
          item: protein.name,
          qty: `${protein.qty} PORTIONS, ${containerLabel}`
        });
      }
    });

    // Sauce containers
    for (let i = 1; i <= sets; i++) {
      labels.push({
        item: getLabelName('Tzatziki Sauce'),
        qty: sets > 1 ? `16OZ DELI - ${i} OF ${sets}` : `16OZ DELI - 1 OF 1`
      });
      labels.push({
        item: getLabelName('Spicy Aioli Sauce'),
        qty: sets > 1 ? `16OZ DELI - ${i} OF ${sets}` : `16OZ DELI - 1 OF 1`
      });
      labels.push({
        item: getLabelName('Lemon Vinaigrette'),
        qty: sets > 1 ? `16OZ DELI - ${i} OF ${sets}` : `16OZ DELI - 1 OF 1`
      });
    }

    // Mixed Greens - Convert half pans to full pans (2 half = 1 full)
    const greensPans = convertHalfPansToFullPans(greensSets);
    greensPans.forEach(pan => {
      labels.push({
        item: getLabelName('Mixed Greens'),
        qty: `${pan.type} - ${pan.index} OF ${pan.total}`
      });
    });

    // === TOPPINGS (COPIED FROM EXPORT LABELS) ===
    // COORDINATED BROWN BOWL LOGIC
    let useBrownBowlForAllLabels = false;
    const tomatoNaturallyUsesBrownBowlLabels = (prep.byoGyros.total >= 10 && prep.byoGyros.total <= 25);
    const onionNaturallyUsesBrownBowlLabels = (prep.byoGyros.total >= 20 && prep.byoGyros.total <= 45);
    const pepperonciniNaturallyUses32ozLabels = (prep.byoGyros.total >= 10 && prep.byoGyros.total <= 30);

    if (tomatoNaturallyUsesBrownBowlLabels || onionNaturallyUsesBrownBowlLabels || pepperonciniNaturallyUses32ozLabels) {
      useBrownBowlForAllLabels = true;
    }

    // DICED TOMATOES
    if (useBrownBowlForAllLabels || (prep.byoGyros.total >= 10 && prep.byoGyros.total <= 25)) {
      // Brown bowl (single container)
      labels.push({
        item: getLabelName('Diced Tomatoes'),
        qty: 'BROWN BOWL - 1 OF 1'
      });
    } else if (prep.byoGyros.total < 10) {
      // 16oz deli (single container)
      labels.push({
        item: getLabelName('Diced Tomatoes'),
        qty: '16OZ DELI - 1 OF 1'
      });
    } else {
      // Multiple half pans - convert to full pans when possible
      const tomatoHalfPans = Math.ceil(prep.byoGyros.total / 50);
      const tomatoPans = convertHalfPansToFullPans(tomatoHalfPans);
      tomatoPans.forEach(pan => {
        labels.push({
          item: getLabelName('Diced Tomatoes'),
          qty: `${pan.type} - ${pan.index} OF ${pan.total}`
        });
      });
    }

    // SLICED RED ONION
    if (useBrownBowlForAllLabels || (prep.byoGyros.total >= 20 && prep.byoGyros.total <= 45)) {
      // Brown bowl (single container)
      labels.push({
        item: getLabelName('Sliced Red Onion'),
        qty: 'BROWN BOWL - 1 OF 1'
      });
    } else if (prep.byoGyros.total < 20) {
      // 16oz deli (single container)
      labels.push({
        item: getLabelName('Sliced Red Onion'),
        qty: '16OZ DELI - 1 OF 1'
      });
    } else {
      // Multiple half pans - convert to full pans when possible
      const onionHalfPans = Math.ceil(prep.byoGyros.total / 75);
      const onionPans = convertHalfPansToFullPans(onionHalfPans);
      onionPans.forEach(pan => {
        labels.push({
          item: getLabelName('Sliced Red Onion'),
          qty: `${pan.type} - ${pan.index} OF ${pan.total}`
        });
      });
    }

    // WHOLE PEPPERONCINI
    if (useBrownBowlForAllLabels || (prep.byoGyros.total >= 10 && prep.byoGyros.total <= 30)) {
      // Brown bowl or 32oz (single container)
      const containerType = useBrownBowlForAllLabels ? 'BROWN BOWL' : '32OZ DELI';
      labels.push({
        item: getLabelName('Whole Pepperoncini'),
        qty: `${containerType} - 1 OF 1`
      });
    } else if (prep.byoGyros.total < 10) {
      // 16oz deli (single container)
      labels.push({
        item: getLabelName('Whole Pepperoncini'),
        qty: '16OZ DELI - 1 OF 1'
      });
    } else if (prep.byoGyros.total < 100) {
      // 31-99: Single half pan
      labels.push({
        item: getLabelName('Whole Pepperoncini'),
        qty: 'HALF PAN - 1 OF 1'
      });
    } else {
      // 100+ portions: Generate full pan labels + half pan if remainder
      const pepperFullPans = Math.floor(prep.byoGyros.total / 100);
      const pepperRemainder = prep.byoGyros.total % 100;
      const totalPans = pepperFullPans + (pepperRemainder > 0 ? 1 : 0);

      for (let i = 1; i <= pepperFullPans; i++) {
        labels.push({
          item: getLabelName('Whole Pepperoncini'),
          qty: `FULL PAN - ${i} OF ${totalPans}`
        });
      }

      if (pepperRemainder > 0) {
        labels.push({
          item: getLabelName('Whole Pepperoncini'),
          qty: `HALF PAN - ${totalPans} OF ${totalPans}`
        });
      }
    }

    // WHOLE PITA (from BYO gyros) - FIXED to match prep sheet tiered logic
    const pitasNeeded = prep.byoGyros.total + Math.ceil(prep.byoGyros.total / 10);

    if (pitasNeeded >= 2 && pitasNeeded <= 12) {
      // 2-12: 1 half pan
      labels.push({
        item: 'WHOLE PITA',
        qty: 'HALF PAN - 1 OF 1'
      });
    } else if (pitasNeeded >= 13 && pitasNeeded <= 25) {
      // 13-25: 1 full pan
      labels.push({
        item: 'WHOLE PITA',
        qty: 'FULL PAN - 1 OF 1'
      });
    } else if (pitasNeeded >= 26) {
      // 26+: Multiple full pans with remainder logic
      const pitaFullPansNeeded = Math.floor(pitasNeeded / 25);
      const pitaRemainder = pitasNeeded % 25;

      if (pitaRemainder >= 2 && pitaRemainder <= 12) {
        // Full pans + 1 half pan
        for (let i = 1; i <= pitaFullPansNeeded; i++) {
          labels.push({
            item: 'WHOLE PITA',
            qty: `FULL PAN - ${i} OF ${pitaFullPansNeeded + 1}`
          });
        }
        labels.push({
          item: 'WHOLE PITA',
          qty: `HALF PAN - ${pitaFullPansNeeded + 1} OF ${pitaFullPansNeeded + 1}`
        });
      } else if (pitaRemainder >= 13 && pitaRemainder <= 25) {
        // All full pans
        const totalFullPans = pitaFullPansNeeded + 1;
        for (let i = 1; i <= totalFullPans; i++) {
          labels.push({
            item: 'WHOLE PITA',
            qty: totalFullPans > 1 ? `FULL PAN - ${i} OF ${totalFullPans}` : `FULL PAN - 1 OF 1`
          });
        }
      } else {
        // Just full pans (no remainder or remainder < 2)
        for (let i = 1; i <= pitaFullPansNeeded; i++) {
          labels.push({
            item: 'WHOLE PITA',
            qty: pitaFullPansNeeded > 1 ? `FULL PAN - ${i} OF ${pitaFullPansNeeded}` : `FULL PAN - 1 OF 1`
          });
        }
      }
    } else {
      // Less than 2 pitas (edge case)
      labels.push({
        item: 'WHOLE PITA',
        qty: 'INDIVIDUAL'
      });
    }
  }

  // SLICED PITA (from dips)
  if (prep.dips.length > 0) {
    let slicedPitaCount = 0;
    let slicedGFPitaCount = 0;

    prep.dips.forEach(dip => {
      const hasPita = dip.modifiers.some(m => m.name && m.name.includes('PITA') && !m.name.includes('GLUTEN FREE'));
      const gfPitaMod = dip.modifiers.find(m => m.name && m.name.includes('GLUTEN FREE PITA'));

      if (hasPita) {
        slicedPitaCount += dip.qty; // 1 half pan per dip = 1 label
      }
      if (gfPitaMod) {
        // Try to parse GF pita quantity from modifier
        let gfQty = 0;
        if (gfPitaMod.name) {
          const priceMatch = gfPitaMod.name.match(/\$(\d+(?:\.\d+)?)/);
          if (priceMatch) {
            const totalPrice = parseFloat(priceMatch[1]);
            gfQty = Math.round(totalPrice / 2); // $2 per GF pita
          }
        }
        if (gfQty > 0) {
          slicedGFPitaCount += Math.ceil(gfQty / 6); // 6 pitas per half pan
        }
      }
    });

    // Generate SLICED PITA labels
    for (let i = 1; i <= slicedPitaCount; i++) {
      labels.push({
        item: 'SLICED PITA',
        qty: slicedPitaCount > 1 ? `HALF PAN - ${i} OF ${slicedPitaCount}` : `HALF PAN - 1 OF 1`
      });
    }

    // Generate SLICED GF PITA labels
    for (let i = 1; i <= slicedGFPitaCount; i++) {
      labels.push({
        item: 'SLICED GF PITA',
        qty: slicedGFPitaCount > 1 ? `HALF PAN - ${i} OF ${slicedGFPitaCount}` : `HALF PAN - 1 OF 1`
      });
    }
  }

  // SALADS
  prep.salads.forEach(salad => {
    labels.push({
      item: salad.name.toUpperCase(),
      qty: `${salad.qty}X`
    });
  });

  // DIPS - Print 1 label per quantity (not 1 label with "2X")
  prep.dips.forEach(dip => {
    for (let i = 0; i < dip.qty; i++) {
      labels.push({
        item: getLabelName(dip.name),
        qty: `16OZ DELI`
      });
    }
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
 * Creates ONE ingredient label PER container/item label
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

  // Generate ONE ingredient label per item label (no duplicate prevention)
  labels.forEach(label => {
    const itemName = String(label.item || '').toUpperCase();

    // Check if this label contains any of the tracked sauces
    for (const [sauceName, ingredients] of Object.entries(ingredientMapping)) {
      if (itemName.includes(sauceName)) {
        // Generate ingredient label for THIS specific container
        ingredientLabels.push({
          item: sauceName,
          ingredients: ingredients
        });
        break; // Only match one sauce per label
      }
    }
  });

  return ingredientLabels;
}
