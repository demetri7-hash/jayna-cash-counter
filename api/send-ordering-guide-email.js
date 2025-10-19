/**
 * Vercel Serverless Function: Send Ordering Guide PDF to Epson Printer
 * Uses nodemailer with Gmail SMTP and app password
 */

import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { pdfBase64, filename } = req.body;

    // Validate required fields
    if (!pdfBase64 || !filename) {
      return res.status(400).json({
        error: 'Missing required fields: pdfBase64, filename'
      });
    }

    // Get Gmail credentials from environment variables
    const gmailUser = process.env.GMAIL_USER;
    const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;

    if (!gmailUser || !gmailAppPassword) {
      throw new Error('Gmail credentials not configured in environment variables');
    }

    // Epson printer email address
    const printerEmail = 'GSS4168CTJJA73@print.epsonconnect.com';

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
      to: printerEmail,
      subject: 'Print: ' + filename,
      text: 'Ordering guide for printing.',
      html: '<p>Ordering guide attached for printing.</p>',
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

    console.log('Ordering guide sent to printer:', info.messageId);

    return res.status(200).json({
      success: true,
      messageId: info.messageId,
      message: 'Ordering guide sent to printer successfully'
    });

  } catch (error) {
    console.error('Email send error:', error);
    return res.status(500).json({
      error: 'Failed to send to printer',
      details: error.message
    });
  }
}
