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
    console.log(`🔍 DEBUG: Exact checklist_type received: "${checklist_type}"`);
    console.log(`🔍 DEBUG: Checklist_type length: ${checklist_type?.length}`);

    // Fetch checklist definition
    const { data: checklistDef, error: defError } = await supabase
      .from('checklist_definitions')
      .select('*')
      .eq('type', checklist_type)
      .single();

    if (defError || !checklistDef) {
      console.error('❌ Checklist definition error:', defError);
      console.error('🔍 DEBUG: Searching for type:', checklist_type);

      // Try to find ALL checklists to see what exists
      const { data: allDefs } = await supabase
        .from('checklist_definitions')
        .select('type, title');
      console.log('🔍 DEBUG: All available checklist types in database:', allDefs);

      throw new Error(`Checklist not found: ${defError?.message || 'Unknown error'}`);
    }

    console.log(`✓ Found checklist definition ID: ${checklistDef.id}`);

    // Fetch sections for this checklist
    const { data: sections, error: sectionsError } = await supabase
      .from('checklist_sections')
      .select('*')
      .eq('checklist_id', checklistDef.id)
      .order('display_order', { ascending: true });

    if (sectionsError) {
      console.error('Sections error:', sectionsError);
      throw new Error(`Failed to fetch sections: ${sectionsError.message}`);
    }

    console.log(`✓ Found ${sections?.length || 0} sections`);

    if (sections && sections.length > 0) {
      console.log(`🔍 DEBUG: Section details:`);
      sections.forEach(s => {
        console.log(`  - Section "${s.name}" (ID: ${s.id}, Type: ${s.section_type}, Order: ${s.display_order})`);
      });
    }

    // Fetch tasks for all sections
    const allTasks = [];
    for (const section of sections || []) {
      console.log(`🔍 DEBUG: Processing section "${section.name}" (type: ${section.section_type})`);

      if (section.section_type === 'checkbox') {
        const { data: tasks, error: tasksError } = await supabase
          .from('checklist_section_tasks')
          .select('*')
          .eq('section_id', section.id)
          .order('display_order', { ascending: true });

        if (tasksError) {
          console.error(`❌ Tasks error for section ${section.id}:`, tasksError);
          continue;
        }

        console.log(`  ✓ Found ${tasks?.length || 0} tasks for section "${section.name}"`);
        if (tasks && tasks.length > 0) {
          console.log(`    First task: "${tasks[0].task_text}"`);
        }

        // Add section name to each task
        tasks.forEach(task => {
          allTasks.push({
            section_name: section.name,
            section_order: section.display_order,
            task_text: task.task_text,
            is_required: task.is_required || false,
            task_order: task.display_order
          });
        });
      } else {
        console.log(`  ⚠️  Skipping section "${section.name}" - not a checkbox type (type: ${section.section_type})`);
      }
    }

    console.log(`✓ Found ${allTasks.length} total tasks across all sections`);

    // CRITICAL: Check if there are any tasks to print
    if (allTasks.length === 0) {
      console.error(`❌ NO TASKS FOUND for checklist type: ${checklist_type}`);
      console.error(`Checklist definition exists (ID: ${checklistDef.id}) but has no tasks in database.`);
      console.error(`Check the 'checklist_sections' and 'checklist_section_tasks' tables.`);
      throw new Error(
        `Cannot print blank checklist - "${checklist_title}" has no tasks defined in the database. ` +
        `Please add checklist items to the 'checklist_section_tasks' table for this checklist type.`
      );
    }

    // Generate PDF
    const pdfBase64 = generateChecklistPDF(checklistDef, allTasks);

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
    console.error('Error stack:', error.stack);
    return res.status(500).json({
      success: false,
      error: 'Failed to print checklist',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
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

  // Calculate estimated height (INCLUDING new fillable fields)
  let estimatedHeight = 0;
  estimatedHeight += 80; // Header
  estimatedHeight += 100; // Fillable fields section (Date, Shift, Names)
  sectionNames.forEach(sectionName => {
    estimatedHeight += 30; // Section header
    estimatedHeight += sections[sectionName].length * 18; // Tasks (18pt per task)
    estimatedHeight += 10; // Section spacing
  });
  estimatedHeight += 60; // Notes section at bottom

  // Calculate scaling factor if content is too large
  const scaleFactor = estimatedHeight > maxContentHeight
    ? Math.max(0.55, maxContentHeight / estimatedHeight)
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
    y += ss(15);
  }

  // ===== FILLABLE FIELDS SECTION =====
  doc.setFontSize(sf(10));
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkGray);

  // Date field
  doc.text('DATE:', margin, y);
  doc.setDrawColor(...gray);
  doc.setLineWidth(0.5);
  doc.line(margin + 45, y + 2, margin + 180, y + 2);

  // Shift field (same line, right side)
  doc.text('SHIFT:', margin + 200, y);
  doc.line(margin + 245, y + 2, margin + 380, y + 2);
  y += ss(20);

  // Name fields (3 lines)
  doc.text('NAMES:', margin, y);
  y += ss(3);
  doc.setFont('helvetica', 'normal');
  for (let i = 1; i <= 3; i++) {
    doc.setFontSize(sf(8));
    doc.setTextColor(...gray);
    doc.text(`${i}.`, margin + 10, y);
    doc.setDrawColor(...lightGray);
    doc.line(margin + 25, y + 2, pageWidth - margin, y + 2);
    y += ss(16);
  }
  y += ss(5);

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

  // ===== NOTES SECTION =====
  y += ss(10);
  doc.setFontSize(sf(11));
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkGray);
  doc.text('NOTES:', margin, y);
  y += ss(8);

  // Draw 3 lines for notes
  doc.setDrawColor(...lightGray);
  doc.setLineWidth(0.5);
  for (let i = 0; i < 3; i++) {
    if (y < 750) { // Only if there's space
      doc.line(margin, y, pageWidth - margin, y);
      y += ss(16);
    }
  }

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
