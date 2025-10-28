/**
 * Vercel Serverless Function: Send Driver Flag Report via Gmail
 * Uses SAME email pattern as print-incident.js
 * Sends PDF attachment with BLANK email body to save printer paper
 */

import nodemailer from 'nodemailer';

const GMAIL_USER = 'jaynascans@gmail.com';
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;
const PRINTER_EMAIL = 'GSS4168CTJJA73@print.epsonconnect.com';
const DEMETRI_EMAIL = 'smanager@jaynagyro.com';

export default async function handler(req, res) {
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
    const { pdfData, flagId, staffName, guestName, driverName, orderNumber, date } = req.body;

    // Validate required fields
    if (!pdfData || !flagId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: pdfData, flagId'
      });
    }

    console.log(`🖨️ Sending driver flag report #${flagId} to printer and Demetri...`);

    // Create nodemailer transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: GMAIL_USER,
        pass: GMAIL_APP_PASSWORD
      }
    });

    // Extract PDF base64 data (remove data URL prefix if present)
    const base64Data = pdfData.includes('base64,')
      ? pdfData.split('base64,')[1]
      : pdfData;

    const filename = `Driver_Flag_${flagId}_${date}.pdf`;

    // Send to PRINTER
    const printerMailOptions = {
      from: `Jayna Driver Flag <${GMAIL_USER}>`,
      to: PRINTER_EMAIL,
      subject: `Print: Driver Flag #${flagId} - ${guestName}`,
      text: '',    // BLANK - saves paper
      html: '',    // BLANK - saves paper
      attachments: [{
        filename: filename,
        content: Buffer.from(base64Data, 'base64'),
        contentType: 'application/pdf'
      }]
    };

    // Send to DEMETRI
    const demetriMailOptions = {
      from: `Jayna Driver Flag <${GMAIL_USER}>`,
      to: DEMETRI_EMAIL,
      subject: `DRIVER FLAG #${flagId} - ${guestName} - ${date}`,
      text: '',    // BLANK
      html: '',    // BLANK
      attachments: [{
        filename: filename,
        content: Buffer.from(base64Data, 'base64'),
        contentType: 'application/pdf'
      }]
    };

    // Send both emails
    const printerInfo = await transporter.sendMail(printerMailOptions);
    const demetriInfo = await transporter.sendMail(demetriMailOptions);

    console.log(`✅ Driver flag sent to printer:`, printerInfo.messageId);
    console.log(`✅ Driver flag sent to Demetri:`, demetriInfo.messageId);

    return res.status(200).json({
      success: true,
      message: 'Driver flag report sent successfully',
      printerMessageId: printerInfo.messageId,
      demetriMessageId: demetriInfo.messageId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Send driver flag error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to send driver flag email',
      details: error.message
    });
  }
}
