/**
 * Vercel Serverless Function: Print 1" x 2-5/8" Rectangular Labels to Epson Printer
 * Generates formatted 1" x 2.625" rectangular labels PDF (30 per page: 3 columns x 10 rows)
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

    console.log(`${downloadMode ? '📥' : '🖨️'} Generating 1" x 2-5/8" labels for order ${order_id}...`);

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

    // Generate PDF with 1" x 2-5/8" rectangular labels
    const pdfBase64 = generate3InchLabelsPDF(labels, ingredientLabels, order);

    // Filename
    const orderNum = order.order_number || order.id;
    const filename = `1x2.625_Labels_${order.source_system}_${orderNum}_${new Date().toISOString().split('T')[0]}.pdf`;

    // DOWNLOAD MODE: Return PDF as blob for download
    if (downloadMode) {
      const totalLabels = labels.length + ingredientLabels.length;
      const pageCount = Math.ceil(totalLabels / 30); // 30 labels per page (3 columns x 10 rows)

      console.log(`✅ 1" x 2-5/8" labels PDF generated for download (${labels.length} item labels + ${ingredientLabels.length} ingredient labels = ${totalLabels} total, ${pageCount} pages)`);

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
      subject: `Print: Catering Labels - Order #${orderNum}`,
      text: '',  // Empty text body - only print PDF attachment
      html: '',  // Empty HTML body - only print PDF attachment
      attachments: [{
        filename: filename,
        content: Buffer.from(pdfBase64, 'base64'),
        contentType: 'application/pdf'
      }]
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Catering labels sent to printer:`, info.messageId);

    return res.status(200).json({
      success: true,
      message: 'Catering labels sent to printer successfully',
      messageId: info.messageId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Print catering labels error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to print catering labels',
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
 * Generate 1" x 2-5/8" rectangular labels PDF
 * Layout: 3 columns x 10 rows = 30 labels per page
 * Page: 8.5" x 11" (612pt x 792pt)
 * Label: 1" height x 2.625" width (72pt x 189pt)
 * Font: BOLD, ALL CAPS, dynamic sizing
 */
function generate3InchLabelsPDF(labels, ingredientLabels, order) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });

  // Label dimensions (1" x 2.625") with SAFE MARGINS
  const LABEL_WIDTH = 185; // 2.625 inches = 189pt, using 185pt for safety (2pt margin each side)
  const LABEL_HEIGHT = 70; // 1 inch = 72pt, using 70pt for safety (1pt top/bottom margin)

  // Page margins - EXTRA SAFE to prevent cutoff
  const TOP_MARGIN = 38; // 0.53 inch from top (extra 2pt safety)
  const LEFT_MARGIN = 0; // Will calculate to center the 3 columns

  // Calculate column positions (3 columns, centered on page with safety margins)
  // Page width = 612pt, 3 labels = 189pt each = 567pt total
  // Add 4pt gap between columns for safety
  const ACTUAL_LABEL_WIDTH = 189; // Actual label width on sheet
  const COL_GAP = 4; // Gap between columns for safety
  const totalLabelsWidth = (ACTUAL_LABEL_WIDTH * 3) + (COL_GAP * 2);
  const horizontalMargin = (612 - totalLabelsWidth) / 2;

  const COL_1_X = horizontalMargin;
  const COL_2_X = horizontalMargin + ACTUAL_LABEL_WIDTH + COL_GAP;
  const COL_3_X = horizontalMargin + (ACTUAL_LABEL_WIDTH * 2) + (COL_GAP * 2);

  // Generate 30 label positions (3 columns x 10 rows) with row gaps for safety
  const positions = [];
  const columnXs = [COL_1_X, COL_2_X, COL_3_X];
  const ACTUAL_LABEL_HEIGHT = 72; // Actual label height on sheet
  const ROW_GAP = 0; // No gap between rows (they're tightly spaced on the sheet)

  for (let row = 0; row < 10; row++) {
    const y = TOP_MARGIN + (row * ACTUAL_LABEL_HEIGHT);
    for (let col = 0; col < 3; col++) {
      positions.push({ x: columnXs[col], y: y });
    }
  }

  let labelIndex = 0;
  let pageStarted = false;

  // Helper: Add label to PDF
  const addLabel = (label, isIngredient = false) => {
    // Start new page if needed (30 labels per page)
    if (labelIndex > 0 && labelIndex % 30 === 0) {
      doc.addPage();
      pageStarted = false;
    }

    if (!pageStarted) {
      pageStarted = true;
    }

    const pos = positions[labelIndex % 30];
    const labelX = pos.x;
    const labelY = pos.y;

    // Calculate TRUE center using ACTUAL label dimensions (not safety margins)
    // ACTUAL dimensions: 189pt x 72pt (the real label box on the sheet)
    // Safety dimensions: 185pt x 70pt (printable area with margins)
    const centerX = labelX + (ACTUAL_LABEL_WIDTH / 2);  // labelX + 94.5pt
    const centerY = labelY + (ACTUAL_LABEL_HEIGHT / 2);  // labelY + 36pt

    // Optional: Draw border for debugging (comment out for production)
    // doc.setDrawColor(200, 200, 200);
    // doc.rect(labelX, labelY, ACTUAL_LABEL_WIDTH, ACTUAL_LABEL_HEIGHT);

    if (isIngredient) {
      // ========== INGREDIENT LABEL ==========
      // Layout: Sauce Name (10-12pt) -> INGREDIENTS (5pt) -> Ingredients (5pt, 2 lines) -> Customer/Date (6pt) -> Heart + Website (6pt)

      let currentY = labelY + 8; // Start with top margin

      const maxWidth = LABEL_WIDTH - 16; // 8pt margins each side

      // Item name (sauce name) - BOLD, limit wrapping
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);

      const itemText = (label.item || '').toUpperCase();

      // Dynamic font sizing - smaller to prevent overflow
      let fontSize = 12;
      let wrappedLines = [];

      while (fontSize >= 9) {
        doc.setFontSize(fontSize);
        const words = itemText.split(' ');
        wrappedLines = [];
        let currentLine = '';

        words.forEach((word) => {
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

        const maxLineWidth = Math.max(...wrappedLines.map(line => doc.getTextWidth(line)));
        const lineHeight = fontSize * 0.95;
        const totalHeight = wrappedLines.length * lineHeight;

        // Ensure total item name height doesn't exceed limit
        if (maxLineWidth <= maxWidth && totalHeight <= 20 && wrappedLines.length <= 2) {
          break;
        }

        fontSize -= 1;
      }

      currentY += fontSize - 1;
      const itemLineHeight = fontSize * 0.95;
      wrappedLines.forEach((line) => {
        doc.text(line, centerX, currentY, { align: 'center' });
        currentY += itemLineHeight;
      });

      // "INGREDIENTS" header (BELOW item name)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5);
      doc.setTextColor(100, 100, 100);
      currentY += 2;
      doc.text('INGREDIENTS', centerX, currentY, { align: 'center' });

      // Ingredients list (2 lines max, tight spacing)
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5);
      doc.setTextColor(60, 60, 60);

      const ingredientsText = (label.ingredients || '');
      const wrappedIngredients = doc.splitTextToSize(ingredientsText, maxWidth - 10);

      currentY += 6;
      const maxIngredientLines = 2;
      for (let i = 0; i < Math.min(wrappedIngredients.length, maxIngredientLines); i++) {
        doc.text(wrappedIngredients[i], centerX, currentY, { align: 'center' });
        currentY += 6;
      }

      // Customer name and date (fixed position at bottom)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      doc.setTextColor(0, 0, 0);
      const customerName = (order.customer_name || '').toUpperCase();
      const dateStr = formatPacificDateShort(order.delivery_date);
      const bottomY = labelY + LABEL_HEIGHT - 9;
      doc.text(`${customerName} - ${dateStr}`, centerX, bottomY, { align: 'center' });

      // Blue heart + jaynagyro.com at very bottom
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.setTextColor(80, 80, 80);
      const websiteText = 'jaynagyro.com';
      const websiteWidth = doc.getTextWidth(websiteText);
      const heartSize = 3.5;
      const heartX = centerX - (websiteWidth / 2) - heartSize - 2;
      drawBlueHeart(doc, heartX, bottomY + 5, heartSize);
      doc.text(websiteText, centerX + heartSize, bottomY + 6.5, { align: 'center' });

    } else {
      // ========== REGULAR ITEM LABEL ==========
      // Layout: Item Name (9-14pt) -> Qty (7pt) -> Customer/Date (6pt) -> Heart + Website (6pt)

      let currentY = labelY + 9; // Start with top margin

      const maxWidth = LABEL_WIDTH - 16; // 8pt margins each side

      // Item name (BIG, dynamic sizing, limit wrapping)
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);

      const itemText = (label.item || '').toUpperCase();

      // Dynamic font sizing - control total height strictly
      let fontSize = 14;
      let wrappedLines = [];

      while (fontSize >= 8) {
        doc.setFontSize(fontSize);
        const words = itemText.split(' ');
        wrappedLines = [];
        let currentLine = '';

        words.forEach((word) => {
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

        const maxLineWidth = Math.max(...wrappedLines.map(line => doc.getTextWidth(line)));
        const lineHeight = fontSize * 0.95;
        const totalHeight = wrappedLines.length * lineHeight;

        // Strict limit: max 30pt total height for item name (to leave room for qty, customer, website)
        if (maxLineWidth <= maxWidth && totalHeight <= 30 && wrappedLines.length <= 3) {
          break;
        }

        fontSize -= 1;
      }

      // Position item name with tight spacing
      const itemLineHeight = fontSize * 0.95;
      currentY += fontSize - 1;

      wrappedLines.forEach((line) => {
        doc.text(line, centerX, currentY, { align: 'center' });
        currentY += itemLineHeight;
      });

      // Quantity (below item name, tight spacing)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(60, 60, 60);
      const qtyText = (label.qty || '').toUpperCase();

      // Wrap quantity if needed
      const wrappedQty = doc.splitTextToSize(qtyText, maxWidth);
      currentY += 2;
      wrappedQty.forEach((line) => {
        doc.text(line, centerX, currentY, { align: 'center' });
        currentY += 7;
      });

      // Customer name and date (fixed position at bottom)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      doc.setTextColor(0, 0, 0);
      const customerName = (order.customer_name || '').toUpperCase();
      const dateStr = formatPacificDateShort(order.delivery_date);
      const bottomY = labelY + LABEL_HEIGHT - 9;
      doc.text(`${customerName} - ${dateStr}`, centerX, bottomY, { align: 'center' });

      // Blue heart + jaynagyro.com at very bottom
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.setTextColor(80, 80, 80);
      const websiteText = 'jaynagyro.com';
      const websiteWidth = doc.getTextWidth(websiteText);
      const heartSize = 3.5;
      const heartX = centerX - (websiteWidth / 2) - heartSize - 2;
      drawBlueHeart(doc, heartX, bottomY + 5, heartSize);
      doc.text(websiteText, centerX + heartSize, bottomY + 6.5, { align: 'center' });
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

    // Generate SLICED PITA labels - Convert half pans to full pans when possible
    const slicedPitaPans = convertHalfPansToFullPans(slicedPitaCount);
    slicedPitaPans.forEach(pan => {
      labels.push({
        item: 'SLICED PITA',
        qty: `${pan.type} - ${pan.index} OF ${pan.total}`
      });
    });

    // Generate SLICED GF PITA labels - Convert half pans to full pans when possible
    if (slicedGFPitaCount > 0) {
      const slicedGFPitaPans = convertHalfPansToFullPans(slicedGFPitaCount);
      slicedGFPitaPans.forEach(pan => {
        labels.push({
          item: 'SLICED GF PITA',
          qty: `${pan.type} - ${pan.index} OF ${pan.total}`
        });
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

  // SIDES - Convert multiple items to full/half pans and generate one label per container
  prep.sides.forEach(side => {
    const sideName = side.name.toUpperCase();
    const qty = side.qty;

    // Check if this is Greek Fries or Rice (items that come in half pans when "feeds 5 to 7")
    const isGreekFries = sideName.includes('GREEK FRIES') && !sideName.includes('BAR');
    const isRice = sideName.includes('RICE');

    if ((isGreekFries || isRice) && qty >= 2) {
      // Multiple items - convert to full/half pans (2 items = 1 full pan)
      const pans = convertHalfPansToFullPans(qty);
      pans.forEach(pan => {
        labels.push({
          item: sideName,
          qty: `${pan.type} - ${pan.index} OF ${pan.total}`
        });
      });

      // For Greek Fries, ALSO add aioli labels (2 aioli per order as each comes with spicy aioli)
      if (isGreekFries) {
        for (let i = 0; i < qty; i++) {
          labels.push({
            item: 'SPICY AIOLI',
            qty: `16OZ DELI - FOR GREEK FRIES`
          });
        }
      }
    } else {
      // Single item or non-pannable item
      labels.push({
        item: sideName,
        qty: `${qty}X`
      });
    }
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
