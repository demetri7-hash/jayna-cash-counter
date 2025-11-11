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
      doc.text('AT JAYNA GYRO \u2665', centerX, centerY - 67, { align: 'center' });

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
      doc.text('AT JAYNA GYRO \u2665', centerX, centerY - 67, { align: 'center' });

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

    // Mixed Greens
    const greensFullPans = Math.ceil(greensSets / 2);
    for (let i = 1; i <= greensFullPans; i++) {
      labels.push({
        item: getLabelName('Mixed Greens'),
        qty: greensFullPans > 1 ? `FULL PAN - ${i} OF ${greensFullPans}` : `FULL PAN - 1 OF 1`
      });
    }

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
    let tomatoContainerType = '';
    let tomatoContainerCount = 0;
    if (useBrownBowlForAllLabels) {
      tomatoContainerType = 'brown bowl';
      tomatoContainerCount = 1;
    } else if (prep.byoGyros.total < 10) {
      tomatoContainerType = '16oz deli';
      tomatoContainerCount = 1;
    } else if (prep.byoGyros.total <= 25) {
      tomatoContainerType = 'brown bowl';
      tomatoContainerCount = 1;
    } else {
      tomatoContainerType = 'half pan';
      tomatoContainerCount = Math.ceil(prep.byoGyros.total / 50);
    }
    for (let i = 1; i <= tomatoContainerCount; i++) {
      const containerLabel = tomatoContainerType.toUpperCase();
      labels.push({
        item: getLabelName('Diced Tomatoes'),
        qty: tomatoContainerCount > 1 ? `${containerLabel} - ${i} OF ${tomatoContainerCount}` : `${containerLabel} - 1 OF 1`
      });
    }

    // SLICED RED ONION
    let onionContainerType = '';
    let onionContainerCount = 0;
    if (useBrownBowlForAllLabels) {
      onionContainerType = 'brown bowl';
      onionContainerCount = 1;
    } else if (prep.byoGyros.total < 20) {
      onionContainerType = '16oz deli';
      onionContainerCount = 1;
    } else if (prep.byoGyros.total <= 45) {
      onionContainerType = 'brown bowl';
      onionContainerCount = 1;
    } else {
      onionContainerType = 'half pan';
      onionContainerCount = Math.ceil(prep.byoGyros.total / 75);
    }
    for (let i = 1; i <= onionContainerCount; i++) {
      const containerLabel = onionContainerType.toUpperCase();
      labels.push({
        item: getLabelName('Sliced Red Onion'),
        qty: onionContainerCount > 1 ? `${containerLabel} - ${i} OF ${onionContainerCount}` : `${containerLabel} - 1 OF 1`
      });
    }

    // WHOLE PEPPERONCINI
    let pepperonciniContainerType = '';
    let pepperonciniContainerCount = 0;
    if (useBrownBowlForAllLabels) {
      pepperonciniContainerType = 'brown bowl';
      pepperonciniContainerCount = 1;
    } else if (prep.byoGyros.total < 10) {
      pepperonciniContainerType = '16oz deli';
      pepperonciniContainerCount = 1;
    } else if (prep.byoGyros.total <= 30) {
      pepperonciniContainerType = '32oz deli';
      pepperonciniContainerCount = 1;
    } else if (prep.byoGyros.total < 100) {
      pepperonciniContainerType = 'half pan';
      pepperonciniContainerCount = 1;
    } else {
      // 100+ portions: Generate full pan labels + half pan if remainder
      const pepperFullPans = Math.floor(prep.byoGyros.total / 100);
      const pepperRemainder = prep.byoGyros.total % 100;

      for (let i = 1; i <= pepperFullPans; i++) {
        labels.push({
          item: getLabelName('Whole Pepperoncini'),
          qty: pepperFullPans > 1 ? `FULL PAN - ${i} OF ${pepperFullPans}` : `FULL PAN - 1 OF 1`
        });
      }

      if (pepperRemainder > 0) {
        labels.push({
          item: getLabelName('Whole Pepperoncini'),
          qty: `HALF PAN - 1 OF 1`
        });
      }

      pepperonciniContainerCount = 0; // Skip normal generation
    }

    for (let i = 1; i <= pepperonciniContainerCount; i++) {
      const containerLabel = pepperonciniContainerType.toUpperCase();
      labels.push({
        item: getLabelName('Whole Pepperoncini'),
        qty: pepperonciniContainerCount > 1 ? `${containerLabel} - ${i} OF ${pepperonciniContainerCount}` : `${containerLabel} - 1 OF 1`
      });
    }

    // GRILLED PITA - Add similar logic if needed
    // For now, skipping as it's complex in the original
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
