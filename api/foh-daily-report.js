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

  // Analyze staff performance - aggregate from completed tasks
  sessions.forEach(session => {
    // Get unique staff names from completed tasks (not from session)
    const tasks = session.foh_checklist_tasks || [];
    const staffNames = [...new Set(
      tasks
        .filter(t => t.completed_by)
        .map(t => t.completed_by)
    )];

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
 * Generate PDF with NEW landscape compact format (NO executive summary)
 * Uses the perfected layout from foh-checklists.html
 */
async function generateChecklistsPDF(sessions, definitionsMap, reportDate, analytics, expectedChecklists) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'letter'
  });

  const pageWidth = doc.internal.pageSize.width; // 792pt
  const pageHeight = doc.internal.pageSize.height; // 612pt
  const margin = 14.4; // 0.2 inches = 14.4pt

  let isFirstSession = true;

  // Loop through each session and generate a landscape page
  for (const session of sessions) {
    // Add page for each session (skip first page since doc starts with one)
    if (!isFirstSession) {
      doc.addPage();
    }
    isFirstSession = false;

    const definition = definitionsMap[session.checklist_type] || {};
    const checklistTitle = definition.title || session.checklist_type.replace(/_/g, ' ').toUpperCase();

    let y = margin + 10;

    // ========== BLUE ACCENT BAR AT TOP ==========
    doc.setFillColor(59, 130, 246); // Jayna blue
    doc.rect(0, 0, pageWidth, 6, 'F');

    y += 10;

    // ========== COMPACT HEADER (SINGLE LINE) ==========
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(33, 33, 33);
    doc.text(checklistTitle, margin, y);

    // Session date on same line (right side)
    const sessionDate = new Date(session.started_at).toLocaleString('en-US', {
      timeZone: 'America/Los_Angeles',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }) + ' PT';

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(sessionDate, pageWidth - margin, y, { align: 'right' });

    y += 12;

    // ========== GROUP TASKS BY PERSON (needed for staff list) ==========
    const tasks = session.foh_checklist_tasks || [];
    const completedTasks = tasks.filter(t => t.is_completed);
    const notCompletedTasks = tasks.filter(t => !t.is_completed);

    // Group completed tasks by person
    const tasksByPerson = {};
    completedTasks.forEach(task => {
      const person = task.completed_by || 'Unknown';
      if (!tasksByPerson[person]) {
        tasksByPerson[person] = [];
      }
      tasksByPerson[person].push(task);
    });

    // Staff names (people who completed tasks on this page) + Status on same line
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(66, 66, 66);
    doc.text('STAFF:', margin, y);

    const staffNames = Object.keys(tasksByPerson).join(', ') || 'Unknown';
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(33, 33, 33);
    doc.text(staffNames, margin + 32, y);

    // Status on right side
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(66, 66, 66);
    const statusX = pageWidth - margin - 90;
    doc.text('STATUS:', statusX, y);
    if (session.is_complete) {
      doc.setTextColor(5, 150, 105); // Green
      doc.text('COMPLETE ✓', statusX + 40, y);
    } else {
      doc.setTextColor(245, 158, 11); // Orange
      doc.text('IN PROGRESS', statusX + 40, y);
    }

    y += 10;

    // ========== HORIZONTAL DIVIDER ==========
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    // Calculate column widths for 2-column layout
    const col1X = margin;
    const col2X = pageWidth / 2 + 10;
    const colWidth = (pageWidth / 2) - margin - 20;

    // ========== LEFT COLUMN: COMPLETED TASKS (GROUPED BY PERSON) ==========
    let col1Y = y;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(33, 33, 33);
    doc.text('TASKS COMPLETED', col1X, col1Y);
    col1Y += 10;

    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');

    // Render each person's completed tasks compactly
    Object.entries(tasksByPerson).forEach(([person, personTasks]) => {
      // Person name in bold
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(59, 130, 246); // Blue
      doc.text(`${person.toUpperCase()} COMPLETED:`, col1X, col1Y);
      col1Y += 7;

      // List tasks as compact bullets
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(33, 33, 33);

      personTasks.forEach(task => {
        const taskText = `• ${task.task_text}`;
        const lines = doc.splitTextToSize(taskText, colWidth - 10);
        lines.forEach(line => {
          doc.text(line, col1X + 5, col1Y);
          col1Y += 6;
        });
      });

      col1Y += 3; // Space between people
    });

    // ========== NOT COMPLETED SECTION (STILL IN LEFT COLUMN) ==========
    if (notCompletedTasks.length > 0) {
      col1Y += 6;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(220, 38, 38); // Red
      doc.text('NOT COMPLETED', col1X, col1Y);
      col1Y += 10;

      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);

      notCompletedTasks.forEach(task => {
        const taskText = `• ${task.task_text}`;
        const lines = doc.splitTextToSize(taskText, colWidth - 10);
        lines.forEach(line => {
          doc.text(line, col1X + 5, col1Y);
          col1Y += 6;
        });
      });
    }

    // ========== RIGHT COLUMN: QUALITY RATINGS + SESSION INSIGHTS ==========
    let col2Y = y;

    // QUALITY REVIEW SECTION (if ratings exist)
    const ratings = session.foh_checklist_ratings || [];
    if (ratings && ratings.length > 0) {
      // Detect if this is a REVIEW-only checklist (few/no tasks, mostly ratings)
      const isReviewOnly = completedTasks.length === 0 ||
                           (ratings.length > 0 && completedTasks.length < 3);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(33, 33, 33);
      doc.text('QUALITY REVIEW', col2X, col2Y);
      col2Y += 10;

      // Find the rating section
      const ratingSection = definition.sections ? definition.sections.find(s => s.type === 'rating') : null;
      if (ratingSection) {
        ratingSection.categories.forEach(category => {
          const ratingRecord = ratings.find(r => r.category_name === category.name);

          if (ratingRecord) {
            // REVIEW-ONLY: Bigger fonts and more spacing
            const categoryFontSize = isReviewOnly ? 8 : 6;
            const starFontSize = isReviewOnly ? 10 : 8;
            const noteFontSize = isReviewOnly ? 7 : 5;
            const lineSpacing = isReviewOnly ? 10 : 7;

            // Category name
            doc.setFontSize(categoryFontSize);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(33, 33, 33);
            doc.text(`${category.name}:`, col2X, col2Y);

            // Stars (larger for reviews)
            const starX = col2X + doc.getTextWidth(`${category.name}: `) + 3;
            doc.setFontSize(starFontSize);
            const starSpacing = isReviewOnly ? 9 : 7;
            for (let i = 0; i < 5; i++) {
              if (i < ratingRecord.rating) {
                doc.setTextColor(59, 130, 246); // Blue filled star
                doc.text('★', starX + (i * starSpacing), col2Y);
              } else {
                doc.setTextColor(200, 200, 200); // Gray empty star
                doc.text('☆', starX + (i * starSpacing), col2Y);
              }
            }

            // Rating number
            doc.setFontSize(categoryFontSize);
            doc.setTextColor(100, 100, 100);
            const ratingNumX = isReviewOnly ? starX + 48 : starX + 38;
            doc.text(`(${ratingRecord.rating}/5)`, ratingNumX, col2Y);
            col2Y += lineSpacing;

            // REVIEW-ONLY: Add name and timestamp
            if (isReviewOnly && ratingRecord.rated_by) {
              doc.setFont('helvetica', 'normal');
              doc.setFontSize(6);
              doc.setTextColor(100, 100, 100);

              const ratedTime = ratingRecord.rated_at ?
                new Date(ratingRecord.rated_at).toLocaleString('en-US', {
                  timeZone: 'America/Los_Angeles',
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                }) : 'Unknown time';

              doc.text(`By: ${ratingRecord.rated_by} at ${ratedTime}`, col2X + 5, col2Y);
              col2Y += 8;
            }

            // Notes (MUCH more readable for reviews)
            if (ratingRecord.notes && ratingRecord.notes.trim()) {
              doc.setFont('helvetica', 'italic');
              doc.setFontSize(noteFontSize);
              doc.setTextColor(66, 66, 66); // Darker for readability
              const noteLines = doc.splitTextToSize(`"${ratingRecord.notes}"`, colWidth - 10);
              const maxLines = isReviewOnly ? 3 : 1; // More lines for reviews
              noteLines.slice(0, maxLines).forEach(line => {
                doc.text(line, col2X + 5, col2Y);
                col2Y += isReviewOnly ? 8 : 6;
              });
              doc.setFont('helvetica', 'normal');
              col2Y += isReviewOnly ? 6 : 0;
            }

            col2Y += isReviewOnly ? 4 : 0; // Extra spacing between ratings for reviews
          }
        });
      }

      col2Y += 6;
    }

    // ========== SESSION INSIGHTS BOX ==========
    doc.setFillColor(239, 246, 255); // Very light blue background
    const insightsBoxY = col2Y;
    const insightsBoxHeight = 55;
    doc.rect(col2X - 5, insightsBoxY, colWidth + 10, insightsBoxHeight, 'F');

    // Border
    doc.setDrawColor(59, 130, 246);
    doc.setLineWidth(1);
    doc.rect(col2X - 5, insightsBoxY, colWidth + 10, insightsBoxHeight);

    col2Y += 10;

    // Header
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(33, 33, 33);
    doc.text('SESSION INSIGHTS', col2X, col2Y);
    col2Y += 11;

    // Metrics (compact 2-column)
    doc.setFontSize(6);
    const insightCol1X = col2X;
    const insightCol2X = col2X + (colWidth / 2);

    let insightY = col2Y;

    // Left metrics
    const totalTasks = tasks.length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;

    if (totalTasks > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(66, 66, 66);
      doc.text('Tasks:', insightCol1X, insightY);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(33, 33, 33);
      doc.text(`${completedTasks.length}/${totalTasks}`, insightCol1X + 26, insightY);
      insightY += 8;

      doc.setFont('helvetica', 'bold');
      doc.text('Rate:', insightCol1X, insightY);
      doc.setFont('helvetica', 'normal');
      if (completionRate >= 90) {
        doc.setTextColor(5, 150, 105); // Green
      } else if (completionRate >= 70) {
        doc.setTextColor(245, 158, 11); // Orange
      } else {
        doc.setTextColor(220, 38, 38); // Red
      }
      doc.text(`${completionRate}%`, insightCol1X + 26, insightY);
      insightY += 8;
    }

    // First and Last task timestamps
    const taskTimestamps = completedTasks
      .filter(t => t.completed_at)
      .map(t => new Date(t.completed_at))
      .sort((a, b) => a - b);

    if (taskTimestamps.length > 0) {
      const firstTaskTime = taskTimestamps[0].toLocaleString('en-US', {
        timeZone: 'America/Los_Angeles',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(66, 66, 66);
      doc.text('First:', insightCol1X, insightY);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(33, 33, 33);
      doc.text(firstTaskTime, insightCol1X + 26, insightY);
      insightY += 8;

      const lastTaskTime = taskTimestamps[taskTimestamps.length - 1].toLocaleString('en-US', {
        timeZone: 'America/Los_Angeles',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(66, 66, 66);
      doc.text('Last:', insightCol1X, insightY);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(33, 33, 33);
      doc.text(lastTaskTime, insightCol1X + 26, insightY);
    }

    // Right metrics
    insightY = col2Y;

    // Staff count (people who completed tasks on this page)
    const staffCount = Object.keys(tasksByPerson).length;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(66, 66, 66);
    doc.text('Staff:', insightCol2X, insightY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(33, 33, 33);
    doc.text(`${staffCount}`, insightCol2X + 22, insightY);
    insightY += 8;

    // Top performer
    const topPerformer = Object.entries(tasksByPerson).sort((a, b) => b[1].length - a[1].length)[0];
    if (topPerformer) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(66, 66, 66);
      doc.text('Top:', insightCol2X, insightY);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(59, 130, 246); // Blue
      doc.text(topPerformer[0], insightCol2X + 22, insightY);
      insightY += 8;
    }

    // Average rating
    if (ratings && ratings.length > 0) {
      const avgRating = (ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length).toFixed(1);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(66, 66, 66);
      doc.text('Rating:', insightCol2X, insightY);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(33, 33, 33);
      doc.text(`${avgRating}/5`, insightCol2X + 22, insightY);
      doc.setFontSize(7);
      doc.setTextColor(59, 130, 246);
      doc.text('★', insightCol2X + 22 + doc.getTextWidth(`${avgRating}/5`) + 2, insightY);
      doc.setFontSize(6);
    }

    col2Y = insightsBoxY + insightsBoxHeight + 8;

    // ========== NOTES FOR NEXT SHIFT (if any) ==========
    const sessionNotes = session.notes_for_next_shift || session.notes || '';
    if (sessionNotes.trim()) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(33, 33, 33);
      doc.text('NOTES FOR INCOMING CREW', col2X, col2Y);
      col2Y += 8;

      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(66, 66, 66);
      const noteLines = doc.splitTextToSize(sessionNotes, colWidth);
      noteLines.forEach(line => {
        doc.text(line, col2X, col2Y);
        col2Y += 6;
      });
    }
  }

  // ========== FOOTER ON EVERY PAGE ==========
  const pageCount = doc.internal.getNumberOfPages();
  const generatedTime = new Date().toLocaleString('en-US', {
    timeZone: 'America/Los_Angeles',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }) + ' PT';

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    // Page number (left)
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    doc.text(`Page ${i} of ${pageCount}`, margin, pageHeight - 8);

    // Generated time (center)
    doc.text(`Generated ${generatedTime}`, pageWidth / 2, pageHeight - 8, { align: 'center' });

    // Credit (right)
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 100, 100);
    doc.text('APP CREATED BY DEMETRI GREGORAKIS', pageWidth - margin, pageHeight - 8, { align: 'right' });
  }

  return Buffer.from(doc.output('arraybuffer'));
}
