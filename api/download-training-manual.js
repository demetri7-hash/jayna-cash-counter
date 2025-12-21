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
    const margin = 40;
    const contentWidth = pageWidth - (margin * 2);

    console.log(`Page dimensions: ${pageWidth}x${pageHeight}`);

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

      // Render unit content
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
 * Generate cover page
 */
function generateCoverPage(doc, pageWidth, pageHeight, margin) {
  // Blue header bar
  doc.setFillColor(0, 168, 225); // Jayna blue
  doc.rect(0, 0, pageWidth, 80, 'F');

  // Main title
  doc.setFontSize(32);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('JAYNA GYRO', pageWidth / 2, 100, { align: 'center' });

  doc.setFontSize(24);
  doc.text('30-DAY TRAINING PROGRAM', pageWidth / 2, 140, { align: 'center' });

  // Subtitle
  doc.setFontSize(16);
  doc.setFont('helvetica', 'normal');
  doc.text('Assistant Manager Onboarding Manual', pageWidth / 2, 180, { align: 'center' });

  // Decorative line
  doc.setDrawColor(0, 168, 225);
  doc.setLineWidth(2);
  doc.line(margin, 220, pageWidth - margin, 220);

  // Content description
  doc.setFontSize(12);
  doc.setTextColor(33, 33, 33);
  doc.setFont('helvetica', 'normal');

  const description = [
    'This comprehensive training manual contains:',
    '',
    '• 5 Core Training Modules (30 units total)',
    '• Foundation & Culture',
    '• Operations Mastery',
    '• Guest Experience & Service Recovery',
    '• Bar Program (101 & 102)',
    '• Leadership & Management',
    '',
    '• Signature Cocktail Recipe Cards',
    '• Complete Reflection Workbooks',
    '• Detailed Lesson Plans & Activities',
    '',
    'Total Training Duration: 100-120 hours',
    'Designed for zero-experience new hires',
    'Focus on culture, hospitality, and systems'
  ];

  let y = 280;
  description.forEach(line => {
    doc.text(line, pageWidth / 2, y, { align: 'center' });
    y += 20;
  });

  // Bottom info box
  doc.setFillColor(245, 245, 245);
  doc.rect(margin, pageHeight - 180, pageWidth - (margin * 2), 100, 'F');
  doc.setDrawColor(0, 168, 225);
  doc.setLineWidth(2);
  doc.rect(margin, pageHeight - 180, pageWidth - (margin * 2), 100);

  doc.setFontSize(10);
  doc.setTextColor(66, 66, 66);
  doc.setFont('helvetica', 'bold');
  y = pageHeight - 155;
  doc.text('TRAINEE:', margin + 20, y);
  doc.text('START DATE:', margin + 20, y + 25);
  doc.text('TRAINER:', margin + 20, y + 50);

  doc.setFont('helvetica', 'normal');
  doc.text('Heming Huang', margin + 100, y);
  doc.text('_____________________', margin + 120, y + 25);
  doc.text('Demetri Gregorakis', margin + 100, y + 50);

  // Generated date
  const today = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text(`Generated: ${today}`, pageWidth / 2, pageHeight - 40, { align: 'center' });
}

/**
 * Generate table of contents
 */
function generateTableOfContents(doc, pageWidth, pageHeight, margin, contentWidth) {
  // Blue header bar
  doc.setFillColor(0, 168, 225);
  doc.rect(0, 0, pageWidth, 6, 'F');

  let y = 80;

  // Title
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(33, 33, 33);
  doc.text('TABLE OF CONTENTS', margin, y);

  y += 40;

  // Content items
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');

  const tocItems = [
    { title: 'MODULE 1: Foundation & Culture', page: '3' },
    { title: 'MODULE 2: Operations Mastery', page: '—' },
    { title: 'MODULE 3: Guest Experience & Service Recovery', page: '—' },
    { title: 'MODULE 4: Bar Program (101 & 102)', page: '—' },
    { title: 'MODULE 5: Leadership & Management', page: '—' },
    { title: '', page: '' },
    { title: 'SIGNATURE COCKTAIL RECIPES', page: '—' },
    { title: '', page: '' },
    { title: 'REFLECTION WORKBOOKS (Modules 1-5)', page: '—' }
  ];

  tocItems.forEach(item => {
    if (item.title) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(33, 33, 33);
      doc.text(item.title, margin + 20, y);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(120, 120, 120);
      doc.text(item.page, pageWidth - margin - 40, y);
    }
    y += 24;
  });

  // Note
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'italic');
  y += 20;
  doc.text('Each module contains detailed lesson plans, activities, and assessment tools.', margin + 20, y);
  y += 14;
  doc.text('Reflection workbooks are to be completed by trainee during training.', margin + 20, y);
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
 * Render unit content from structured JSON
 */
function renderUnitContent(doc, unit, pageWidth, pageHeight, margin, contentWidth) {
  let y = 60;

  // Blue header bar
  doc.setFillColor(0, 168, 225);
  doc.rect(0, 0, pageWidth, 6, 'F');

  // Unit title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 168, 225);
  doc.text(`UNIT ${unit.module}.${unit.unit}: ${unit.title}`, margin, y);
  y += 25;

  // Metadata box
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(66, 66, 66);

  if (unit.duration) {
    doc.text(`Duration: ${unit.duration}`, margin, y);
    y += 12;
  }
  if (unit.trainer) {
    doc.text(`Trainer: ${unit.trainer}`, margin, y);
    y += 12;
  }
  if (unit.location) {
    doc.text(`Location: ${unit.location}`, margin, y);
    y += 12;
  }

  y += 8;

  // Purpose
  if (unit.purpose) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(33, 33, 33);
    doc.text('PURPOSE', margin, y);
    y += 14;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(66, 66, 66);
    const purposeLines = doc.splitTextToSize(unit.purpose, contentWidth);
    purposeLines.forEach(line => {
      if (y > pageHeight - 80) {
        doc.addPage();
        doc.setFillColor(0, 168, 225);
        doc.rect(0, 0, pageWidth, 6, 'F');
        y = 60;
      }
      doc.text(line, margin, y);
      y += 13;
    });
    y += 10;
  }

  // Content sections
  if (unit.contentSections && unit.contentSections.length > 0) {
    for (const section of unit.contentSections) {
      // Section heading
      if (section.heading) {
        if (y > pageHeight - 80) {
          doc.addPage();
          doc.setFillColor(0, 168, 225);
          doc.rect(0, 0, pageWidth, 6, 'F');
          y = 60;
        }

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(33, 33, 33);
        doc.text(section.heading, margin, y);
        y += 18;
      }

      // Render section content
      if (section.content && Array.isArray(section.content)) {
        for (const item of section.content) {
          if (y > pageHeight - 80) {
            doc.addPage();
            doc.setFillColor(0, 168, 225);
            doc.rect(0, 0, pageWidth, 6, 'F');
            y = 60;
          }

          if (item.type === 'heading') {
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(66, 66, 66);
            doc.text(item.content, margin, y);
            y += 16;
          } else if (item.type === 'paragraph') {
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(66, 66, 66);
            const lines = doc.splitTextToSize(item.content, contentWidth);
            lines.forEach(line => {
              if (y > pageHeight - 80) {
                doc.addPage();
                doc.setFillColor(0, 168, 225);
                doc.rect(0, 0, pageWidth, 6, 'F');
                y = 60;
              }
              doc.text(line, margin, y);
              y += 13;
            });
            y += 6;
          } else if (item.type === 'list' && item.items) {
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(66, 66, 66);
            item.items.forEach(listItem => {
              const lines = doc.splitTextToSize(`• ${listItem}`, contentWidth - 10);
              lines.forEach(line => {
                if (y > pageHeight - 80) {
                  doc.addPage();
                  doc.setFillColor(0, 168, 225);
                  doc.rect(0, 0, pageWidth, 6, 'F');
                  y = 60;
                }
                doc.text(line, margin + 10, y);
                y += 13;
              });
            });
            y += 6;
          }
        }
      }

      y += 8;
    }
  }

  // Activities
  if (unit.activities && unit.activities.length > 0) {
    if (y > pageHeight - 100) {
      doc.addPage();
      doc.setFillColor(0, 168, 225);
      doc.rect(0, 0, pageWidth, 6, 'F');
      y = 60;
    }

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 168, 225);
    doc.text('ACTIVITIES', margin, y);
    y += 20;

    unit.activities.forEach(activity => {
      if (y > pageHeight - 80) {
        doc.addPage();
        doc.setFillColor(0, 168, 225);
        doc.rect(0, 0, pageWidth, 6, 'F');
        y = 60;
      }

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(33, 33, 33);
      doc.text(activity.title, margin, y);
      y += 16;

      // Render activity content (similar to section content)
      if (activity.content && Array.isArray(activity.content)) {
        activity.content.forEach(item => {
          if (y > pageHeight - 80) {
            doc.addPage();
            doc.setFillColor(0, 168, 225);
            doc.rect(0, 0, pageWidth, 6, 'F');
            y = 60;
          }

          if (item.type === 'paragraph') {
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(66, 66, 66);
            const lines = doc.splitTextToSize(item.content, contentWidth);
            lines.forEach(line => {
              doc.text(line, margin, y);
              y += 13;
            });
          } else if (item.type === 'list' && item.items) {
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            item.items.forEach(listItem => {
              const lines = doc.splitTextToSize(`• ${listItem}`, contentWidth - 10);
              lines.forEach(line => {
                doc.text(line, margin + 10, y);
                y += 13;
              });
            });
          }
        });
      }

      y += 10;
    });
  }

  // Reflection questions
  if (unit.reflection && unit.reflection.length > 0) {
    if (y > pageHeight - 100) {
      doc.addPage();
      doc.setFillColor(0, 168, 225);
      doc.rect(0, 0, pageWidth, 6, 'F');
      y = 60;
    }

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 168, 225);
    doc.text('REFLECTION', margin, y);
    y += 20;

    unit.reflection.forEach(question => {
      if (y > pageHeight - 100) {
        doc.addPage();
        doc.setFillColor(0, 168, 225);
        doc.rect(0, 0, pageWidth, 6, 'F');
        y = 60;
      }

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(33, 33, 33);
      const lines = doc.splitTextToSize(question, contentWidth);
      lines.forEach(line => {
        doc.text(line, margin, y);
        y += 13;
      });

      y += 6;

      // Add blank line for answer
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.5);
      doc.line(margin, y, pageWidth - margin, y);
      y += 30;
    });
  }
}

/**
 * Add footers to all pages
 */
function addFootersToAllPages(doc, pageWidth, pageHeight, margin) {
  const pageCount = doc.internal.getNumberOfPages();
  const generatedTime = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    // Skip footer on cover page
    if (i === 1) continue;

    // Page number (center)
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.setFont('helvetica', 'normal');
    doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 25, { align: 'center' });

    // Generated date (left)
    doc.setFontSize(8);
    doc.text(`Generated: ${generatedTime}`, margin, pageHeight - 25);

    // Credit (right)
    doc.setFont('helvetica', 'bold');
    doc.text('JAYNA GYRO SACRAMENTO', pageWidth - margin, pageHeight - 25, { align: 'right' });
  }
}
