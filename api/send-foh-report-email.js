/**
 * Vercel Serverless Function: Send FOH Checklist Daily Report via Gmail
 * Uses nodemailer with Gmail SMTP and app password
 * Same credentials as send-prep-sheet-email.js
 */

import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { reportContent, reportDate, totalSessions, toEmail } = req.body;

    // Validate required fields
    if (!reportContent || !reportDate || !toEmail) {
      return res.status(400).json({
        error: 'Missing required fields: reportContent, reportDate, toEmail'
      });
    }

    // Get Gmail credentials from environment variables
    const gmailUser = process.env.GMAIL_USER; // jaynascans@gmail.com
    const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;

    if (!gmailUser || !gmailAppPassword) {
      throw new Error('Gmail credentials not configured in environment variables');
    }

    // Create nodemailer transporter with Gmail SMTP
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailAppPassword
      }
    });

    // Email subject
    const subject = `FOH Checklists Daily Report - ${reportDate}`;

    // Email HTML content
    const htmlContent = `
      <div style="font-family: 'Courier New', monospace; background: #f5f5f5; padding: 20px;">
        <div style="background: white; padding: 20px; border: 2px solid #424242; max-width: 800px; margin: 0 auto;">
          <h1 style="color: #212121; text-transform: uppercase; letter-spacing: 1px; font-size: 18px; margin-bottom: 10px;">
            FOH CHECKLIST DAILY REPORT
          </h1>
          <p style="color: #616161; margin-bottom: 20px;">
            <strong>Date:</strong> ${reportDate}<br>
            <strong>Total Sessions:</strong> ${totalSessions || 0}
          </p>
          <hr style="border: 1px solid #e0e0e0; margin: 20px 0;">
          <pre style="white-space: pre-wrap; font-family: 'Courier New', monospace; font-size: 13px; line-height: 1.6; color: #424242;">${reportContent}</pre>
          <hr style="border: 1px solid #e0e0e0; margin: 20px 0;">
          <p style="color: #757575; font-size: 11px; text-align: center;">
            This is an automated report from the Jayna Gyro FOH Checklist System.<br>
            Sent from: ${gmailUser}
          </p>
        </div>
      </div>
    `;

    // Email options
    const mailOptions = {
      from: gmailUser,
      to: toEmail,
      subject: subject,
      text: reportContent, // Plain text fallback
      html: htmlContent
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);

    console.log('FOH report email sent successfully:', info.messageId);

    return res.status(200).json({
      success: true,
      messageId: info.messageId,
      message: 'FOH daily report sent successfully'
    });

  } catch (error) {
    console.error('FOH report email send error:', error);
    return res.status(500).json({
      error: 'Failed to send FOH report email',
      details: error.message
    });
  }
}
