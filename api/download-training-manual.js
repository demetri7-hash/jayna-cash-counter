/**
 * Generate Complete Training Manual PDF
 * Uses pre-processed JSON files for fast, reliable rendering
 * Brand-ready format matching existing Jayna PDF style
 */

import { jsPDF } from 'jspdf';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function handler(req, res) {
  try {
    console.log('=== TRAINING MANUAL GENERATION START ===');

    // Use pre-processed JSON files (much faster and more reliable)
    const processedDir = path.join(process.cwd(), 'training', 'processed');
    console.log('Looking for processed files in:', processedDir);

    if (!fs.existsSync(processedDir)) {
      throw new Error(`Processed directory not found: ${processedDir}`);
    }

    const allUnits = [];

    // Load all 30 unit JSON files
    for (let moduleNum = 1; moduleNum <= 5; moduleNum++) {
      for (let unitNum = 1; unitNum <= 6; unitNum++) {
        const filename = `module_${moduleNum}_unit_${unitNum}.json`;
        const filePath = path.join(processedDir, filename);

        if (fs.existsSync(filePath)) {
          const jsonContent = fs.readFileSync(filePath, 'utf-8');
          const unitData = JSON.parse(jsonContent);

          allUnits.push({
            module: moduleNum,
            unit: unitNum,
            ...unitData.unit
          });

          console.log(`✓ Loaded Module ${moduleNum}, Unit ${unitNum}`);
        }
      }
    }

    console.log(`✅ Loaded ${allUnits.length} units`);

    // Generate PDF
    console.log('Starting PDF generation...');
    const pdfBuffer = await generateTrainingManualPDF(allUnits);
    console.log(`PDF generated, size: ${pdfBuffer.length} bytes`);

    // Return PDF as download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="Jayna_Gyro_Training_Manual_Complete.pdf"');
    res.send(pdfBuffer);

    console.log('=== TRAINING MANUAL GENERATION SUCCESS ===');

  } catch (error) {
    console.error('=== TRAINING MANUAL GENERATION ERROR ===');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    return res.status(500).json({
      error: 'Failed to generate training manual',
      details: error.message,
      stack: error.stack
    });
  }
}

/**
 * Generate complete training manual PDF from structured JSON
 */
async function generateTrainingManualPDF(allUnits) {
  try {
    console.log('Creating jsPDF instance...');
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'letter'
    });

    const pageWidth = doc.internal.pageSize.width; // 612pt
    const pageHeight = doc.internal.pageSize.height; // 792pt
    const margin = 20; // REDUCED from 40 to 20 for narrow margins
    const contentWidth = pageWidth - (margin * 2);

    console.log(`Page dimensions: ${pageWidth}x${pageHeight}, margins: ${margin}pt`);

    // ========== COVER PAGE ==========
    generateCoverPage(doc, pageWidth, pageHeight, margin);

    // ========== TABLE OF CONTENTS ==========
    doc.addPage();
    generateTableOfContents(doc, pageWidth, pageHeight, margin, contentWidth);

    // ========== ALL UNITS (GROUPED BY MODULE) ==========
    let currentModule = 0;

    for (const unit of allUnits) {
      // Add module separator page when starting new module
      if (unit.module !== currentModule) {
        doc.addPage();
        renderModuleSeparator(doc, unit.module, pageWidth, pageHeight, margin);
        currentModule = unit.module;
      }

      // Render unit content (NEW PAGE for each unit)
      doc.addPage();
      renderUnitContent(doc, unit, pageWidth, pageHeight, margin, contentWidth);
    }

    // ========== FOOTER ON ALL PAGES ==========
    console.log('Adding footers...');
    addFootersToAllPages(doc, pageWidth, pageHeight, margin);

    console.log('Converting to buffer...');
    const buffer = Buffer.from(doc.output('arraybuffer'));
    console.log(`✅ PDF complete: ${buffer.length} bytes`);

    return buffer;

  } catch (error) {
    console.error('Error in generateTrainingManualPDF:', error);
    throw error;
  }
}

/**
 * Generate cover page (COMPACT VERSION)
 */
function generateCoverPage(doc, pageWidth, pageHeight, margin) {
  // Blue header bar (smaller)
  doc.setFillColor(0, 168, 225);
  doc.rect(0, 0, pageWidth, 60, 'F');

  // Main title
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('JAYNA GYRO', pageWidth / 2, 80, { align: 'center' });

  doc.setFontSize(20);
  doc.text('30-DAY TRAINING PROGRAM', pageWidth / 2, 110, { align: 'center' });

  // Subtitle
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Assistant Manager Onboarding Manual', pageWidth / 2, 140, { align: 'center' });

  // Decorative line
  doc.setDrawColor(0, 168, 225);
  doc.setLineWidth(2);
  doc.line(margin + 60, 160, pageWidth - margin - 60, 160);

  // Content description (compact)
  doc.setFontSize(9);
  doc.setTextColor(33, 33, 33);
  doc.setFont('helvetica', 'normal');

  const description = [
    'This comprehensive training manual contains:',
    '',
    '• 5 Core Training Modules (30 units total)',
    '• Foundation & Culture | Operations Mastery',
    '• Guest Experience | Bar Program | Leadership',
    '',
    '• Complete Reflection Workbooks',
    '• Detailed Lesson Plans & Activities',
    '',
    'Total Training Duration: 100-120 hours'
  ];

  let y = 200;
  description.forEach(line => {
    doc.text(line, pageWidth / 2, y, { align: 'center' });
    y += 14;
  });

  // Bottom info box (compact)
  doc.setFillColor(245, 245, 245);
  doc.rect(margin, pageHeight - 140, pageWidth - (margin * 2), 80, 'F');
  doc.setDrawColor(0, 168, 225);
  doc.setLineWidth(2);
  doc.rect(margin, pageHeight - 140, pageWidth - (margin * 2), 80);

  doc.setFontSize(8);
  doc.setTextColor(66, 66, 66);
  doc.setFont('helvetica', 'bold');
  y = pageHeight - 120;
  doc.text('TRAINEE:', margin + 15, y);
  doc.text('START DATE:', margin + 15, y + 20);
  doc.text('TRAINER:', margin + 15, y + 40);

  doc.setFont('helvetica', 'normal');
  doc.text('Heming Huang', margin + 80, y);
  doc.text('_____________________', margin + 100, y + 20);
  doc.text('Demetri Gregorakis', margin + 80, y + 40);

  // Generated date
  const today = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text(`Generated: ${today}`, pageWidth / 2, pageHeight - 30, { align: 'center' });
}

/**
 * Generate table of contents (COMPACT VERSION)
 */
function generateTableOfContents(doc, pageWidth, pageHeight, margin, contentWidth) {
  // Blue header bar
  doc.setFillColor(0, 168, 225);
  doc.rect(0, 0, pageWidth, 4, 'F');

  let y = 50;

  // Title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(33, 33, 33);
  doc.text('TABLE OF CONTENTS', margin, y);

  y += 30;

  // Content items (compact)
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');

  const tocItems = [
    { title: 'MODULE 1: Foundation & Culture (6 units)', page: '' },
    { title: 'MODULE 2: Operations Mastery (6 units)', page: '' },
    { title: 'MODULE 3: Guest Experience (6 units)', page: '' },
    { title: 'MODULE 4: Bar Program (6 units)', page: '' },
    { title: 'MODULE 5: Leadership (6 units)', page: '' }
  ];

  tocItems.forEach(item => {
    if (item.title) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(33, 33, 33);
      doc.text(item.title, margin + 10, y);
    }
    y += 16;
  });

  // Note (compact)
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'italic');
  y += 12;
  doc.text('Each module contains lesson plans, activities, and reflection questions.', margin + 10, y);
  y += 11;
  doc.text('All 30 units included with complete training materials.', margin + 10, y);
}

/**
 * Render module separator page
 */
function renderModuleSeparator(doc, moduleNum, pageWidth, pageHeight, margin) {
  // Blue header bar
  doc.setFillColor(0, 168, 225);
  doc.rect(0, 0, pageWidth, 80, 'F');

  // Module number
  doc.setFontSize(48);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(`MODULE ${moduleNum}`, pageWidth / 2, 120, { align: 'center' });

  // Module titles
  const moduleTitles = {
    1: 'FOUNDATION & CULTURE',
    2: 'OPERATIONS MASTERY',
    3: 'GUEST EXPERIENCE',
    4: 'BAR PROGRAM',
    5: 'LEADERSHIP'
  };

  doc.setFontSize(24);
  doc.setTextColor(33, 33, 33);
  doc.text(moduleTitles[moduleNum] || '', pageWidth / 2, 200, { align: 'center' });

  // Decorative line
  doc.setDrawColor(0, 168, 225);
  doc.setLineWidth(2);
  doc.line(margin + 100, 240, pageWidth - margin - 100, 240);
}

/**
 * Render unit content from structured JSON (COMPACT 8PT VERSION)
 */
function renderUnitContent(doc, unit, pageWidth, pageHeight, margin, contentWidth) {
  let y = 40; // Start higher on page

  // Blue header bar (thinner)
  doc.setFillColor(0, 168, 225);
  doc.rect(0, 0, pageWidth, 4, 'F');

  // Unit title (reduced size)
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 168, 225);
  doc.text(`UNIT ${unit.module}.${unit.unit}: ${unit.title}`, margin, y);
  y += 14;

  // Metadata (compact)
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(66, 66, 66);

  const metadata = [];
  if (unit.duration) metadata.push(`Duration: ${unit.duration}`);
  if (unit.trainer) metadata.push(`Trainer: ${unit.trainer}`);
  if (unit.location) metadata.push(`Location: ${unit.location}`);

  if (metadata.length > 0) {
    doc.text(metadata.join(' | '), margin, y);
    y += 10;
  }

  // Purpose (compact)
  if (unit.purpose) {
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(33, 33, 33);
    doc.text('PURPOSE:', margin, y);
    y += 10;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(66, 66, 66);
    const purposeLines = doc.splitTextToSize(unit.purpose, contentWidth);
    purposeLines.forEach(line => {
      if (y > pageHeight - 40) {
        doc.addPage();
        doc.setFillColor(0, 168, 225);
        doc.rect(0, 0, pageWidth, 4, 'F');
        y = 30;
      }
      doc.text(line, margin, y);
      y += 9; // Tighter line spacing
    });
    y += 6;
  }

  // Content sections
  if (unit.contentSections && unit.contentSections.length > 0) {
    for (const section of unit.contentSections) {
      // Section heading
      if (section.heading) {
        // Check if we have room for heading + at least 3 lines
        if (y > pageHeight - 60) {
          doc.addPage();
          doc.setFillColor(0, 168, 225);
          doc.rect(0, 0, pageWidth, 4, 'F');
          y = 30;
        }

        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(33, 33, 33);
        doc.text(section.heading, margin, y);
        y += 12;
      }

      // Render section content
      if (section.content && Array.isArray(section.content)) {
        for (const item of section.content) {
          if (y > pageHeight - 40) {
            doc.addPage();
            doc.setFillColor(0, 168, 225);
            doc.rect(0, 0, pageWidth, 4, 'F');
            y = 30;
          }

          if (item.type === 'heading') {
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(66, 66, 66);
            doc.text(item.content, margin, y);
            y += 11;
          } else if (item.type === 'paragraph') {
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(66, 66, 66);
            const lines = doc.splitTextToSize(item.content, contentWidth);
            lines.forEach(line => {
              if (y > pageHeight - 40) {
                doc.addPage();
                doc.setFillColor(0, 168, 225);
                doc.rect(0, 0, pageWidth, 4, 'F');
                y = 30;
              }
              doc.text(line, margin, y);
              y += 9;
            });
            y += 3;
          } else if (item.type === 'list' && item.items) {
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(66, 66, 66);
            item.items.forEach(listItem => {
              const lines = doc.splitTextToSize(`• ${listItem}`, contentWidth - 8);
              lines.forEach(line => {
                if (y > pageHeight - 40) {
                  doc.addPage();
                  doc.setFillColor(0, 168, 225);
                  doc.rect(0, 0, pageWidth, 4, 'F');
                  y = 30;
                }
                doc.text(line, margin + 8, y);
                y += 9;
              });
            });
            y += 3;
          }
        }
      }

      y += 4; // Small gap between sections
    }
  }

  // Activities
  if (unit.activities && unit.activities.length > 0) {
    // Add page break before activities if needed
    if (y > pageHeight - 80) {
      doc.addPage();
      doc.setFillColor(0, 168, 225);
      doc.rect(0, 0, pageWidth, 4, 'F');
      y = 30;
    }

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 168, 225);
    doc.text('ACTIVITIES', margin, y);
    y += 12;

    unit.activities.forEach(activity => {
      if (y > pageHeight - 50) {
        doc.addPage();
        doc.setFillColor(0, 168, 225);
        doc.rect(0, 0, pageWidth, 4, 'F');
        y = 30;
      }

      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(33, 33, 33);
      doc.text(activity.title, margin, y);
      y += 11;

      // Render activity content
      if (activity.content && Array.isArray(activity.content)) {
        activity.content.forEach(item => {
          if (y > pageHeight - 40) {
            doc.addPage();
            doc.setFillColor(0, 168, 225);
            doc.rect(0, 0, pageWidth, 4, 'F');
            y = 30;
          }

          if (item.type === 'paragraph') {
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(66, 66, 66);
            const lines = doc.splitTextToSize(item.content, contentWidth);
            lines.forEach(line => {
              doc.text(line, margin, y);
              y += 9;
            });
          } else if (item.type === 'list' && item.items) {
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            item.items.forEach(listItem => {
              const lines = doc.splitTextToSize(`• ${listItem}`, contentWidth - 8);
              lines.forEach(line => {
                doc.text(line, margin + 8, y);
                y += 9;
              });
            });
          }
        });
      }

      y += 6;
    });
  }

  // Reflection questions
  if (unit.reflection && unit.reflection.length > 0) {
    // Add page break before reflection if needed
    if (y > pageHeight - 80) {
      doc.addPage();
      doc.setFillColor(0, 168, 225);
      doc.rect(0, 0, pageWidth, 4, 'F');
      y = 30;
    }

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 168, 225);
    doc.text('REFLECTION', margin, y);
    y += 12;

    unit.reflection.forEach(question => {
      if (y > pageHeight - 60) {
        doc.addPage();
        doc.setFillColor(0, 168, 225);
        doc.rect(0, 0, pageWidth, 4, 'F');
        y = 30;
      }

      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(33, 33, 33);
      const lines = doc.splitTextToSize(question, contentWidth);
      lines.forEach(line => {
        doc.text(line, margin, y);
        y += 9;
      });

      y += 4;

      // Add blank line for answer (shorter)
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.5);
      doc.line(margin, y, pageWidth - margin, y);
      y += 18; // Reduced from 30
    });
  }
}

/**
 * Add footers to all pages (COMPACT VERSION)
 */
function addFootersToAllPages(doc, pageWidth, pageHeight, margin) {
  const pageCount = doc.internal.getNumberOfPages();
  const generatedTime = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    // Skip footer on cover page
    if (i === 1) continue;

    // Page number (center)
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    doc.setFont('helvetica', 'normal');
    doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 15, { align: 'center' });

    // Generated date (left)
    doc.setFontSize(6);
    doc.text(`${generatedTime}`, margin, pageHeight - 15);

    // Credit (right)
    doc.setFont('helvetica', 'bold');
    doc.text('JAYNA GYRO', pageWidth - margin, pageHeight - 15, { align: 'right' });
  }
}
