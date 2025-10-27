/**
 * Vercel Serverless Function: Archive AMEX Receipts
 * Generates PDF from selected entries, emails to Epson printer, saves to database
 */

import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import { jsPDF } from 'jspdf';
import fetch from 'node-fetch';

const PRINTER_EMAIL = 'GSS4168CTJJA73@print.epsonconnect.com';
const SENDER_EMAIL = 'jaynascans@gmail.com';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('📦 Archiving AMEX receipts...');

    // Initialize Supabase
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { receiptIds, emailToPrinter, approvedBy, previewOnly } = req.body;

    if (!receiptIds || receiptIds.length === 0) {
      return res.status(400).json({ error: 'No receipts selected' });
    }

    // Fetch selected receipts
    const { data: receipts, error: fetchError } = await supabase
      .from('amex_receipts')
      .select('*')
      .in('id', receiptIds)
      .order('purchase_date', { ascending: true });

    if (fetchError) throw fetchError;

    if (!receipts || receipts.length === 0) {
      return res.status(404).json({ error: 'No receipts found' });
    }

    // Calculate totals
    const totalAmount = receipts.reduce((sum, r) => sum + parseFloat(r.amount), 0);
    const dateRangeStart = receipts[0].purchase_date;
    const dateRangeEnd = receipts[receipts.length - 1].purchase_date;

    // Generate PDF
    const pdfBuffer = await generateReceiptsPDF(receipts, totalAmount, supabase);

    // Upload PDF to Supabase Storage
    const pdfFileName = previewOnly
      ? `preview_${Date.now()}.pdf`  // Temp preview file
      : `amex_receipts_${Date.now()}.pdf`;  // Archived file

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('amex-archived-pdfs')
      .upload(pdfFileName, pdfBuffer, {
        contentType: 'application/pdf',
        cacheControl: '3600'
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('amex-archived-pdfs')
      .getPublicUrl(pdfFileName);

    const pdfUrl = urlData.publicUrl;

    // PREVIEW MODE: Just return PDF URL without archiving or deleting
    if (previewOnly) {
      console.log(`📄 Generated preview PDF for ${receipts.length} receipts`);
      return res.json({
        success: true,
        pdfUrl: pdfUrl,
        entryCount: receipts.length,
        totalAmount: totalAmount,
        preview: true
      });
    }

    // ARCHIVE MODE: Save to database, email, and delete receipts
    // Save to archived_pdfs table
    const { data: archiveData, error: archiveError } = await supabase
      .from('amex_archived_pdfs')
      .insert({
        archive_date: new Date().toISOString().split('T')[0],
        pdf_url: pdfUrl,
        entry_count: receipts.length,
        total_amount: totalAmount,
        date_range_start: dateRangeStart,
        date_range_end: dateRangeEnd,
        approved_by: approvedBy || 'Yusuf Topal',
        receipt_ids: receiptIds
      })
      .select()
      .single();

    if (archiveError) throw archiveError;

    // Email to printer if requested
    if (emailToPrinter) {
      await emailPDFToPrinter(pdfBuffer, pdfFileName);

      // Update archive record with email timestamp
      await supabase
        .from('amex_archived_pdfs')
        .update({ emailed_at: new Date().toISOString() })
        .eq('id', archiveData.id);
    }

    // Delete original receipts
    const { error: deleteError } = await supabase
      .from('amex_receipts')
      .delete()
      .in('id', receiptIds);

    if (deleteError) throw deleteError;

    console.log(`✅ Archived ${receipts.length} receipts`);

    return res.json({
      success: true,
      archiveId: archiveData.id,
      pdfUrl: pdfUrl,
      entryCount: receipts.length,
      totalAmount: totalAmount,
      emailedToPrinter: emailToPrinter
    });

  } catch (error) {
    console.error('❌ Error archiving receipts:', error);
    return res.status(500).json({
      error: 'Failed to archive receipts',
      details: error.message
    });
  }
}

/**
 * Generate PDF from receipts (similar to Combined Weekly Report format)
 */
async function generateReceiptsPDF(receipts, totalAmount, supabase) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'in',
    format: 'letter'
  });

  // Aptos-like font (use Helvetica in jsPDF)
  doc.setFont('helvetica');

  let yPos = 0.6;

  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('AMEX RECEIPTS ARCHIVE', 4.25, yPos, { align: 'center' });
  yPos += 0.25;

  // Date Range (formatted with day of week)
  const startDate = new Date(receipts[0].purchase_date + 'T00:00:00');
  const endDate = new Date(receipts[receipts.length - 1].purchase_date + 'T00:00:00');

  const formatDateWithDay = (date) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = days[date.getDay()];
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${dayName} ${month}/${day}/${year}`;
  };

  const dateRangeText = `${formatDateWithDay(startDate)} TO ${formatDateWithDay(endDate)}`;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 100, 100);
  doc.text(dateRangeText, 4.25, yPos, { align: 'center' });
  yPos += 0.2;

  // Card info
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 100, 100);
  doc.text(`CARD ENDING: 1100 | DEMETRI GREGORAKIS | JAYNA ONE INC`, 4.25, yPos, { align: 'center' });
  yPos += 0.2;

  // Archived timestamp (8pt, italicized, small)
  const now = new Date();
  const archiveDateTime = now.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  }).toUpperCase();

  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(150, 150, 150);
  doc.text(`ARCHIVED: ${archiveDateTime}`, 4.25, yPos, { align: 'center' });
  yPos += 0.35;

  // Summary section (left-aligned)
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(33, 33, 33);
  doc.text('SUMMARY', 0.5, yPos);
  yPos += 0.2;

  // Total Entries
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(33, 33, 33);
  const totalEntriesLabel = doc.splitTextToSize('TOTAL ENTRIES:', 1.5);
  doc.text(totalEntriesLabel, 0.5, yPos);

  doc.setFont('helvetica', 'normal');
  doc.text(`${receipts.length}`, 1.8, yPos);
  yPos += 0.2;

  // Total Amount (bold, 90% gray)
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(26, 26, 26); // 90% gray (darker)
  doc.text(`TOTAL AMOUNT: $${totalAmount.toFixed(2)}`, 0.5, yPos);
  yPos += 0.35;

  // Receipts list
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(33, 33, 33);
  doc.text('RECEIPT DETAILS', 0.5, yPos);
  yPos += 0.25;

  // Calculate how many pages the receipt list will take (estimate)
  const receiptsPerPage = 25; // Conservative estimate
  const listPages = Math.ceil(receipts.length / receiptsPerPage);

  // Calculate where image pages will start (after list pages + current page)
  const imagePageStart = doc.internal.getCurrentPageInfo().pageNumber + listPages;

  // Track receipts with images and their future page numbers
  const receiptImagePages = new Map();
  let imagePageCounter = imagePageStart;

  receipts.forEach(receipt => {
    if (receipt.image_urls && receipt.image_urls.length > 0) {
      receiptImagePages.set(receipt.id, imagePageCounter);
      imagePageCounter += receipt.image_urls.length; // One page per image
    }
  });

  // Table header
  doc.setFillColor(66, 66, 66);
  doc.rect(0.5, yPos - 0.05, 7.5, 0.2, 'F');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('VENDOR', 0.6, yPos + 0.08);
  doc.text('DATE', 1.8, yPos + 0.08);
  doc.text('AMOUNT', 2.8, yPos + 0.08);
  doc.text('CATEGORY', 3.6, yPos + 0.08);
  doc.text('DETAILS', 4.8, yPos + 0.08);
  doc.text('IMAGE', 7.3, yPos + 0.08);

  yPos += 0.25;

  // Receipts (alternating Jayna blue background)
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(66, 66, 66);

  for (const receipt of receipts) {
    if (yPos > 9.5) {
      doc.addPage();
      yPos = 0.7;
    }

    // Pre-calculate wrapped text to determine row height
    const vendorText = receipt.vendor || 'N/A';
    const wrappedVendor = doc.splitTextToSize(vendorText, 1.0);
    const categoryText = receipt.category || 'N/A';
    const wrappedCategory = doc.splitTextToSize(categoryText, 0.9);
    const detailsText = receipt.details || 'N/A';
    const wrappedDetails = doc.splitTextToSize(detailsText, 2.3);

    // Calculate max lines needed (determines row height)
    const maxLines = Math.max(
      Math.min(wrappedVendor.length, 2),
      Math.min(wrappedCategory.length, 2),
      Math.min(wrappedDetails.length, 2)
    );

    // Dynamic row height based on content (0.5" base + extra for wrapped lines)
    const baseRowHeight = 0.5;
    const extraHeightPerLine = 0.15;
    const rowHeight = baseRowHeight + (maxLines > 1 ? extraHeightPerLine * (maxLines - 1) : 0);

    // Alternating row background (pale Jayna blue like UI)
    if (receipts.indexOf(receipt) % 2 === 0) {
      doc.setFillColor(239, 246, 255); // Jayna blue pale
      doc.rect(0.5, yPos, 7.5, rowHeight, 'F'); // Full row height background
    }

    // Vertical centering: start text at center of row
    const textYPos = yPos + (rowHeight / 2) + 0.03; // Center text vertically + slight offset for baseline

    // Vendor (with wrapping) - BOLD
    doc.setFont('helvetica', 'bold');
    doc.text(wrappedVendor.slice(0, 2), 0.6, textYPos); // Max 2 lines
    doc.setFont('helvetica', 'normal');

    // Date
    doc.text(receipt.purchase_date, 1.8, textYPos);

    // Amount
    doc.text(`$${parseFloat(receipt.amount).toFixed(2)}`, 2.8, textYPos);

    // Category (with wrapping)
    doc.text(wrappedCategory.slice(0, 2), 3.6, textYPos); // Max 2 lines

    // Details (with wrapping)
    doc.text(wrappedDetails.slice(0, 2), 4.8, textYPos); // Max 2 lines

    // Image page reference
    if (receiptImagePages.has(receipt.id)) {
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(59, 130, 246); // Jayna blue
      doc.setFontSize(8);
      doc.text(`Pg ${receiptImagePages.get(receipt.id)}`, 7.3, textYPos);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(66, 66, 66);
      doc.setFontSize(9);
    }

    // Move to next row (row height + small gap for visual separation)
    yPos += rowHeight + 0.08;
  }

  // Add image appendix pages
  for (const receipt of receipts) {
    if (receipt.image_urls && receipt.image_urls.length > 0) {
      for (const imageUrl of receipt.image_urls) {
        try {
          // Fetch image
          const imageResponse = await fetch(imageUrl);
          const imageBuffer = await imageResponse.buffer();
          const imageBase64 = imageBuffer.toString('base64');

          // Add new page for image
          doc.addPage();

          // Add header with receipt details
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(33, 33, 33);
          doc.text('RECEIPT IMAGE', 4.25, 0.5, { align: 'center' });

          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(100, 100, 100);
          doc.text(`${receipt.purchase_date} | ${receipt.category} | $${parseFloat(receipt.amount).toFixed(2)}`, 4.25, 0.75, { align: 'center' });

          if (receipt.details) {
            doc.setFontSize(9);
            const wrappedDetails = doc.splitTextToSize(receipt.details, 7);
            doc.text(wrappedDetails, 4.25, 0.95, { align: 'center' });
          }

          // Add image (centered, maximum size while maintaining aspect ratio)
          const imgProps = doc.getImageProperties(`data:image/jpeg;base64,${imageBase64}`);
          const imgWidth = imgProps.width;
          const imgHeight = imgProps.height;
          const ratio = imgWidth / imgHeight;

          // Max dimensions (leave margins)
          const maxWidth = 7;
          const maxHeight = 9;

          let finalWidth = maxWidth;
          let finalHeight = maxWidth / ratio;

          if (finalHeight > maxHeight) {
            finalHeight = maxHeight;
            finalWidth = maxHeight * ratio;
          }

          const xPos = (8.5 - finalWidth) / 2;
          const yPos = 1.5;

          doc.addImage(`data:image/jpeg;base64,${imageBase64}`, 'JPEG', xPos, yPos, finalWidth, finalHeight);

        } catch (err) {
          console.warn('Could not load image for receipt:', receipt.id, err);
        }
      }
    }
  }

  // Footer
  yPos = 10.5;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(189, 189, 189);
  doc.text('GENERATED AUTOMATICALLY USING THE JAYNA ONE APP, CREATED BY DEMETRI GREGORAKIS', 4.25, yPos, { align: 'center' });

  return Buffer.from(doc.output('arraybuffer'));
}

/**
 * Email PDF to Epson printer (blank body, PDF attachment only)
 */
async function emailPDFToPrinter(pdfBuffer, pdfFileName) {
  const gmailUser = process.env.GMAIL_USER || SENDER_EMAIL;
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;

  if (!gmailAppPassword) {
    throw new Error('Gmail app password not configured');
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: gmailUser,
      pass: gmailAppPassword
    }
  });

  const mailOptions = {
    from: `"JAYNA RECEIPTS" <${gmailUser}>`,
    to: PRINTER_EMAIL,
    subject: 'AMEX Receipts',
    text: '', // Blank body as requested
    attachments: [
      {
        filename: pdfFileName,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }
    ]
  };

  await transporter.sendMail(mailOptions);
  console.log('✅ PDF emailed to printer');
}
