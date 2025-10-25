/**
 * Vercel Serverless Function: FOH Daily Checklist Report (Enhanced)
 * Sends previous day's FOH/BOH checklists via email at 4AM
 * Professional format with executive summary and detailed analytics
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
      .select('*');

    if (defsError) throw defsError;

    const definitionsMap = {};
    definitions.forEach(def => {
      definitionsMap[def.type] = def;
    });

    // Fetch all expected checklists (to identify missing ones)
    const expectedChecklists = definitions.filter(def => {
      // Only include FOH/BOH checklists (not future features)
      return def.type.includes('foh_') || def.type.includes('boh_') || def.type.includes('am_cleaning');
    });

    // Sort sessions by checklist start_hour (morning first, closing last)
    sessions.sort((a, b) => {
      const aStart = definitionsMap[a.checklist_type]?.start_hour || 0;
      const bStart = definitionsMap[b.checklist_type]?.start_hour || 0;
      return aStart - bStart;
    });

    // Calculate analytics
    const analytics = calculateAnalytics(sessions, expectedChecklists, definitionsMap);

    // Generate PDF
    const pdfBuffer = await generateChecklistsPDF(sessions, definitionsMap, yesterdayDate, analytics, expectedChecklists);

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

    const completionRate = ((sessions.filter(s => s.is_complete).length / sessions.length) * 100).toFixed(0);

    const mailOptions = {
      from: '"JAYNA SAC CHECKLIST REPORTS" <' + gmailUser + '>',
      to: 'smanager@jaynagyro.com',
      subject: `Checklist Report - ${yesterdayDate} (${completionRate}% Complete)`,
      text: `Attached is the complete checklist report for ${yesterdayDate}.\n\nTotal checklists: ${sessions.length}\nCompleted: ${sessions.filter(s => s.is_complete).length}\nCompletion Rate: ${completionRate}%`,
      html: `
        <div style="font-family: 'Aptos', 'Segoe UI', sans-serif; max-width: 600px;">
          <h2 style="color: #212121; text-transform: uppercase; letter-spacing: 1px;">DAILY CHECKLIST REPORT</h2>
          <p style="font-size: 16px; color: #424242;"><strong>Date:</strong> ${yesterdayDate}</p>

          <div style="background: #f5f5f5; padding: 16px; margin: 20px 0; border-left: 4px solid #00A8E1;">
            <p style="margin: 8px 0; font-size: 14px;"><strong>Total Checklists:</strong> ${sessions.length}</p>
            <p style="margin: 8px 0; font-size: 14px;"><strong>Completed:</strong> ${sessions.filter(s => s.is_complete).length}</p>
            <p style="margin: 8px 0; font-size: 14px;"><strong>Completion Rate:</strong> ${completionRate}%</p>
          </div>

          ${analytics.topPerformers.length > 0 ? `
            <p style="color: #059669; font-weight: 600;">TOP PERFORMERS: ${analytics.topPerformers.join(', ')}</p>
          ` : ''}

          ${analytics.needsAttention.length > 0 ? `
            <p style="color: #DC2626; font-weight: 600;">NEEDS ATTENTION: ${analytics.needsAttention.join(', ')}</p>
          ` : ''}

          <hr style="margin: 24px 0; border: none; border-top: 1px solid #e0e0e0;">
          <p style="font-size: 11px; color: #9e9e9e;">Generated automatically at 4:00 AM by Jayna Checklist System</p>
        </div>
      `,
      attachments: [
        {
          filename: `Checklists_Report_${yesterdayDate}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    };

    await transporter.sendMail(mailOptions);

    console.log('✅ Daily Report sent successfully');

    return res.json({
      success: true,
      message: 'Daily Report sent successfully',
      date: yesterdayDate,
      checklistsCount: sessions.length,
      completionRate: `${completionRate}%`
    });

  } catch (error) {
    console.error('❌ Daily Report error:', error);
    return res.status(500).json({
      error: 'Failed to generate/send daily report',
      details: error.message
    });
  }
}

/**
 * Get yesterday's date in Pacific timezone
 */
function getPacificYesterday() {
  const now = new Date();
  const pacificTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));

  // Subtract 1 day
  pacificTime.setDate(pacificTime.getDate() - 1);

  return pacificTime.toISOString().split('T')[0];
}

/**
 * Calculate analytics for executive summary
 */
function calculateAnalytics(sessions, expectedChecklists, definitionsMap) {
  const analytics = {
    totalSessions: sessions.length,
    completedSessions: sessions.filter(s => s.is_complete).length,
    incompleteSessions: sessions.filter(s => !s.is_complete).length,
    missingChecklists: [],
    topPerformers: [],
    needsAttention: [],
    problemTasks: [],
    staffPerformance: {}
  };

  // Identify missing checklists
  const completedTypes = new Set(sessions.map(s => s.checklist_type));
  expectedChecklists.forEach(def => {
    if (!completedTypes.has(def.type)) {
      analytics.missingChecklists.push(def.title || def.type);
    }
  });

  // Analyze staff performance
  sessions.forEach(session => {
    const staffNames = [session.staff_name, session.staff_name_2, session.staff_name_3, session.staff_name_4]
      .filter(name => name);

    staffNames.forEach(staffName => {
      if (!analytics.staffPerformance[staffName]) {
        analytics.staffPerformance[staffName] = {
          checklistsCompleted: 0,
          checklistsIncomplete: 0,
          totalTasks: 0,
          completedTasks: 0,
          averageRating: 0,
          ratingCount: 0
        };
      }

      const perf = analytics.staffPerformance[staffName];

      if (session.is_complete) {
        perf.checklistsCompleted++;
      } else {
        perf.checklistsIncomplete++;
      }

      // Count tasks
      const tasks = session.foh_checklist_tasks || [];
      perf.totalTasks += tasks.length;
      perf.completedTasks += tasks.filter(t => t.is_completed).length;

      // Average ratings
      const ratings = session.foh_checklist_ratings || [];
      if (ratings.length > 0) {
        const avgSessionRating = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
        perf.averageRating = ((perf.averageRating * perf.ratingCount) + avgSessionRating) / (perf.ratingCount + 1);
        perf.ratingCount++;
      }
    });
  });

  // Identify top performers (95%+ task completion AND 4.5+ avg rating)
  Object.entries(analytics.staffPerformance).forEach(([name, perf]) => {
    const taskCompletionRate = perf.totalTasks > 0 ? (perf.completedTasks / perf.totalTasks) : 0;

    if (taskCompletionRate >= 0.95 && perf.averageRating >= 4.5 && perf.ratingCount > 0) {
      analytics.topPerformers.push(name);
    } else if (taskCompletionRate < 0.70 || (perf.averageRating < 3.0 && perf.ratingCount > 0)) {
      analytics.needsAttention.push(name);
    }
  });

  // Identify problem tasks (incomplete across multiple sessions)
  const taskIncompleteCount = {};
  sessions.forEach(session => {
    const tasks = session.foh_checklist_tasks || [];
    tasks.filter(t => !t.is_completed).forEach(task => {
      const key = task.task_text;
      taskIncompleteCount[key] = (taskIncompleteCount[key] || 0) + 1;
    });
  });

  // Flag tasks incomplete 2+ times
  Object.entries(taskIncompleteCount).forEach(([task, count]) => {
    if (count >= 2) {
      analytics.problemTasks.push({ task, count });
    }
  });

  analytics.problemTasks.sort((a, b) => b.count - a.count);

  return analytics;
}

/**
 * Generate PDF with executive summary + detailed breakdowns
 */
async function generateChecklistsPDF(sessions, definitionsMap, reportDate, analytics, expectedChecklists) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'in',
    format: 'letter'
  });

  // Colors (grayscale + Jayna Blue)
  const jaynaBlue = [0, 168, 225];
  const black = [33, 33, 33];
  const darkGray = [66, 66, 66];
  const mediumGray = [117, 117, 117];
  const lightGray = [189, 189, 189];
  const veryLightGray = [245, 245, 245];
  const successGreen = [5, 150, 105];
  const warningOrange = [245, 158, 11];
  const errorRed = [220, 38, 38];

  // Font settings (using Helvetica as Aptos substitute in jsPDF)
  doc.setFont('helvetica');

  // ========================================
  // PAGE 1: EXECUTIVE SUMMARY
  // ========================================

  let yPos = 0.6;

  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(black[0], black[1], black[2]);
  doc.text('DAILY CHECKLIST REPORT', 4.25, yPos, { align: 'center' });
  yPos += 0.25;

  doc.setFontSize(14);
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  doc.text(`EXECUTIVE SUMMARY - ${reportDate.toUpperCase()}`, 4.25, yPos, { align: 'center' });
  yPos += 0.15;

  // Blue line
  doc.setDrawColor(jaynaBlue[0], jaynaBlue[1], jaynaBlue[2]);
  doc.setLineWidth(0.03);
  doc.line(0.5, yPos, 8, yPos);
  yPos += 0.3;

  // Overall Stats Box
  doc.setFillColor(veryLightGray[0], veryLightGray[1], veryLightGray[2]);
  doc.setDrawColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.setLineWidth(0.01);
  doc.rect(0.5, yPos, 7.5, 0.8, 'FD');

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(black[0], black[1], black[2]);
  doc.text('OVERALL COMPLETION STATUS', 0.7, yPos + 0.2);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);

  const completionRate = analytics.totalSessions > 0
    ? ((analytics.completedSessions / analytics.totalSessions) * 100).toFixed(1)
    : 0;

  doc.text(`TOTAL CHECKLISTS: ${analytics.totalSessions}`, 0.7, yPos + 0.4);
  doc.text(`COMPLETED: ${analytics.completedSessions}`, 3, yPos + 0.4);
  doc.text(`INCOMPLETE: ${analytics.incompleteSessions}`, 5, yPos + 0.4);

  // Completion rate with color coding
  const rateColor = completionRate >= 90 ? successGreen : completionRate >= 70 ? warningOrange : errorRed;
  doc.setTextColor(rateColor[0], rateColor[1], rateColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.text(`COMPLETION RATE: ${completionRate}%`, 0.7, yPos + 0.65);

  yPos += 1.0;

  // Missing Checklists
  if (analytics.missingChecklists.length > 0) {
    doc.setFillColor(errorRed[0], errorRed[1], errorRed[2]);
    doc.setDrawColor(errorRed[0], errorRed[1], errorRed[2]);
    doc.setLineWidth(0.03);
    doc.line(0.5, yPos, 8, yPos);
    yPos += 0.02;

    doc.setFillColor(255, 245, 245); // Very light red
    doc.rect(0.5, yPos, 7.5, 0.15 + (analytics.missingChecklists.length * 0.12), 'F');

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(errorRed[0], errorRed[1], errorRed[2]);
    doc.text('MISSING CHECKLISTS (NOT STARTED)', 0.7, yPos + 0.12);
    yPos += 0.25;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    analytics.missingChecklists.forEach(checklist => {
      doc.text(`- ${checklist}`, 0.8, yPos);
      yPos += 0.12;
    });

    yPos += 0.1;
  }

  // Staff Performance Section
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(black[0], black[1], black[2]);
  doc.text('STAFF PERFORMANCE ANALYSIS', 0.5, yPos);
  yPos += 0.2;

  // Top Performers
  if (analytics.topPerformers.length > 0) {
    doc.setFillColor(successGreen[0], successGreen[1], successGreen[2]);
    doc.setDrawColor(successGreen[0], successGreen[1], successGreen[2]);
    doc.setLineWidth(0.02);
    doc.line(0.5, yPos, 8, yPos);
    yPos += 0.02;

    doc.setFillColor(240, 253, 244); // Very light green
    doc.rect(0.5, yPos, 7.5, 0.15 + (analytics.topPerformers.length * 0.12), 'F');

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(successGreen[0], successGreen[1], successGreen[2]);
    doc.text('TOP PERFORMERS (95%+ COMPLETION, 4.5+ AVG RATING)', 0.7, yPos + 0.12);
    yPos += 0.25;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    analytics.topPerformers.forEach(name => {
      const perf = analytics.staffPerformance[name];
      const taskRate = ((perf.completedTasks / perf.totalTasks) * 100).toFixed(0);
      doc.text(`- ${name} (${taskRate}% tasks, ${perf.averageRating.toFixed(1)} avg rating)`, 0.8, yPos);
      yPos += 0.12;
    });

    yPos += 0.1;
  }

  // Needs Attention
  if (analytics.needsAttention.length > 0) {
    doc.setFillColor(warningOrange[0], warningOrange[1], warningOrange[2]);
    doc.setDrawColor(warningOrange[0], warningOrange[1], warningOrange[2]);
    doc.setLineWidth(0.02);
    doc.line(0.5, yPos, 8, yPos);
    yPos += 0.02;

    doc.setFillColor(255, 251, 235); // Very light orange
    doc.rect(0.5, yPos, 7.5, 0.15 + (analytics.needsAttention.length * 0.12), 'F');

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(warningOrange[0], warningOrange[1], warningOrange[2]);
    doc.text('NEEDS ATTENTION (<70% COMPLETION OR <3.0 RATING)', 0.7, yPos + 0.12);
    yPos += 0.25;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    analytics.needsAttention.forEach(name => {
      const perf = analytics.staffPerformance[name];
      const taskRate = perf.totalTasks > 0 ? ((perf.completedTasks / perf.totalTasks) * 100).toFixed(0) : 'N/A';
      const rating = perf.ratingCount > 0 ? perf.averageRating.toFixed(1) : 'N/A';
      doc.text(`- ${name} (${taskRate}% tasks, ${rating} avg rating)`, 0.8, yPos);
      yPos += 0.12;
    });

    yPos += 0.1;
  }

  // All Staff Summary Table
  yPos += 0.1;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(black[0], black[1], black[2]);
  doc.text('ALL STAFF SUMMARY', 0.5, yPos);
  yPos += 0.2;

  // Table header
  doc.setFillColor(darkGray[0], darkGray[1], darkGray[2]);
  doc.rect(0.5, yPos - 0.05, 7.5, 0.2, 'F');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('STAFF NAME', 0.6, yPos + 0.08);
  doc.text('CHECKLISTS', 2.3, yPos + 0.08);
  doc.text('TASKS', 3.5, yPos + 0.08);
  doc.text('COMPLETION', 4.6, yPos + 0.08);
  doc.text('AVG RATING', 6, yPos + 0.08);

  yPos += 0.25;

  // Table rows
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);

  Object.entries(analytics.staffPerformance).forEach(([name, perf], index) => {
    if (yPos > 10) {
      doc.addPage();
      yPos = 0.7;
    }

    // Alternating row background
    if (index % 2 === 0) {
      doc.setFillColor(veryLightGray[0], veryLightGray[1], veryLightGray[2]);
      doc.rect(0.5, yPos - 0.05, 7.5, 0.15, 'F');
    }

    const taskCompletionRate = perf.totalTasks > 0
      ? ((perf.completedTasks / perf.totalTasks) * 100).toFixed(0)
      : '0';
    const avgRating = perf.ratingCount > 0 ? perf.averageRating.toFixed(1) : 'N/A';

    doc.text(name, 0.6, yPos + 0.08);
    doc.text(`${perf.checklistsCompleted}/${perf.checklistsCompleted + perf.checklistsIncomplete}`, 2.3, yPos + 0.08);
    doc.text(`${perf.completedTasks}/${perf.totalTasks}`, 3.5, yPos + 0.08);
    doc.text(`${taskCompletionRate}%`, 4.6, yPos + 0.08);
    doc.text(avgRating, 6, yPos + 0.08);

    yPos += 0.15;
  });

  yPos += 0.2;

  // Problem Tasks Section
  if (analytics.problemTasks.length > 0) {
    if (yPos > 9.5) {
      doc.addPage();
      yPos = 0.7;
    }

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(black[0], black[1], black[2]);
    doc.text('RECURRING INCOMPLETE TASKS (2+ OCCURRENCES)', 0.5, yPos);
    yPos += 0.2;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(errorRed[0], errorRed[1], errorRed[2]);

    analytics.problemTasks.slice(0, 10).forEach(({ task, count }) => {
      if (yPos > 10.2) {
        doc.addPage();
        yPos = 0.7;
      }

      const wrappedLines = doc.splitTextToSize(`[${count}x] ${task}`, 7);
      wrappedLines.forEach(line => {
        doc.text(line, 0.6, yPos);
        yPos += 0.1;
      });
    });
  }

  // Footer
  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.text('GENERATED BY JAYNA CHECKLIST SYSTEM', 4.25, 10.7, { align: 'center' });

  // ========================================
  // SUBSEQUENT PAGES: DETAILED BREAKDOWNS
  // ========================================

  for (const session of sessions) {
    doc.addPage();

    const definition = definitionsMap[session.checklist_type] || {};
    const checklistTitle = definition.title || session.checklist_type.replace(/_/g, ' ').toUpperCase();

    yPos = 0.6;

    // Header
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(black[0], black[1], black[2]);
    doc.text(checklistTitle, 4.25, yPos, { align: 'center' });
    yPos += 0.2;

    // Date
    doc.setFontSize(11);
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.text(reportDate.toUpperCase(), 4.25, yPos, { align: 'center' });
    yPos += 0.1;

    // Blue line
    doc.setDrawColor(jaynaBlue[0], jaynaBlue[1], jaynaBlue[2]);
    doc.setLineWidth(0.02);
    doc.line(0.5, yPos, 8, yPos);
    yPos += 0.25;

    // Staff and timestamps
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);

    const staffNames = [session.staff_name, session.staff_name_2, session.staff_name_3, session.staff_name_4]
      .filter(name => name)
      .join(', ');

    doc.setFont('helvetica', 'bold');
    doc.text('STAFF: ', 0.5, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(staffNames, 0.9, yPos);
    yPos += 0.15;

    const startTime = new Date(session.started_at).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    doc.setFont('helvetica', 'bold');
    doc.text('STARTED: ', 0.5, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(startTime, 1.0, yPos);

    if (session.is_complete && session.completed_at) {
      const completedTime = new Date(session.completed_at).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      doc.setFont('helvetica', 'bold');
      doc.text('COMPLETED: ', 3.5, yPos);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(successGreen[0], successGreen[1], successGreen[2]);
      doc.text(completedTime, 4.3, yPos);
    } else {
      doc.setFont('helvetica', 'bold');
      doc.text('STATUS: ', 3.5, yPos);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(errorRed[0], errorRed[1], errorRed[2]);
      doc.text('INCOMPLETE', 4.1, yPos);
    }

    yPos += 0.3;

    // Tasks section
    const tasks = session.foh_checklist_tasks || [];
    if (tasks.length > 0) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(black[0], black[1], black[2]);
      doc.text('TASKS', 0.5, yPos);
      yPos += 0.2;

      const completedTasks = tasks.filter(t => t.is_completed);
      const incompleteTasks = tasks.filter(t => !t.is_completed);

      // Summary stats
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(successGreen[0], successGreen[1], successGreen[2]);
      doc.text(`COMPLETED: ${completedTasks.length}/${tasks.length}`, 0.5, yPos);

      if (incompleteTasks.length > 0) {
        doc.setTextColor(errorRed[0], errorRed[1], errorRed[2]);
        doc.text(`INCOMPLETE: ${incompleteTasks.length}`, 3.5, yPos);
      }

      yPos += 0.2;

      // Show COMPLETED tasks
      if (completedTasks.length > 0) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(successGreen[0], successGreen[1], successGreen[2]);
        doc.text('COMPLETED TASKS:', 0.5, yPos);
        yPos += 0.15;

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);

        completedTasks.forEach(task => {
          if (yPos > 10.2) {
            doc.addPage();
            yPos = 0.7;
          }

          const wrappedLines = doc.splitTextToSize(`[DONE] ${task.task_text}`, 7);
          wrappedLines.forEach(line => {
            doc.text(line, 0.7, yPos);
            yPos += 0.09;
          });
        });

        yPos += 0.15;
      }

      // Show INCOMPLETE tasks
      if (incompleteTasks.length > 0) {
        if (yPos > 9.5) {
          doc.addPage();
          yPos = 0.7;
        }

        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(errorRed[0], errorRed[1], errorRed[2]);
        doc.text('INCOMPLETE TASKS:', 0.5, yPos);
        yPos += 0.15;

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');

        incompleteTasks.forEach(task => {
          if (yPos > 10.2) {
            doc.addPage();
            yPos = 0.7;
          }

          const wrappedLines = doc.splitTextToSize(`[MISSING] ${task.task_text}`, 7);
          wrappedLines.forEach(line => {
            doc.text(line, 0.7, yPos);
            yPos += 0.09;
          });
        });

        yPos += 0.15;
      }
    }

    // Ratings section
    const ratings = session.foh_checklist_ratings || [];
    if (ratings.length > 0) {
      if (yPos > 9.5) {
        doc.addPage();
        yPos = 0.7;
      }

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(black[0], black[1], black[2]);
      doc.text('QUALITY RATINGS', 0.5, yPos);
      yPos += 0.2;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');

      ratings.forEach(rating => {
        if (yPos > 10.2) {
          doc.addPage();
          yPos = 0.7;
        }

        // Rating color coding
        const ratingColor = rating.rating >= 4 ? successGreen : rating.rating >= 3 ? warningOrange : errorRed;

        doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
        doc.setFont('helvetica', 'bold');
        doc.text(`${rating.category_name}:`, 0.5, yPos);

        doc.setTextColor(ratingColor[0], ratingColor[1], ratingColor[2]);
        doc.text(`${rating.rating}/5`, 6.5, yPos);

        yPos += 0.12;

        if (rating.notes) {
          doc.setFontSize(7);
          doc.setFont('helvetica', 'italic');
          doc.setTextColor(mediumGray[0], mediumGray[1], mediumGray[2]);
          const notesLines = doc.splitTextToSize(`"${rating.notes}"`, 7);
          notesLines.forEach(line => {
            doc.text(line, 0.7, yPos);
            yPos += 0.08;
          });
          doc.setFontSize(9);
          yPos += 0.03;
        }
      });

      yPos += 0.15;
    }

    // Session notes
    if (session.notes) {
      if (yPos > 9.5) {
        doc.addPage();
        yPos = 0.7;
      }

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(black[0], black[1], black[2]);
      doc.text('NOTES', 0.5, yPos);
      yPos += 0.2;

      doc.setFontSize(9);
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
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(mediumGray[0], mediumGray[1], mediumGray[2]);
      doc.text(`PHOTOS ATTACHED: ${photos.length}`, 0.5, 10.5);
    }

    // Footer
    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
    doc.text('GENERATED BY JAYNA CHECKLIST SYSTEM', 4.25, 10.7, { align: 'center' });
  }

  return Buffer.from(doc.output('arraybuffer'));
}
