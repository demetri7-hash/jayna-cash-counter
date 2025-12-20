/**
 * Vercel Serverless Function: Print Completed FOH Checklist to Epson Printer
 * Generates simple one-page PDF with dynamic sizing + sends to Epson via Gmail
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
    const { session_id } = req.body;

    if (!session_id) {
      return res.status(400).json({
        success: false,
        error: 'session_id is required'
      });
    }

    console.log(`🖨️ Printing completed checklist session: ${session_id}`);

    // Fetch session data
    const { data: session, error: sessionError } = await supabase
      .from('foh_checklist_sessions')
      .select('*')
      .eq('id', session_id)
      .single();

    if (sessionError || !session) {
      console.error('Session error:', sessionError);
      throw new Error(`Session not found: ${sessionError?.message || 'Unknown error'}`);
    }

    console.log(`✓ Found session for ${session.checklist_type}`);

    // Fetch all tasks for this session
    const { data: tasks, error: tasksError } = await supabase
      .from('foh_checklist_tasks')
      .select('*')
      .eq('session_id', session_id)
      .order('task_order', { ascending: true });

    if (tasksError) {
      console.error('Tasks error:', tasksError);
      throw new Error(`Failed to fetch tasks: ${tasksError.message}`);
    }

    console.log(`✓ Found ${tasks?.length || 0} tasks`);

    // Generate PDF
    const pdfBase64 = generateCompletedChecklistPDF(session, tasks);

    const filename = `FOH_Checklist_${session.checklist_type}_${session_id}.pdf`;

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
      subject: `Print: Completed ${session.checklist_type}`,
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
      message: 'Completed checklist sent to printer successfully',
      messageId: info.messageId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Print completed checklist error:', error);
    console.error('Error stack:', error.stack);
    return res.status(500).json({
      success: false,
      error: 'Failed to print completed checklist',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

/**
 * Generate completed checklist PDF - SIMPLE format, dynamically scaled to fit ONE page
 */
function generateCompletedChecklistPDF(session, tasks) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });
  doc.setCharSpace(0);

  // Color palette
  const black = [0, 0, 0];
  const darkGray = [60, 60, 60];
  const gray = [127, 127, 127];
  const lightGray = [200, 200, 200];
  const green = [5, 150, 105];
  const red = [220, 38, 38];

  // Page layout
  const margin = 40;
  const pageWidth = 612;
  const pageHeight = 792;
  const contentWidth = pageWidth - (margin * 2);
  const maxContentHeight = 720; // Leave space for footer

  // Separate completed and incomplete tasks
  const completedTasks = tasks.filter(t => t.is_completed);
  const incompleteTasks = tasks.filter(t => !t.is_completed);

  // Calculate estimated height
  let estimatedHeight = 0;
  estimatedHeight += 80; // Header
  estimatedHeight += 30; // Completed section header
  estimatedHeight += completedTasks.length * 16; // Completed tasks
  if (incompleteTasks.length > 0) {
    estimatedHeight += 30; // Incomplete section header
    estimatedHeight += incompleteTasks.length * 16; // Incomplete tasks
  }

  // Calculate scaling factor if content is too large
  const scaleFactor = estimatedHeight > maxContentHeight
    ? Math.max(0.5, maxContentHeight / estimatedHeight)
    : 1.0;

  // Scale functions
  const sf = (size) => Math.max(5, Math.round(size * scaleFactor));
  const ss = (spacing) => Math.max(4, Math.round(spacing * scaleFactor));

  let y = ss(40);

  // ===== HEADER =====
  doc.setFontSize(sf(18));
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...black);
  doc.text(session.checklist_type.toUpperCase().replace(/_/g, ' '), margin, y);
  y += ss(20);

  // Session date and status
  const sessionDate = new Date(session.started_at).toLocaleString('en-US', {
    timeZone: 'America/Los_Angeles',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }) + ' PT';

  doc.setFontSize(sf(10));
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...darkGray);
  doc.text(sessionDate, margin, y);

  // Status
  const statusText = session.is_complete ? 'COMPLETE ✓' : 'IN PROGRESS';
  const statusColor = session.is_complete ? green : [245, 158, 11];
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...statusColor);
  doc.text(statusText, pageWidth - margin, y, { align: 'right' });
  y += ss(20);

  // Gray separator line
  doc.setDrawColor(...gray);
  doc.setLineWidth(2);
  doc.line(margin, y, pageWidth - margin, y);
  y += ss(20);

  // ===== COMPLETED TASKS =====
  if (completedTasks.length > 0) {
    doc.setFontSize(sf(12));
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...green);
    doc.text(`COMPLETED (${completedTasks.length})`, margin, y);
    y += ss(15);

    doc.setFontSize(sf(9));
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...darkGray);

    completedTasks.forEach(task => {
      // Task text with name and time
      const taskText = `✓ ${task.task_text}`;
      const name = task.completed_by ? ` - ${task.completed_by}` : '';
      const time = task.completed_at ? ` (${new Date(task.completed_at).toLocaleTimeString('en-US', { timeZone: 'America/Los_Angeles', hour: 'numeric', minute: '2-digit', hour12: true })})` : '';

      const fullText = taskText + name + time;
      const maxTextWidth = contentWidth - 15;
      const lines = doc.splitTextToSize(fullText, maxTextWidth);

      lines.forEach((line, idx) => {
        doc.text(line, margin + 5, y);
        if (idx < lines.length - 1) {
          y += ss(10);
        }
      });

      y += ss(14);

      // Prevent overflow
      if (y > maxContentHeight) {
        return;
      }
    });

    y += ss(10);
  }

  // ===== INCOMPLETE TASKS =====
  if (incompleteTasks.length > 0) {
    doc.setFontSize(sf(12));
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...red);
    doc.text(`NOT COMPLETED (${incompleteTasks.length})`, margin, y);
    y += ss(15);

    doc.setFontSize(sf(9));
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...gray);

    incompleteTasks.forEach(task => {
      const taskText = `○ ${task.task_text}`;
      const maxTextWidth = contentWidth - 15;
      const lines = doc.splitTextToSize(taskText, maxTextWidth);

      lines.forEach((line, idx) => {
        doc.text(line, margin + 5, y);
        if (idx < lines.length - 1) {
          y += ss(10);
        }
      });

      y += ss(14);

      // Prevent overflow
      if (y > maxContentHeight) {
        return;
      }
    });
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

  doc.text(`Printed: ${timestamp} PST`, margin, 770);

  // Convert to base64
  return doc.output('datauristring').split(',')[1];
}
