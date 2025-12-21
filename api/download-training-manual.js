/**
 * Generate Complete Training Manual PDF
 * All 5 modules + signature cocktails + reflection workbooks
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
    console.log('Current directory:', process.cwd());

    // Read all training modules and workbooks
    const modulesDir = path.join(process.cwd(), 'training', 'modules');
    console.log('Modules directory:', modulesDir);

    // Check if directory exists
    if (!fs.existsSync(modulesDir)) {
      throw new Error(`Modules directory not found: ${modulesDir}`);
    }

    const allFiles = fs.readdirSync(modulesDir);
    console.log('Files in modules directory:', allFiles);

    const trainingContent = {
      modules: [],
      workbooks: [],
      cocktails: null
    };

    // Load all 5 modules
    for (let i = 1; i <= 5; i++) {
      console.log(`Loading module ${i}...`);

      const mainFile = allFiles.find(f =>
        f.startsWith(`MODULE_${i}_`) &&
        !f.includes('REFLECTION') &&
        !f.includes('WORKBOOK')
      );

      const workbookFile = allFiles.find(f =>
        f.startsWith(`MODULE_${i}_`) &&
        (f.includes('REFLECTION') || f.includes('WORKBOOK'))
      );

      console.log(`  Main file: ${mainFile}`);
      console.log(`  Workbook file: ${workbookFile}`);

      if (mainFile) {
        const content = fs.readFileSync(path.join(modulesDir, mainFile), 'utf-8');
        console.log(`  Main content length: ${content.length} chars`);
        trainingContent.modules.push({
          number: i,
          filename: mainFile,
          content: content
        });
      }

      if (workbookFile) {
        const content = fs.readFileSync(path.join(modulesDir, workbookFile), 'utf-8');
        console.log(`  Workbook content length: ${content.length} chars`);
        trainingContent.workbooks.push({
          number: i,
          filename: workbookFile,
          content: content
        });
      }
    }

    // Load cocktail recipes
    const cocktailFile = allFiles.find(f => f.includes('SIGNATURE_COCKTAIL'));
    console.log('Cocktail file:', cocktailFile);
    if (cocktailFile) {
      trainingContent.cocktails = fs.readFileSync(path.join(modulesDir, cocktailFile), 'utf-8');
      console.log(`Cocktail content length: ${trainingContent.cocktails.length} chars`);
    }

    console.log(`✅ Loaded ${trainingContent.modules.length} modules, ${trainingContent.workbooks.length} workbooks`);

    // Generate PDF
    console.log('Starting PDF generation...');
    const pdfBuffer = await generateTrainingManualPDF(trainingContent);
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
 * Generate complete training manual PDF
 */
async function generateTrainingManualPDF(trainingContent) {
  try {
    console.log('Creating jsPDF instance...');
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'letter'
    });

    console.log('jsPDF instance created successfully');

    const pageWidth = doc.internal.pageSize.width; // 612pt
    const pageHeight = doc.internal.pageSize.height; // 792pt
    const margin = 40;
    const contentWidth = pageWidth - (margin * 2);

    console.log(`Page dimensions: ${pageWidth}x${pageHeight}, margin: ${margin}`);

  // ========== COVER PAGE ==========
  generateCoverPage(doc, pageWidth, pageHeight, margin);

  // ========== TABLE OF CONTENTS ==========
  doc.addPage();
  generateTableOfContents(doc, pageWidth, pageHeight, margin, contentWidth);

  // ========== EACH MODULE ==========
  for (const module of trainingContent.modules) {
    doc.addPage();
    renderModuleContent(doc, module, pageWidth, pageHeight, margin, contentWidth);
  }

  // ========== SIGNATURE COCKTAILS ==========
  if (trainingContent.cocktails) {
    doc.addPage();
    renderCocktailRecipes(doc, trainingContent.cocktails, pageWidth, pageHeight, margin, contentWidth);
  }

  // ========== REFLECTION WORKBOOKS ==========
  for (const workbook of trainingContent.workbooks) {
    doc.addPage();
    renderWorkbookContent(doc, workbook, pageWidth, pageHeight, margin, contentWidth);
  }

  // ========== FOOTER ON ALL PAGES ==========
  console.log('Adding footers to all pages...');
  addFootersToAllPages(doc, pageWidth, pageHeight, margin);

  console.log('Converting PDF to buffer...');
  const buffer = Buffer.from(doc.output('arraybuffer'));
  console.log(`PDF buffer created, size: ${buffer.length} bytes`);

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
 * Render module content from markdown
 */
function renderModuleContent(doc, module, pageWidth, pageHeight, margin, contentWidth) {
  const lines = module.content.split('\n');
  let y = 80;

  // Blue header bar
  doc.setFillColor(0, 168, 225);
  doc.rect(0, 0, pageWidth, 6, 'F');

  // Module title (first line)
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 168, 225);
  const moduleTitleMatch = lines[0].match(/# MODULE \d+: (.+)/);
  if (moduleTitleMatch) {
    doc.text(`MODULE ${module.number}: ${moduleTitleMatch[1]}`, margin, y);
    y += 30;
  }

  // Process markdown line by line
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();

    // Check if we need a new page
    if (y > pageHeight - 100) {
      doc.addPage();
      doc.setFillColor(0, 168, 225);
      doc.rect(0, 0, pageWidth, 6, 'F');
      y = 60;
    }

    if (!line) {
      y += 10;
      continue;
    }

    // Unit headings (# UNIT X.X:)
    if (line.startsWith('# UNIT')) {
      doc.addPage(); // New page for each unit
      doc.setFillColor(0, 168, 225);
      doc.rect(0, 0, pageWidth, 6, 'F');
      y = 80;

      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 168, 225);
      const text = line.replace(/^# /, '');
      doc.text(text, margin, y);
      y += 30;
      continue;
    }

    // Section headings (##)
    if (line.startsWith('## ')) {
      y += 10;
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(33, 33, 33);
      doc.text(line.replace(/^## /, ''), margin, y);
      y += 20;
      continue;
    }

    // Subsection headings (###)
    if (line.startsWith('### ')) {
      y += 8;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(66, 66, 66);
      doc.text(line.replace(/^### /, ''), margin, y);
      y += 16;
      continue;
    }

    // Bold text (**text**)
    if (line.startsWith('**') && line.includes(':**')) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(33, 33, 33);
      const cleanLine = line.replace(/\*\*/g, '');
      const wrapped = doc.splitTextToSize(cleanLine, contentWidth);
      wrapped.forEach(wrappedLine => {
        if (y > pageHeight - 100) {
          doc.addPage();
          doc.setFillColor(0, 168, 225);
          doc.rect(0, 0, pageWidth, 6, 'F');
          y = 60;
        }
        doc.text(wrappedLine, margin, y);
        y += 14;
      });
      continue;
    }

    // Bullet points
    if (line.startsWith('- ') || line.startsWith('* ')) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(66, 66, 66);
      const bulletText = line.substring(2);
      const wrapped = doc.splitTextToSize(`• ${bulletText}`, contentWidth - 20);
      wrapped.forEach(wrappedLine => {
        if (y > pageHeight - 100) {
          doc.addPage();
          doc.setFillColor(0, 168, 225);
          doc.rect(0, 0, pageWidth, 6, 'F');
          y = 60;
        }
        doc.text(wrappedLine, margin + 10, y);
        y += 13;
      });
      continue;
    }

    // Horizontal rules
    if (line === '---') {
      y += 8;
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(1);
      doc.line(margin, y, pageWidth - margin, y);
      y += 16;
      continue;
    }

    // Regular paragraphs
    if (line.length > 0) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(66, 66, 66);
      const cleanLine = line.replace(/\*\*/g, ''); // Remove bold markers
      const wrapped = doc.splitTextToSize(cleanLine, contentWidth);
      wrapped.forEach(wrappedLine => {
        if (y > pageHeight - 100) {
          doc.addPage();
          doc.setFillColor(0, 168, 225);
          doc.rect(0, 0, pageWidth, 6, 'F');
          y = 60;
        }
        doc.text(wrappedLine, margin, y);
        y += 13;
      });
      y += 4;
    }
  }
}

/**
 * Render cocktail recipes
 */
function renderCocktailRecipes(doc, cocktailContent, pageWidth, pageHeight, margin, contentWidth) {
  const lines = cocktailContent.split('\n');
  let y = 80;

  // Blue header bar
  doc.setFillColor(0, 168, 225);
  doc.rect(0, 0, pageWidth, 6, 'F');

  // Title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 168, 225);
  doc.text('SIGNATURE COCKTAIL RECIPES', margin, y);
  y += 40;

  // Process like module content
  for (const line of lines) {
    if (y > pageHeight - 100) {
      doc.addPage();
      doc.setFillColor(0, 168, 225);
      doc.rect(0, 0, pageWidth, 6, 'F');
      y = 60;
    }

    const trimmed = line.trim();
    if (!trimmed) {
      y += 10;
      continue;
    }

    // Cocktail names (# 🍹 NAME)
    if (trimmed.startsWith('# 🍹')) {
      if (y > 100) {
        doc.addPage();
        doc.setFillColor(0, 168, 225);
        doc.rect(0, 0, pageWidth, 6, 'F');
        y = 80;
      }
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 168, 225);
      doc.text(trimmed.replace('# ', ''), margin, y);
      y += 25;
      continue;
    }

    // Section headings
    if (trimmed.startsWith('### ')) {
      y += 6;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(33, 33, 33);
      doc.text(trimmed.replace('### ', ''), margin, y);
      y += 15;
      continue;
    }

    // Table rows
    if (trimmed.startsWith('|') && !trimmed.includes('Amount')) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(66, 66, 66);
      const cells = trimmed.split('|').filter(c => c.trim());
      if (cells.length === 2) {
        doc.text(`${cells[0].trim()} — ${cells[1].trim()}`, margin + 10, y);
        y += 12;
      }
      continue;
    }

    // Numbered lists
    if (/^\d+\./.test(trimmed)) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(66, 66, 66);
      const wrapped = doc.splitTextToSize(trimmed, contentWidth - 10);
      wrapped.forEach(wrappedLine => {
        doc.text(wrappedLine, margin + 10, y);
        y += 11;
      });
      continue;
    }

    // Bold labels
    if (trimmed.startsWith('**') && trimmed.includes(':**')) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(33, 33, 33);
      doc.text(trimmed.replace(/\*\*/g, ''), margin, y);
      y += 13;
      continue;
    }

    // Bullet points
    if (trimmed.startsWith('- ')) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(66, 66, 66);
      doc.text(`• ${trimmed.substring(2)}`, margin + 10, y);
      y += 12;
      continue;
    }

    // Horizontal rules
    if (trimmed === '---') {
      y += 8;
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(1);
      doc.line(margin, y, pageWidth - margin, y);
      y += 12;
      continue;
    }

    // Regular text
    if (trimmed.length > 0 && !trimmed.startsWith('#')) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(66, 66, 66);
      const wrapped = doc.splitTextToSize(trimmed, contentWidth);
      wrapped.forEach(wrappedLine => {
        doc.text(wrappedLine, margin, y);
        y += 11;
      });
      y += 3;
    }
  }
}

/**
 * Render workbook content
 */
function renderWorkbookContent(doc, workbook, pageWidth, pageHeight, margin, contentWidth) {
  const lines = workbook.content.split('\n');
  let y = 80;

  // Blue header bar
  doc.setFillColor(0, 168, 225);
  doc.rect(0, 0, pageWidth, 6, 'F');

  // Workbook title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 168, 225);
  doc.text(`MODULE ${workbook.number} REFLECTION WORKBOOK`, margin, y);
  y += 35;

  // Process markdown
  for (const line of lines) {
    if (y > pageHeight - 100) {
      doc.addPage();
      doc.setFillColor(0, 168, 225);
      doc.rect(0, 0, pageWidth, 6, 'F');
      y = 60;
    }

    const trimmed = line.trim();
    if (!trimmed) {
      y += 10;
      continue;
    }

    // Unit headings
    if (trimmed.startsWith('# UNIT')) {
      doc.addPage();
      doc.setFillColor(0, 168, 225);
      doc.rect(0, 0, pageWidth, 6, 'F');
      y = 80;
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 168, 225);
      doc.text(trimmed.replace('# ', ''), margin, y);
      y += 25;
      continue;
    }

    // Section headings
    if (trimmed.startsWith('### ')) {
      y += 8;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(33, 33, 33);
      doc.text(trimmed.replace('### ', ''), margin, y);
      y += 16;
      continue;
    }

    // Questions
    if (trimmed.startsWith('**') && trimmed.includes(':**')) {
      y += 4;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(33, 33, 33);
      doc.text(trimmed.replace(/\*\*/g, ''), margin, y);
      y += 20;

      // Add blank line for answers
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.5);
      doc.line(margin, y, pageWidth - margin, y);
      y += 20;
      continue;
    }

    // Horizontal rules
    if (trimmed === '---') {
      y += 8;
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(1);
      doc.line(margin, y, pageWidth - margin, y);
      y += 16;
      continue;
    }

    // Regular text
    if (trimmed.length > 0 && !trimmed.startsWith('#')) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(66, 66, 66);
      const cleanLine = trimmed.replace(/\*\*/g, '');
      const wrapped = doc.splitTextToSize(cleanLine, contentWidth);
      wrapped.forEach(wrappedLine => {
        doc.text(wrappedLine, margin, y);
        y += 12;
      });
    }
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
