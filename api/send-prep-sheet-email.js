/**
 * Vercel Serverless Function: Send Prep Sheet PDF via Gmail
 * Uses nodemailer with Gmail SMTP and app password
 */

import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { pdfBase64, filename, subject, toEmail } = req.body;

    // Validate required fields
    if (!pdfBase64 || !filename || !toEmail) {
      return res.status(400).json({
        error: 'Missing required fields: pdfBase64, filename, toEmail'
      });
    }

    // Get Gmail credentials from environment variables
    const gmailUser = process.env.GMAIL_USER; // e.g., jaynascans@gmail.com
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

    // Convert base64 to buffer for attachment
    const pdfBuffer = Buffer.from(pdfBase64, 'base64');

    // Email options
    const mailOptions = {
      from: gmailUser,
      to: toEmail,
      subject: subject || 'Prep Sheet',
      text: 'Prep sheet attached.',
      html: '<p>Prep sheet attached.</p>',
      attachments: [
        {
          filename: filename,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);

    console.log('Email sent successfully:', info.messageId);

    return res.status(200).json({
      success: true,
      messageId: info.messageId,
      message: 'Prep sheet sent to printer successfully'
    });

  } catch (error) {
    console.error('Email send error:', error);
    return res.status(500).json({
      error: 'Failed to send email',
      details: error.message
    });
  }
}
