/**
 * Vercel Serverless Function: FOH Daily Checklist Report
 * Sends previous day's FOH checklists/reviews via email at 4AM
 * Uses nodemailer with Gmail SMTP and app password
 */

import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import { jsPDF } from 'jspdf';

export default async function handler(req, res) {
  // Allow GET (for manual testing) or POST (for cron)
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('📋 FOH Daily Report: Starting generation...');

    // Initialize Supabase
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get yesterday's date in Pacific time
    const yesterdayDate = getPacificYesterday();
    console.log(`📅 Fetching checklists for: ${yesterdayDate}`);

    // Fetch ALL checklist sessions from yesterday (completed and incomplete)
    const { data: sessions, error: sessionsError } = await supabase
      .from('foh_checklist_sessions')
      .select(`
        *,
        foh_checklist_tasks (*),
        foh_checklist_ratings (*),
        foh_checklist_session_photos (*)
      `)
      .eq('session_date', yesterdayDate)
      .order('started_at', { ascending: true });

    if (sessionsError) throw sessionsError;

    if (!sessions || sessions.length === 0) {
      console.log('⚠️ No checklist sessions found for yesterday');
      return res.json({
        success: true,
        message: `No checklists found for ${yesterdayDate}`,
        date: yesterdayDate
      });
    }

    console.log(`✅ Found ${sessions.length} checklist sessions`);

    // Fetch checklist definitions to get titles and time windows
    const { data: definitions, error: defsError } = await supabase
      .from('checklist_definitions')
      .select('type, title, time_range, start_hour, end_hour');

    if (defsError) throw defsError;

    const definitionsMap = {};
    definitions.forEach(def => {
      definitionsMap[def.type] = def;
    });

    // Sort sessions by checklist start_hour (morning first, closing last)
    sessions.sort((a, b) => {
      const aStart = definitionsMap[a.checklist_type]?.start_hour || 0;
      const bStart = definitionsMap[b.checklist_type]?.start_hour || 0;
      return aStart - bStart;
    });

    // Generate PDF
    const pdfBuffer = await generateChecklistsPDF(sessions, definitionsMap, yesterdayDate);

    // Email setup
    const gmailUser = process.env.GMAIL_USER;
    const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;

    if (!gmailUser || !gmailAppPassword) {
      throw new Error('Gmail credentials not configured');
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailAppPassword
      }
    });

    const mailOptions = {
      from: '"JAYNA SAC FOH CHECKLIST REPORTS" <' + gmailUser + '>',
      to: 'smanager@jaynagyro.com',
      subject: `FOH Checklists Report - ${yesterdayDate}`,
      text: `Attached is the FOH checklists report for ${yesterdayDate}.\n\nTotal checklists: ${sessions.length}`,
      html: `
        <p><strong>FOH Checklists Report - ${yesterdayDate}</strong></p>
        <p>Attached is the complete report for all FOH checklists and reviews from ${yesterdayDate}.</p>
        <p><strong>Total checklists:</strong> ${sessions.length}</p>
        <hr>
        <p style="font-size: 11px; color: #666;">Generated automatically at 4:00 AM by Jayna FOH System</p>
      `,
      attachments: [
        {
          filename: `FOH_Checklists_${yesterdayDate}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    };

    await transporter.sendMail(mailOptions);

    console.log('✅ FOH Daily Report sent successfully');

    return res.json({
      success: true,
      message: 'FOH Daily Report sent successfully',
      date: yesterdayDate,
      checklistsCount: sessions.length
    });

  } catch (error) {
    console.error('❌ FOH Daily Report error:', error);
    return res.status(500).json({
      error: 'Failed to generate/send FOH daily report',
      details: error.message
    });
  }
}

/**
 * Get yesterday's date in Pacific timezone
 */
function getPacificYesterday() {
  const now = new Date();
  const pacificOffset = -8 * 60; // PST offset in minutes
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
  const pacificTime = new Date(utcTime + (pacificOffset * 60000));

  // Subtract 1 day
  pacificTime.setDate(pacificTime.getDate() - 1);

  return pacificTime.toISOString().split('T')[0];
}

/**
 * Generate PDF with all checklists (each checklist = 1 page)
 */
async function generateChecklistsPDF(sessions, definitionsMap, reportDate) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'in',
    format: 'letter'
  });

  const jaynaBlue = [0, 168, 225];  // #00A8E1
  const black = [33, 33, 33];
  const darkGray = [66, 66, 66];
  const lightGray = [189, 189, 189];
  const successGreen = [0, 200, 83];
  const warningOrange = [255, 179, 0];
  const errorRed = [211, 47, 47];

  let isFirstPage = true;

  // Render each session as a separate page
  for (const session of sessions) {
    if (!isFirstPage) {
      doc.addPage();
    }
    isFirstPage = false;

    const definition = definitionsMap[session.checklist_type] || {};
    const checklistTitle = definition.title || session.checklist_type.replace(/_/g, ' ').toUpperCase();

    let yPos = 0.7;

    // Header
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(black[0], black[1], black[2]);
    doc.text(checklistTitle, 4.25, yPos, { align: 'center' });
    yPos += 0.2;

    // Date
    doc.setFontSize(11);
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.text(reportDate, 4.25, yPos, { align: 'center' });
    yPos += 0.1;

    // Blue line
    doc.setDrawColor(jaynaBlue[0], jaynaBlue[1], jaynaBlue[2]);
    doc.setLineWidth(0.02);
    doc.line(0.5, yPos, 8, yPos);
    yPos += 0.2;

    // Staff and timestamps
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);

    const staffNames = [session.staff_name, session.staff_name_2, session.staff_name_3, session.staff_name_4]
      .filter(name => name)
      .join(', ');

    doc.text(`Staff: ${staffNames}`, 0.5, yPos);
    yPos += 0.15;

    const startTime = new Date(session.started_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const completedText = session.is_complete && session.completed_at
      ? `Completed: ${new Date(session.completed_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
      : 'INCOMPLETE';

    doc.text(`Started: ${startTime} | ${completedText}`, 0.5, yPos);
    yPos += 0.25;

    // Tasks section
    const tasks = session.foh_checklist_tasks || [];
    if (tasks.length > 0) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(black[0], black[1], black[2]);
      doc.text('TASKS', 0.5, yPos);
      yPos += 0.15;

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');

      const completedTasks = tasks.filter(t => t.is_completed);
      const incompleteTasks = tasks.filter(t => !t.is_completed);

      if (completedTasks.length > 0) {
        doc.setTextColor(successGreen[0], successGreen[1], successGreen[2]);
        doc.text(`✓ Completed: ${completedTasks.length}`, 0.5, yPos);
        yPos += 0.12;
      }

      if (incompleteTasks.length > 0) {
        doc.setTextColor(errorRed[0], errorRed[1], errorRed[2]);
        doc.text(`✗ Incomplete: ${incompleteTasks.length}`, 0.5, yPos);
        yPos += 0.12;

        doc.setFontSize(7);
        doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
        incompleteTasks.forEach(task => {
          if (yPos > 10) {
            doc.addPage();
            yPos = 0.7;
          }
          doc.text(`  • ${task.task_text}`, 0.6, yPos);
          yPos += 0.1;
        });
      }

      yPos += 0.1;
    }

    // Ratings section
    const ratings = session.foh_checklist_ratings || [];
    if (ratings.length > 0) {
      if (yPos > 9.5) {
        doc.addPage();
        yPos = 0.7;
      }

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(black[0], black[1], black[2]);
      doc.text('QUALITY RATINGS', 0.5, yPos);
      yPos += 0.15;

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');

      ratings.forEach(rating => {
        if (yPos > 10) {
          doc.addPage();
          yPos = 0.7;
        }

        const stars = '★'.repeat(rating.rating) + '☆'.repeat(5 - rating.rating);
        doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
        doc.text(`${rating.category_name}: ${stars} (${rating.rating}/5)`, 0.5, yPos);
        yPos += 0.1;

        if (rating.notes) {
          doc.setFontSize(7);
          doc.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
          const notesLines = doc.splitTextToSize(`   ${rating.notes}`, 7);
          notesLines.forEach(line => {
            doc.text(line, 0.6, yPos);
            yPos += 0.08;
          });
          doc.setFontSize(8);
        }
      });

      yPos += 0.1;
    }

    // Session notes
    if (session.notes) {
      if (yPos > 9.5) {
        doc.addPage();
        yPos = 0.7;
      }

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(black[0], black[1], black[2]);
      doc.text('NOTES', 0.5, yPos);
      yPos += 0.15;

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
      const notesLines = doc.splitTextToSize(session.notes, 7);
      notesLines.forEach(line => {
        if (yPos > 10.2) {
          doc.addPage();
          yPos = 0.7;
        }
        doc.text(line, 0.5, yPos);
        yPos += 0.12;
      });
    }

    // Photos
    const photos = session.foh_checklist_session_photos || [];
    if (photos.length > 0) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(black[0], black[1], black[2]);
      doc.text(`PHOTOS: ${photos.length}`, 0.5, 10.5);
    }

    // Footer
    doc.setFontSize(6);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
    doc.text('Generated by Jayna FOH System', 4.25, 10.7, { align: 'center' });
  }

  return Buffer.from(doc.output('arraybuffer'));
}
