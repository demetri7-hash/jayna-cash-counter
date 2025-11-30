/**
 * Vercel Serverless Function: Print FOH Checklist to Epson Printer
 * Generates formatted checklist PDF and sends via Gmail to Epson printer
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
    const { checklist_type, checklist_title } = req.body;

    if (!checklist_type || !checklist_title) {
      return res.status(400).json({
        success: false,
        error: 'checklist_type and checklist_title are required'
      });
    }

    console.log(`🖨️ Generating checklist PDF for: ${checklist_title} (${checklist_type})`);

    // Fetch checklist definition
    const { data: checklistDef, error: defError } = await supabase
      .from('checklist_definitions')
      .select('*')
      .eq('type', checklist_type)
      .single();

    if (defError || !checklistDef) {
      throw new Error('Checklist not found');
    }

    // Fetch checklist tasks
    const { data: tasks, error: tasksError } = await supabase
      .from('checklist_tasks')
      .select('*')
      .eq('checklist_type', checklist_type)
      .order('section_order', { ascending: true })
      .order('task_order', { ascending: true });

    if (tasksError) {
      throw new Error('Failed to fetch checklist tasks');
    }

    // Generate PDF
    const pdfBase64 = generateChecklistPDF(checklistDef, tasks || []);

    const filename = `FOH_Checklist_${checklist_type}_${new Date().toISOString().split('T')[0]}.pdf`;

    // Send to printer via Gmail
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: GMAIL_USER,
        pass: GMAIL_APP_PASSWORD
      }
    });

    const mailOptions = {
      from: `Jayna FOH Checklists <${GMAIL_USER}>`,
      to: PRINTER_EMAIL,
      subject: `Print: ${checklist_title}`,
      text: '',  // Empty text body - only print PDF attachment
      html: '',  // Empty HTML body - only print PDF attachment
      attachments: [{
        filename: filename,
        content: Buffer.from(pdfBase64, 'base64'),
        contentType: 'application/pdf'
      }]
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Checklist sent to printer:`, info.messageId);

    return res.status(200).json({
      success: true,
      message: 'Checklist sent to printer successfully',
      messageId: info.messageId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Print checklist error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to print checklist',
      details: error.message
    });
  }
}

/**
 * Generate checklist PDF - Dynamically scaled to fit one page
 */
function generateChecklistPDF(checklist, tasks) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });
  doc.setCharSpace(0);

  // Color palette
  const black = [0, 0, 0];
  const darkGray = [60, 60, 60];
  const gray = [127, 127, 127];
  const lightGray = [200, 200, 200];

  // Page layout
  const margin = 40;
  const pageWidth = 612;
  const pageHeight = 792;
  const contentWidth = pageWidth - (margin * 2);
  const maxContentHeight = 720; // Leave space for footer

  // Group tasks by section
  const sections = {};
  tasks.forEach(task => {
    const sectionName = task.section_name || 'General';
    if (!sections[sectionName]) {
      sections[sectionName] = [];
    }
    sections[sectionName].push(task);
  });

  const sectionNames = Object.keys(sections);

  // Calculate estimated height
  let estimatedHeight = 0;
  estimatedHeight += 80; // Header
  sectionNames.forEach(sectionName => {
    estimatedHeight += 30; // Section header
    estimatedHeight += sections[sectionName].length * 18; // Tasks (18pt per task)
    estimatedHeight += 10; // Section spacing
  });

  // Calculate scaling factor if content is too large
  const scaleFactor = estimatedHeight > maxContentHeight
    ? Math.max(0.6, maxContentHeight / estimatedHeight)
    : 1.0;

  // Scale functions
  const sf = (size) => Math.max(5, Math.round(size * scaleFactor));
  const ss = (spacing) => Math.max(4, Math.round(spacing * scaleFactor));

  let y = ss(40);

  // ===== HEADER =====
  doc.setFontSize(sf(18));
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...black);
  doc.text(checklist.title.toUpperCase(), margin, y);
  y += ss(20);

  // Time range info
  if (checklist.time_range) {
    doc.setFontSize(sf(11));
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...darkGray);
    doc.text(`Time Range: ${checklist.time_range}`, margin, y);
    y += ss(25);
  }

  // Gray separator line
  doc.setDrawColor(...gray);
  doc.setLineWidth(2);
  doc.line(margin, y, pageWidth - margin, y);
  y += ss(20);

  // ===== CHECKLIST TASKS BY SECTION =====
  sectionNames.forEach(sectionName => {
    // Section header
    doc.setFontSize(sf(12));
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...black);
    doc.text(sectionName.toUpperCase(), margin, y);
    y += ss(15);

    // Section tasks
    doc.setFontSize(sf(10));
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...darkGray);

    sections[sectionName].forEach(task => {
      // Draw checkbox
      const checkboxSize = sf(10);
      const checkboxY = y - sf(8);
      doc.setDrawColor(...gray);
      doc.setLineWidth(0.5);
      doc.rect(margin, checkboxY, checkboxSize, checkboxSize, 'S');

      // Task text
      const taskText = task.task_text || '';
      const maxTextWidth = contentWidth - checkboxSize - 10;
      const lines = doc.splitTextToSize(taskText, maxTextWidth);

      lines.forEach((line, idx) => {
        const textX = margin + checkboxSize + 8;
        doc.text(line, textX, y);
        if (idx < lines.length - 1) {
          y += ss(12);
        }
      });

      y += ss(18);

      // Prevent overflow
      if (y > maxContentHeight) {
        return; // Stop adding more tasks if we're out of space
      }
    });

    y += ss(10); // Section spacing
  });

  // ===== FOOTER =====
  doc.setFontSize(sf(8));
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...gray);

  const now = new Date();
  const timestamp = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Los_Angeles'
  }).format(now);

  doc.text(`Generated: ${timestamp} PST`, margin, 770);

  // Convert to base64
  return doc.output('datauristring').split(',')[1];
}
