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
    pinwheels: [],
    unmapped: [] // Items that don't fit into any category (drinks, special items, etc.)
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
    // SIDES (track price for Greek Fries to detect single sides < $10)
    else if (itemName.includes('GREEK FRIES') || itemName.includes('CHICKPEA') || itemName.includes('GRILLED PITA') || itemName.includes('VEGETABLE STICKS') || itemName.includes('MARINATED OLIVES') || itemName.includes('RICE')) {
      const price = itemName.includes('GREEK FRIES') ? (item.total_price || item.unit_price || 0) : 0;
      prep.sides.push({ name: item.item_name, qty, modifiers, price });
    }
    // DESSERTS
    else if (itemName.includes('BAKLAVA') || itemName.includes('RICE PUDDING')) {
      prep.desserts.push({ name: item.item_name, qty, modifiers });
    }
    // PINWHEELS
    else if (itemName.includes('PINWHEEL')) {
      prep.pinwheels.push({ name: item.item_name, qty });
    }
    // UNMAPPED ITEMS (drinks, special items, etc. - anything not categorized above)
    else {
      prep.unmapped.push({ name: item.item_name, qty, modifiers });
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
  prep.unmapped = consolidateItems(prep.unmapped);

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
        proteins[proteinKey] = { name: proteinName, qty: 0, equipment, proteinKey };
      }
      proteins[proteinKey].qty += qty;
    }
  });

  // Calculate pans for each protein type
  const proteinPrep = [];
  Object.values(proteins).forEach(protein => {
    const qty = protein.qty;
    let containerType = '';

    // FALAFEL SPECIFIC LOGIC: 1 in brown bowl, 8 per half pan, 16 per full pan
    if (protein.proteinKey === 'FALAFEL') {
      if (qty === 1) {
        containerType = 'brown bowl';
      } else if (qty <= 8) {
        containerType = '1 half pan';
      } else {
        // Calculate full pans (16 portions per full pan)
        const fullPans = Math.floor(qty / 16);
        const remainder = qty % 16;

        if (remainder === 0) {
          containerType = `${fullPans} full pan${fullPans > 1 ? 's' : ''}`;
        } else if (remainder === 1) {
          containerType = `${fullPans} full pan${fullPans > 1 ? 's' : ''} + brown bowl`;
        } else if (remainder <= 8) {
          containerType = `${fullPans} full pan${fullPans > 1 ? 's' : ''} + 1 half pan`;
        } else {
          // Remainder 9-15: Add another half pan (will be 2 half pans total for remainder)
          const remainderHalfPans = Math.ceil(remainder / 8);
          containerType = `${fullPans} full pan${fullPans > 1 ? 's' : ''} + ${remainderHalfPans} half pan${remainderHalfPans > 1 ? 's' : ''}`;
        }
      }
    } else {
      // Pan calculation logic for other proteins:
      // <5 = brown bowl (singular in breakdown, pluralized in summary if needed)
      // 6-20 = 1 half pan
      // 21+ = calculate half pans, combine 2 half pans into full pans
      if (qty < 5) {
        containerType = 'brown bowl';
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
 * Helper: Render text with bold segments and real checkbox
 * Parses text with **bold** markers and renders accordingly
 * Replaces "[ ]" with an actual checkbox
 * Example: "[ ] 4x Chicken (**brown bowl**) - **1 tong**"
 */
function renderTextWithBold(doc, text, x, y, drawCheckbox = true) {
  // Draw checkbox if text starts with [ ]
  let textToRender = text;
  let startX = x;

  if (drawCheckbox && text.startsWith('[ ] ')) {
    // Draw checkbox (8pt square)
    const checkboxSize = 8;
    const checkboxY = y - 7; // Align checkbox vertically with text
    doc.setDrawColor(100, 100, 100); // Dark gray
    doc.setLineWidth(0.5);
    doc.rect(x, checkboxY, checkboxSize, checkboxSize, 'S');

    // Move start position after checkbox
    startX = x + checkboxSize + 4; // 4pt spacing after checkbox
    textToRender = text.substring(4); // Remove "[ ] " from text
  }

  // Split text by **bold** markers
  const segments = [];
  let remainingText = textToRender;
  let match;
  const boldRegex = /\*\*(.*?)\*\*/g;
  let lastIndex = 0;

  while ((match = boldRegex.exec(remainingText)) !== null) {
    // Add normal text before bold
    if (match.index > lastIndex) {
      segments.push({
        text: remainingText.substring(lastIndex, match.index),
        bold: false
      });
    }
    // Add bold text
    segments.push({
      text: match[1],
      bold: true
    });
    lastIndex = boldRegex.lastIndex;
  }

  // Add remaining normal text
  if (lastIndex < remainingText.length) {
    segments.push({
      text: remainingText.substring(lastIndex),
      bold: false
    });
  }

  // Render segments
  let currentX = startX;
  const originalFont = doc.internal.getFont().fontName;
  const originalStyle = doc.internal.getFont().fontStyle;

  segments.forEach(segment => {
    if (segment.bold) {
      doc.setFont('helvetica', 'bold');
    } else {
      doc.setFont(originalFont, originalStyle);
    }
    doc.text(segment.text, currentX, y);
    currentX += doc.getTextWidth(segment.text);
  });

  // Restore original font
  doc.setFont(originalFont, originalStyle);
}

/**
 * Generate prep list PDF - REDESIGNED with DYNAMIC SCALING
 * Always fits on one page by scaling fonts/spacing when content is large
 */
function generatePrepListPDF(prep, order, lineItems) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });
  doc.setCharSpace(0);

  // DESIGN SYSTEM: Color palette (grayscale only, no blue)
  const black = [0, 0, 0];
  const darkGray = [60, 60, 60];
  const gray = [127, 127, 127]; // 50% gray for lines/borders
  const lightGray = [200, 200, 200];

  // NARROW MARGINS: 30pt
  const margin = 30;
  const pageWidth = 612;
  const contentWidth = pageWidth - (margin * 2);
  const maxPageHeight = 750; // Leave 30pt for footer at bottom

  // CALCULATE ESTIMATED HEIGHT to determine if scaling needed
  let estimatedHeight = 0;

  // Header + order info (~100-150pt depending on address lines)
  estimatedHeight += 150;

  // Containers + Utensils boxes (fixed ~80pt)
  estimatedHeight += 80;

  // BYO Gyros (if present)
  if (prep.byoGyros.total > 0) {
    const proteinLines = prep.byoGyros.items?.length || 0;
    estimatedHeight += 60 + (proteinLines * 12) + 140; // Header + proteins + prep items
  }

  // Salads
  if (prep.salads.length > 0) {
    estimatedHeight += 50 + (prep.salads.length * 24);
  }

  // Dips
  if (prep.dips.length > 0) {
    let dipLines = 0;
    prep.dips.forEach(dip => {
      dipLines += 2; // Main + modifier lines
      if (dip.modifiers?.some(m => m.name?.includes('VEGGIES'))) dipLines += 1;
      if (dip.modifiers?.some(m => m.name?.includes('PITA'))) dipLines += 1;
    });
    estimatedHeight += 50 + (dipLines * 12);
  }

  // Greek Fries
  if (prep.greekFries.length > 0) {
    estimatedHeight += 50 + (prep.greekFries.length * 28);
  }

  // Dolmas
  if (prep.dolmas.length > 0) {
    estimatedHeight += 50 + (prep.dolmas.length * 26);
  }

  // Spanakopita
  if (prep.spanakopita.length > 0) {
    estimatedHeight += 50 + (prep.spanakopita.length * 26);
  }

  // Sides
  if (prep.sides.length > 0) {
    estimatedHeight += 50 + (prep.sides.length * 14);
  }

  // Desserts
  if (prep.desserts.length > 0) {
    estimatedHeight += 50 + (prep.desserts.length * 14);
  }

  // Pinwheels
  if (prep.pinwheels.length > 0) {
    estimatedHeight += 50 + (prep.pinwheels.length * 14);
  }

  // Unmapped
  if (prep.unmapped?.length > 0) {
    estimatedHeight += 60 + (prep.unmapped.length * 14);
  }

  // Special notes (if present)
  if (order.delivery_notes) {
    estimatedHeight += 60;
  }

  // Prep notes section (fixed)
  estimatedHeight += 60;

  // Calculate scaling factor if needed
  const scaleFactor = estimatedHeight > maxPageHeight
    ? Math.max(0.6, maxPageHeight / estimatedHeight) // Minimum 60% scale, never smaller
    : 1.0;

  // Helper function to scale font sizes
  const sf = (size) => Math.max(5, Math.round(size * scaleFactor)); // Minimum 5pt font

  // Helper function to scale spacing
  const ss = (spacing) => Math.max(4, Math.round(spacing * scaleFactor)); // Minimum 4pt spacing

  let y = ss(25); // Top margin with scaling

  // ===== HEADER =====
  doc.setFontSize(sf(16));
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...black);

  // Extract last name from customer name
  const customerName = order.customer_name || 'Customer';
  const nameParts = customerName.trim().split(' ');
  const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1].toUpperCase() : customerName.toUpperCase();

  // Format date with day of week: "WEDNESDAY 12/03"
  let dateStr = '';
  if (order.delivery_date) {
    const [year, month, day] = order.delivery_date.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

    // Get full day name (WEDNESDAY)
    const dayName = new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      timeZone: 'America/Los_Angeles'
    }).format(date).toUpperCase();

    // Format as DD/MM
    const dayNum = String(day).padStart(2, '0');
    const monthNum = String(month).padStart(2, '0');

    dateStr = `${dayName} ${dayNum}/${monthNum}`;
  }

  // Build title: "LASTNAME - WEDNESDAY 12/03 - PREP LIST"
  const titleParts = [];
  if (lastName) titleParts.push(lastName);
  if (dateStr) titleParts.push(dateStr);
  titleParts.push('PREP LIST');
  const title = titleParts.join(' - ');

  doc.text(title, margin, y);
  y += ss(16);

  // ===== ORDER INFO =====
  doc.setFontSize(sf(10));
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...black);

  // Use REAL order number from ezCater or Toast
  let orderNum;
  let orderLabel;

  if (order.source_system === 'EZCATER') {
    orderNum = order.order_number || 'N/A';
    orderLabel = 'EZCATER ORDER';
  } else {
    orderNum = order.check_number || order.order_number || 'N/A';
    orderLabel = 'TOAST CHECK';
  }

  doc.text(`${orderLabel} #${orderNum}`, margin, y);
  y += ss(14);

  doc.setFontSize(sf(10));
  doc.setFont('helvetica', 'normal');
  doc.text(`${order.customer_name || 'Customer'}`, margin, y);
  y += ss(14);

  if (order.delivery_date && order.delivery_time) {
    doc.setFont('helvetica', 'bold');
    doc.text(order.delivery_address ? 'DELIVERY:' : 'PICKUP:', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`${formatPacificDateShort(order.delivery_date)} at ${formatPacificTime(order.delivery_time)}`, margin + 65, y);
    y += ss(14);

    // Add delivery address if available
    if (order.delivery_address) {
      doc.setFont('helvetica', 'bold');
      doc.text('ADDRESS:', margin, y);
      doc.setFont('helvetica', 'normal');
      const addressLines = doc.splitTextToSize(order.delivery_address, 450);
      addressLines.forEach((line, idx) => {
        if (idx === 0) {
          doc.text(line, margin + 65, y);
        } else {
          y += ss(12);
          doc.text(line, margin + 65, y);
        }
      });
      y += ss(14);
    }
  }

  if (order.headcount) {
    doc.setFont('helvetica', 'bold');
    doc.text('HEADCOUNT: ', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`${order.headcount} guests`, margin + 70, y);
    y += ss(14);
  }

  // ===== ORDER MUST BE READY AT - Highlighted =====
  if (order.delivery_time) {
    y += ss(8);
    const readyByBoxHeight = ss(28);
    doc.setFillColor(255, 243, 205);
    doc.rect(margin, y, contentWidth, readyByBoxHeight, 'F');
    doc.setDrawColor(255, 153, 0);
    doc.setLineWidth(2);
    doc.rect(margin, y, contentWidth, readyByBoxHeight, 'S');

    // Calculate ready time (40 minutes before delivery)
    const deliveryTime = new Date(order.delivery_time);
    const readyByTime = new Date(deliveryTime.getTime() - 40 * 60000);
    const readyByStr = new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'America/Los_Angeles'
    }).format(readyByTime);

    y += ss(18);
    doc.setFontSize(sf(12));
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(180, 80, 0);
    doc.text(`READY AT: ${readyByStr}`, margin + 10, y);
    doc.setTextColor(...black);
    y += ss(16);
  }

  // Gray separator line (2pt, 50% gray)
  doc.setDrawColor(...gray);
  doc.setLineWidth(2);
  doc.line(margin, y, pageWidth - margin, y);
  y += ss(16);

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
    let byoTongs = 4; // greens, onions, pepperoncini, pitas (tomatoes use large spoon, NOT tong)

    // COUNT PROTEIN CONTAINERS AND TONGS
    const proteinPans = calculateProteinPans(prep.byoGyros.items || []);
    proteinPans.forEach(protein => {
      // Count containers for each protein type
      const containerStr = protein.container.toLowerCase();
      if (containerStr.includes('brown bowls')) {
        brownBowls += 1; // Each protein type using brown bowls counts as 1
      } else if (containerStr.includes('half pan')) {
        // Extract number of half pans (e.g., "1 half pan" or "2 half pans")
        const halfPanMatch = containerStr.match(/(\d+)\s*half\s*pan/);
        if (halfPanMatch) {
          halfPans += parseInt(halfPanMatch[1]);
        }
      } else if (containerStr.includes('full pan')) {
        // Extract number of full pans
        const fullPanMatch = containerStr.match(/(\d+)\s*full\s*pan/);
        if (fullPanMatch) {
          fullPans += parseInt(fullPanMatch[1]);
        }
      }

      // Count utensils for each protein type
      if (protein.equipment.includes('tong')) {
        byoTongs += 1; // Each protein gets its own tong
      } else if (protein.equipment.includes('large serving spoon')) {
        largeServingSpoons += 1; // Roasted chickpeas use large spoon
      }
    });

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
      halfPans += salad.qty; // Each salad is ALWAYS 1 half pan
      const fullPansEquivalent = Math.ceil(salad.qty / 2); // 2 half pans = 1 full pan
      deliContainers += fullPansEquivalent; // lemon vinaigrette (1 per full pan equivalent)
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
  const containerBoxHeight = 36;
  doc.setFillColor(248, 248, 248);
  doc.rect(margin, y, contentWidth, containerBoxHeight, 'F');
  doc.setDrawColor(...lightGray);
  doc.setLineWidth(0.5);
  doc.rect(margin, y, contentWidth, containerBoxHeight, 'S');

  y += ss(14);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...black);
  doc.text('CONTAINERS NEEDED', margin + 10, y);
  y += ss(12);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');

  // DO NOT auto-convert half pans to full pans - only combine when SAME ITEM
  // Show full pans and half pans separately
  let containerParts = [];
  if (fullPans > 0) containerParts.push(`${fullPans} full pan${fullPans > 1 ? 's' : ''}`);
  if (halfPans > 0) containerParts.push(`${halfPans} half pan${halfPans > 1 ? 's' : ''}`);
  if (roundTrays > 0) containerParts.push(`${roundTrays}x Round Trays`);
  if (deliContainers > 0) containerParts.push(`${deliContainers}x 16oz Deli`);
  if (deli32ozContainers > 0) containerParts.push(`${deli32ozContainers}x 32oz Deli`);
  if (brownBowls > 0) containerParts.push(`${brownBowls}x Brown Bowls`);
  doc.text(`* ${containerParts.join('  *  ')}`, margin + 10, y);
  y += ss(14);

  // ===== UTENSILS TO PACK - Gray box =====
  const utensilBoxHeight = 36;
  doc.setFillColor(248, 248, 248);
  doc.rect(margin, y, contentWidth, utensilBoxHeight, 'F');
  doc.setDrawColor(...lightGray);
  doc.setLineWidth(0.5);
  doc.rect(margin, y, contentWidth, utensilBoxHeight, 'S');

  y += ss(14);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...black);
  doc.text('UTENSILS TO PACK', margin + 10, y);
  y += ss(12);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  let utensilParts = [];
  if (tongs > 0) utensilParts.push(`${tongs}x Tongs`);
  if (largeServingSpoons > 0) utensilParts.push(`${largeServingSpoons}x Large Spoons`);
  if (smallSpoons > 0) utensilParts.push(`${smallSpoons}x Small Spoons`);
  doc.text(`* ${utensilParts.join('  *  ')}`, margin + 10, y);
  y += ss(14);

  // BYO GYRO PITAS (Beef & Lamb, Chicken, Roasted Chickpeas, Falafel)
  if (prep.byoGyros.total > 0) {
    const sets = Math.ceil(prep.byoGyros.total / 15);

    // Calculate box height dynamically
    const proteinLines = prep.byoGyros.items?.length || 0;
    const byoBoxHeight = 48 + (proteinLines * 10) + 120; // Tighter: Header + proteins + prep items
    doc.setFillColor(250, 250, 250);
    doc.rect(margin, y, contentWidth, byoBoxHeight, 'F');
    doc.setDrawColor(...lightGray);
    doc.setLineWidth(0.5);
    doc.rect(margin, y, contentWidth, byoBoxHeight, 'S');

    y += ss(14);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...black);
    doc.text(`BYO GYRO PITAS (${prep.byoGyros.total} TOTAL PORTIONS)`, margin + 10, y);
    y += ss(10);

    // PROTEIN BREAKDOWN - Show each BYO gyro type
    if (prep.byoGyros.items && prep.byoGyros.items.length > 0) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('PROTEIN BREAKDOWN:', margin + 10, y);
      y += ss(10);

      doc.setFont('helvetica', 'normal');
      prep.byoGyros.items.forEach(item => {
        doc.text(`* ${item.qty}x ${toTitleCase(item.name)}`, margin + 10, y);
        y += ss(10);
      });
      y += ss(5);
    }

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('PREP ITEMS:', margin + 10, y);
    y += ss(10);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');

    // === PROTEINS (ALWAYS AT TOP) ===
    const proteinPans = calculateProteinPans(prep.byoGyros.items || []);
    proteinPans.forEach(protein => {
      renderTextWithBold(doc, `[ ] ${protein.qty}x ${protein.name} (**${protein.container}**) - **${protein.equipment}**`, margin + 10, y);
      y += ss(10);
    });

    // Add spacing after proteins if they exist
    if (proteinPans.length > 0) {
      y += ss(4);
    }

    renderTextWithBold(doc, `[ ] ${sets}x **16oz** Tzatziki (no dill) - **1 small spoon**`, margin + 10, y); y += ss(10);
    renderTextWithBold(doc, `[ ] ${sets}x **16oz** Spicy Aioli - **1 small spoon**`, margin + 10, y); y += ss(10);
    renderTextWithBold(doc, `[ ] ${sets}x **16oz** Lemon Vinaigrette - **1 small spoon**`, margin + 10, y); y += ss(10);
    renderTextWithBold(doc, `[ ] **${formatPanCount(sets)}** Mixed Greens - **1 tong**`, margin + 10, y); y += ss(10);

    // DICED TOMATO LOGIC: 30 portions per half pan
    let tomatoContainer = '';
    let tomatoUsesBrownBowlDisplay = false;
    if (prep.byoGyros.total < 10) {
      tomatoContainer = '16oz deli';
    } else if (prep.byoGyros.total <= 20) {
      tomatoContainer = 'brown bowl';
      tomatoUsesBrownBowlDisplay = true;
    } else {
      const tomatoHalfPans = Math.ceil(prep.byoGyros.total / 30);
      tomatoContainer = formatPanCount(tomatoHalfPans);
    }
    renderTextWithBold(doc, `[ ] ${prep.byoGyros.total} portions Diced Tomatoes (**${tomatoContainer}**) - **1 large spoon**`, margin + 10, y); y += ss(10);

    // SLICED RED ONION LOGIC: 50 portions per half pan
    let onionContainer = '';
    if (tomatoUsesBrownBowlDisplay) {
      onionContainer = 'brown bowl';
    } else if (prep.byoGyros.total < 20) {
      onionContainer = '16oz deli';
    } else if (prep.byoGyros.total <= 45) {
      onionContainer = 'brown bowl';
    } else {
      const onionHalfPans = Math.ceil(prep.byoGyros.total / 50);
      onionContainer = formatPanCount(onionHalfPans);
    }
    renderTextWithBold(doc, `[ ] ${prep.byoGyros.total} portions Sliced Red Onion (**${onionContainer}**) - **1 tong**`, margin + 10, y); y += ss(10);

    // PEPPERONCINI LOGIC: 100 portions per half pan
    let pepperonciniContainer = '';
    if (tomatoUsesBrownBowlDisplay) {
      pepperonciniContainer = 'brown bowl';
    } else if (prep.byoGyros.total < 10) {
      pepperonciniContainer = '16oz deli';
    } else if (prep.byoGyros.total <= 20) {
      pepperonciniContainer = '32oz deli';
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
    renderTextWithBold(doc, `[ ] ${prep.byoGyros.total} whole Pepperoncini (**${pepperonciniContainer}**) - **1 tong**`, margin + 10, y); y += ss(10);

    // PITA LOGIC: 25 whole pita fit in one FULL pan
    const pitasNeeded = prep.byoGyros.total + Math.ceil(prep.byoGyros.total / 10);
    const pitaFullPans = Math.ceil(pitasNeeded / 25);
    renderTextWithBold(doc, `[ ] ${pitasNeeded} whole Grilled Pita (**${pitaFullPans} full pan${pitaFullPans > 1 ? 's' : ''}**) - **1 tong**`, margin + 10, y); y += ss(14);
  }

  // SALADS
  if (prep.salads.length > 0) {
    const saladBoxHeight = 48 + (prep.salads.length * 21);
    doc.setFillColor(250, 250, 250);
    doc.rect(margin, y, contentWidth, saladBoxHeight, 'F');
    doc.setDrawColor(...lightGray);
    doc.setLineWidth(0.5);
    doc.rect(margin, y, contentWidth, saladBoxHeight, 'S');

    y += ss(14);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...black);
    doc.text('SALADS', margin + 10, y);
    y += ss(12);

    // Note about large serving spoons
    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...darkGray);
    doc.text('(2 large spoons total for all salads)', margin + 10, y);
    doc.setTextColor(...black);
    y += ss(10);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    prep.salads.forEach(salad => {
      const halfPans = salad.qty; // Each salad is ALWAYS 1 half pan
      const fullPansEquivalent = Math.ceil(halfPans / 2); // 2 half pans = 1 full pan
      renderTextWithBold(doc, `[ ] ${salad.qty}x ${toTitleCase(salad.name)} (**${formatPanCount(halfPans)}**) - **1 tong**`, margin + 10, y); y += ss(9);
      doc.setTextColor(...darkGray);
      renderTextWithBold(doc, `    - ${fullPansEquivalent}x **16oz** Lemon Vin - **1 small spoon**`, margin + 16, y);
      doc.setTextColor(...black);
      y += ss(11);
    });
    y += ss(5);
  }

  // DIPS
  if (prep.dips.length > 0 && y < 700) {
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
    doc.rect(margin, y, contentWidth, dipBoxHeight, 'F');
    doc.setDrawColor(...lightGray);
    doc.setLineWidth(0.5);
    doc.rect(margin, y, contentWidth, dipBoxHeight, 'S');

    y += ss(14);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...black);
    doc.text('DIPS', margin + 10, y);
    y += ss(12);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    prep.dips.forEach(dip => {
      renderTextWithBold(doc, `[ ] ${dip.qty}x **16oz** ${toTitleCase(dip.name)} (garnish) - **1 small spoon**`, margin + 10, y); y += ss(9);

      const hasVeggies = dip.modifiers.some(m => m.name && (m.name.includes('VEGGIES') || m.name.includes('VEGGIE')));
      const hasPita = dip.modifiers.some(m => m.name && m.name.includes('PITA') && !m.name.includes('GLUTEN FREE'));
      const gfPitaMod = dip.modifiers.find(m => m.name && m.name.includes('GLUTEN FREE PITA'));
      const hasGFPita = !!gfPitaMod;

      doc.setTextColor(...darkGray);
      if (hasVeggies) {
        renderTextWithBold(doc, `    - ${dip.qty * 24} carrots + ${dip.qty * 24} celery (**brown bowl**) - **2 tongs total**`, margin + 16, y); y += ss(9);
      }
      if (hasPita) {
        const regularPitaHalfPans = dip.qty; // 1 half pan per dip (6 pitas sliced)
        renderTextWithBold(doc, `    - ${dip.qty * 6} pitas sliced 8 pieces (**${formatPanCount(regularPitaHalfPans)}**) - **1 tong**`, margin + 16, y); y += ss(9);
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
          renderTextWithBold(doc, `    - ${gfQty} GF pitas sliced 8 pieces (**${formatPanCount(gfPitaHalfPans)}**) - **1 tong**`, margin + 16, y); y += ss(9);
        } else {
          // Parsing failed - show manual entry needed
          renderTextWithBold(doc, `    - GF Pitas (CHECK ORDER FOR QUANTITY) - **1 tong**`, margin + 16, y); y += ss(9);
        }
      }
      doc.setTextColor(...black);
      y += ss(2);
    });
    y += ss(6);
  }

  // GREEK FRIES BAR
  if (prep.greekFries.length > 0 && y < 700) {
    const friesBoxHeight = 40 + (prep.greekFries.length * 26);
    doc.setFillColor(250, 250, 250);
    doc.rect(margin, y, contentWidth, friesBoxHeight, 'F');
    doc.setDrawColor(...lightGray);
    doc.setLineWidth(0.5);
    doc.rect(margin, y, contentWidth, friesBoxHeight, 'S');

    y += ss(14);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...black);
    doc.text('GREEK FRIES BAR', margin + 10, y);
    y += ss(12);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    prep.greekFries.forEach(fries => {
      // Greek fries: 1 half pan if qty < 2, or 2 half pans per order if >= 2
      const friesHalfPans = fries.qty < 2 ? fries.qty : fries.qty * 2;
      renderTextWithBold(doc, `[ ] ${fries.qty}x ${toTitleCase(fries.name)} - **1 tong**`, margin + 10, y); y += ss(9);
      doc.setTextColor(...darkGray);
      renderTextWithBold(doc, `    - **${formatPanCount(friesHalfPans)}** fries + **16oz** Aioli + **16oz** Tzatziki + **16oz** Feta`, margin + 16, y); y += ss(9);
      renderTextWithBold(doc, `    - **3 small spoons** (Aioli, Tzatziki, Feta)`, margin + 16, y);
      doc.setTextColor(...black);
      y += ss(10);
    });
    y += ss(6);
  }

  // DOLMAS
  if (prep.dolmas.length > 0 && y < 700) {
    const dolmasBoxHeight = 40 + (prep.dolmas.length * 24);
    doc.setFillColor(250, 250, 250);
    doc.rect(margin, y, contentWidth, dolmasBoxHeight, 'F');
    doc.setDrawColor(...lightGray);
    doc.setLineWidth(0.5);
    doc.rect(margin, y, contentWidth, dolmasBoxHeight, 'S');

    y += ss(14);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...black);
    doc.text('DOLMAS', margin + 10, y);
    y += ss(12);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    prep.dolmas.forEach(dolma => {
      if (y < 720) {
        renderTextWithBold(doc, `[ ] ${dolma.qty}x ${toTitleCase(dolma.name)} (**1/2 pan or round tray** + lemon wedges) - **1 tong**`, margin + 10, y); y += ss(9);
        doc.setTextColor(...darkGray);
        renderTextWithBold(doc, `    - ${dolma.qty}x **16oz** Tzatziki (dill stripe) - **1 small spoon**`, margin + 16, y, false);
        doc.setTextColor(...black);
        y += ss(10);
      }
    });
    y += ss(6);
  }

  // SPANAKOPITA
  if (prep.spanakopita.length > 0 && y < 700) {
    const spanBoxHeight = 40 + (prep.spanakopita.length * 24);
    doc.setFillColor(250, 250, 250);
    doc.rect(margin, y, contentWidth, spanBoxHeight, 'F');
    doc.setDrawColor(...lightGray);
    doc.setLineWidth(0.5);
    doc.rect(margin, y, contentWidth, spanBoxHeight, 'S');

    y += ss(14);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...black);
    doc.text('SPANAKOPITA', margin + 10, y);
    y += ss(12);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    prep.spanakopita.forEach(span => {
      if (y < 720) {
        renderTextWithBold(doc, `[ ] ${span.qty}x ${toTitleCase(span.name)} (**round tray** on arugula or **1/2/full pan**) - **1 tong**`, margin + 10, y); y += ss(9);
        doc.setTextColor(...darkGray);
        renderTextWithBold(doc, `    - ${span.qty}x **16oz** Tzatziki (dill stripe) - **1 small spoon**`, margin + 16, y, false);
        doc.setTextColor(...black);
        y += ss(10);
      }
    });
    y += ss(6);
  }

  // SIDES - Aggregate Greek Fries single sides (< $10) and show total aioli
  if (prep.sides.length > 0 && y < 700) {
    // Separate Greek Fries single sides from other sides
    let totalGreekFriesSingleSides = 0;
    let totalAioli = 0;
    const nonGreekFriesSides = [];

    prep.sides.forEach(side => {
      const sideName = (side.name || '').toUpperCase();
      const isGreekFries = sideName.includes('GREEK FRIES');
      const isSingleSide = isGreekFries && (side.price || 0) < 10;

      if (isSingleSide) {
        totalGreekFriesSingleSides += side.qty;
        totalAioli += side.qty; // 1 aioli per side
      } else {
        nonGreekFriesSides.push(side);
      }
    });

    // Calculate box height (include extra lines for Greek Fries aggregate + aioli note)
    const greekFriesLines = totalGreekFriesSingleSides > 0 ? 2 : 0; // 1 for item + 1 for aioli note
    const sidesBoxHeight = 40 + ((nonGreekFriesSides.length + greekFriesLines) * 13);
    doc.setFillColor(250, 250, 250);
    doc.rect(margin, y, contentWidth, sidesBoxHeight, 'F');
    doc.setDrawColor(...lightGray);
    doc.setLineWidth(0.5);
    doc.rect(margin, y, contentWidth, sidesBoxHeight, 'S');

    y += ss(14);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...black);
    doc.text('SIDES', margin + 10, y);
    y += ss(12);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');

    // Show aggregated Greek Fries first (if any)
    if (totalGreekFriesSingleSides > 0) {
      if (y < 720) {
        renderTextWithBold(doc, `[ ] ${totalGreekFriesSingleSides}x Greek Fries - **1 tong**`, margin + 10, y); y += ss(9);
        doc.setTextColor(...darkGray);
        doc.setFont('helvetica', 'normal');
        doc.text(`    → TOTAL: ${totalAioli}x 2oz ramekins Spicy Aioli`, margin + 10, y);
        doc.setTextColor(...black);
        y += ss(12);
      }
    }

    // Show other sides
    nonGreekFriesSides.forEach(side => {
      if (y < 720) {
        const sideName = (side.name || '');
        const isRice = sideName.toUpperCase().includes('RICE');
        renderTextWithBold(doc, `[ ] ${side.qty}x ${toTitleCase(sideName)} - **1 tong**${isRice ? ' **+ 1 large serving spoon**' : ''}`, margin + 10, y); y += ss(12);
      }
    });
    y += ss(6);
  }

  // DESSERTS
  if (prep.desserts.length > 0 && y < 700) {
    const dessertsBoxHeight = 40 + (prep.desserts.length * 13);
    doc.setFillColor(250, 250, 250);
    doc.rect(margin, y, contentWidth, dessertsBoxHeight, 'F');
    doc.setDrawColor(...lightGray);
    doc.setLineWidth(0.5);
    doc.rect(margin, y, contentWidth, dessertsBoxHeight, 'S');

    y += ss(14);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...black);
    doc.text('DESSERTS', margin + 10, y);
    y += ss(12);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    prep.desserts.forEach(dessert => {
      if (y < 720) {
        renderTextWithBold(doc, `[ ] ${dessert.qty}x ${toTitleCase(dessert.name)} - **1 tong**`, margin + 10, y); y += ss(12);
      }
    });
    y += ss(6);
  }

  // PINWHEELS
  if (prep.pinwheels.length > 0 && y < 700) {
    const pinwheelsBoxHeight = 40 + (prep.pinwheels.length * 13);
    doc.setFillColor(250, 250, 250);
    doc.rect(margin, y, contentWidth, pinwheelsBoxHeight, 'F');
    doc.setDrawColor(...lightGray);
    doc.setLineWidth(0.5);
    doc.rect(margin, y, contentWidth, pinwheelsBoxHeight, 'S');

    y += ss(14);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...black);
    doc.text('PINWHEELS', margin + 10, y);
    y += ss(12);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    prep.pinwheels.forEach(pinwheel => {
      if (y < 720) {
        renderTextWithBold(doc, `[ ] ${pinwheel.qty}x ${toTitleCase(pinwheel.name)} - **1 tong**`, margin + 10, y); y += ss(12);
      }
    });
    y += ss(6);
  }

  // UNMAPPED ITEMS (items not in standard prep categories - drinks, special items, etc.)
  if (prep.unmapped && prep.unmapped.length > 0 && y < 680) {
    const unmappedBoxHeight = 40 + (prep.unmapped.length * 13);
    doc.setFillColor(254, 242, 242); // Light red background
    doc.rect(margin, y, contentWidth, unmappedBoxHeight, 'F');
    doc.setDrawColor(220, 38, 38); // Red border
    doc.setLineWidth(2);
    doc.rect(margin, y, contentWidth, unmappedBoxHeight, 'S');

    y += ss(14);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(185, 28, 28); // Dark red text
    doc.text('OTHER ITEMS (NOT IN STANDARD PREP)', margin + 10, y);
    y += ss(10);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...darkGray);
    doc.text('The following items were ordered but don\'t fall into standard prep categories. Please prepare as specified:', margin + 10, y);
    y += ss(10);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...black);
    prep.unmapped.forEach(item => {
      if (y < 720) {
        renderTextWithBold(doc, `[ ] ${item.qty}x ${toTitleCase(item.name)}`, margin + 10, y);
        y += ss(12);
      }
    });
    y += ss(6);
  }

  // SPECIAL NOTES
  if (order.delivery_notes && y < 700) {
    y += ss(12);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...black);
    doc.text('SPECIAL NOTES:', margin, y);
    y += ss(10);

    const noteLines = doc.splitTextToSize(order.delivery_notes, contentWidth);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    noteLines.forEach((line, idx) => {
      if (idx < 6 && y < 760) {
        doc.text(line, margin, y);
        y += ss(9);
      }
    });
    y += ss(6);
  }

  // HANDWRITTEN NOTES SECTION
  if (y < 720) {
    y += ss(16); // More spacing before PREP NOTES
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...black);
    doc.text('PREP NOTES:', margin, y);
    y += ss(14); // More spacing after header

    for (let i = 0; i < 3; i++) {
      if (y < 750) {
        doc.setDrawColor(...lightGray);
        doc.setLineWidth(0.5);
        doc.line(margin, y, pageWidth - margin, y);
        y += ss(20); // More spacing between lines (was 14)
      }
    }
  }

  // Footer (always at bottom of page)
  doc.setFontSize(sf(7));
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...gray);
  doc.text(`Generated: ${formatPacificDateTime(new Date())} PST`, margin, 770);

  // Convert to base64
  return doc.output('datauristring').split(',')[1];
}
