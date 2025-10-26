/**
 * Vercel Serverless Function: Print Incident Report
 * Generates PDF and sends to Epson printer via Gmail
 */

import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import { jsPDF } from 'jspdf';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const GMAIL_USER = 'jaynascans@gmail.com';
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;
const PRINTER_EMAIL = 'GSS4168CTJJA73@print.epsonconnect.com';

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
    const { incident_id } = req.body;
    const printMode = req.query.print === 'true';

    if (!incident_id) {
      return res.status(400).json({
        success: false,
        error: 'incident_id is required'
      });
    }

    console.log(`${printMode ? '🖨️' : '📥'} Generating incident report PDF for ID ${incident_id}...`);

    // Fetch incident from database
    const { data: incident, error: incidentError } = await supabase
      .from('manager_incidents')
      .select('*')
      .eq('id', incident_id)
      .single();

    if (incidentError || !incident) {
      throw new Error('Incident not found');
    }

    // Generate PDF
    const pdfBase64 = generateIncidentPDF(incident);
    const filename = `Incident_Report_${incident.incident_date}_${incident.id}.pdf`;

    // DOWNLOAD MODE
    if (!printMode) {
      console.log(`✅ PDF generated for download`);

      const pdfBuffer = Buffer.from(pdfBase64, 'base64');

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);

      return res.status(200).send(pdfBuffer);
    }

    // PRINT MODE
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: GMAIL_USER,
        pass: GMAIL_APP_PASSWORD
      }
    });

    const mailOptions = {
      from: `Jayna Manager Logs <${GMAIL_USER}>`,
      to: PRINTER_EMAIL,
      subject: `Print: Incident Report - ${incident.incident_date}`,
      text: '',
      html: '',
      attachments: [{
        filename: filename,
        content: Buffer.from(pdfBase64, 'base64'),
        contentType: 'application/pdf'
      }]
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Incident report sent to printer:`, info.messageId);

    return res.status(200).json({
      success: true,
      message: 'Incident report sent to printer successfully',
      messageId: info.messageId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Print incident error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process incident report',
      details: error.message
    });
  }
}

/**
 * Generate incident report PDF
 */
function generateIncidentPDF(incident) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });

  doc.setCharSpace(0);

  const black = [0, 0, 0];
  const darkGray = [75, 75, 75];
  const lightGray = [200, 200, 200];

  let yPos = 40;

  // HEADER
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...black);
  doc.text('INCIDENT REPORT', 40, yPos);
  yPos += 30;

  // REPORT ID
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...darkGray);
  doc.text(`Report ID: ${incident.id}`, 40, yPos);
  yPos += 25;

  // INCIDENT INFO BOX
  doc.setFillColor(255, 243, 205);
  doc.rect(40, yPos, 532, 80, 'F');
  doc.setDrawColor(255, 153, 0);
  doc.setLineWidth(2);
  doc.rect(40, yPos, 532, 80, 'S');

  yPos += 20;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...black);

  // Date & Time
  const date = new Date(incident.incident_date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  doc.text('INCIDENT DATE & TIME:', 50, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(`${date} at ${incident.incident_time}`, 220, yPos);
  yPos += 16;

  // Department
  doc.setFont('helvetica', 'bold');
  doc.text('DEPARTMENT:', 50, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(incident.department, 220, yPos);
  yPos += 16;

  // Reported By
  doc.setFont('helvetica', 'bold');
  doc.text('REPORTED BY:', 50, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(incident.manager_name, 220, yPos);
  yPos += 16;

  // Staff Involved
  doc.setFont('helvetica', 'bold');
  doc.text('STAFF INVOLVED:', 50, yPos);
  doc.setFont('helvetica', 'normal');
  const staffList = incident.staff_involved.join(', ');
  const staffLines = doc.splitTextToSize(staffList, 300);
  staffLines.forEach((line, idx) => {
    doc.text(line, 220, yPos + (idx * 12));
  });
  yPos += (staffLines.length * 12) + 20;

  // Separator
  doc.setDrawColor(...lightGray);
  doc.setLineWidth(1);
  doc.line(40, yPos, 572, yPos);
  yPos += 20;

  // INCIDENT REPORT
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...black);
  doc.text('INCIDENT DETAILS:', 40, yPos);
  yPos += 18;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const reportLines = doc.splitTextToSize(incident.incident_report, 520);
  reportLines.forEach(line => {
    if (yPos > 720) {
      doc.addPage();
      yPos = 40;
    }
    doc.text(line, 40, yPos);
    yPos += 14;
  });

  yPos += 10;

  // PHOTOS (if any)
  if (incident.photo_urls && incident.photo_urls.length > 0) {
    yPos += 10;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('PHOTOS ATTACHED:', 40, yPos);
    yPos += 16;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`${incident.photo_urls.length} photo(s) - See online report for images`, 40, yPos);
    yPos += 20;
  }

  // Footer
  yPos = 760;
  doc.setDrawColor(...lightGray);
  doc.setLineWidth(1);
  doc.line(40, yPos, 572, yPos);
  yPos += 14;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...darkGray);
  doc.text(`Generated: ${new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })} PST`, 40, yPos);
  doc.text(`Report ID: ${incident.id}`, 400, yPos);

  return doc.output('datauristring').split(',')[1];
}
