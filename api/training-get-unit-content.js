// API endpoint to get training content for a specific unit
// Reads markdown files and returns structured content

const fs = require('fs');
const path = require('path');

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).json({});
  }

  try {
    const { module_number, unit_number } = req.body;

    if (!module_number || !unit_number) {
      return res.status(400).json({
        error: 'module_number and unit_number are required'
      });
    }

    // Read the appropriate module file
    const modulePath = path.join(
      process.cwd(),
      'training',
      'modules',
      `MODULE_${module_number}_*.md`
    );

    // Find the main module file (not reflection workbook)
    const moduleFiles = fs.readdirSync(path.join(process.cwd(), 'training', 'modules'));
    const mainModuleFile = moduleFiles.find(f =>
      f.startsWith(`MODULE_${module_number}_`) &&
      !f.includes('REFLECTION') &&
      !f.includes('WORKBOOK')
    );

    const reflectionFile = moduleFiles.find(f =>
      f.startsWith(`MODULE_${module_number}_`) &&
      (f.includes('REFLECTION') || f.includes('WORKBOOK'))
    );

    if (!mainModuleFile) {
      return res.status(404).json({
        error: `Module ${module_number} not found`
      });
    }

    // Read module content
    const moduleContent = fs.readFileSync(
      path.join(process.cwd(), 'training', 'modules', mainModuleFile),
      'utf-8'
    );

    // Read reflection workbook if exists
    let reflectionContent = '';
    if (reflectionFile) {
      reflectionContent = fs.readFileSync(
        path.join(process.cwd(), 'training', 'modules', reflectionFile),
        'utf-8'
      );
    }

    // Parse the markdown to extract unit content
    const unitContent = parseUnitFromMarkdown(moduleContent, module_number, unit_number);
    const reflectionQuestions = parseReflectionQuestions(reflectionContent, module_number, unit_number);

    if (!unitContent) {
      return res.status(404).json({
        error: `Unit ${module_number}.${unit_number} not found`
      });
    }

    // Add reflection questions to unit content
    unitContent.reflection = reflectionQuestions;

    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json({
      success: true,
      unit: unitContent
    });

  } catch (error) {
    console.error('Error fetching training content:', error);
    return res.status(500).json({
      error: 'Failed to fetch training content',
      details: error.message
    });
  }
}

// Parse unit content from markdown
function parseUnitFromMarkdown(markdown, moduleNum, unitNum) {
  // Find the unit section (e.g., "# UNIT 1.1:")
  const unitRegex = new RegExp(`# UNIT ${moduleNum}\\.${unitNum}:([^#]+)`, 'i');
  const match = markdown.match(unitRegex);

  if (!match) {
    return null;
  }

  // Extract the unit section (everything between this heading and the next # heading)
  const startIndex = markdown.indexOf(match[0]);
  const nextUnitIndex = markdown.indexOf('\n# UNIT', startIndex + match[0].length);
  const endIndex = nextUnitIndex > 0 ? nextUnitIndex : markdown.length;

  const unitSection = markdown.substring(startIndex, endIndex);

  // Extract title from the heading
  const titleMatch = unitSection.match(/# UNIT \d+\.\d+:\s*(.+)/i);
  const title = titleMatch ? titleMatch[1].trim() : 'Training Unit';

  // Extract metadata
  const durationMatch = unitSection.match(/\*\*Duration:\*\*\s*(.+)/i);
  const trainerMatch = unitSection.match(/\*\*Trainer:\*\*\s*(.+)/i);
  const locationMatch = unitSection.match(/\*\*Location:\*\*\s*(.+)/i);

  // Extract purpose
  const purposeMatch = unitSection.match(/## Purpose\s*\n\n([\s\S]+?)(?=\n##|\n###|\n\*\*|$)/i);
  const purpose = purposeMatch ? purposeMatch[1].trim() : '';

  // Extract content sections
  const contentSections = [];
  const sectionRegex = /###\s+(.+?)\s*\n([\s\S]+?)(?=\n###|\n##\s+(?!#)|$)/g;
  let sectionMatch;

  while ((sectionMatch = sectionRegex.exec(unitSection)) !== null) {
    const heading = sectionMatch[1].trim();
    const content = sectionMatch[2].trim();

    contentSections.push({
      heading,
      content: parseMarkdownContent(content)
    });
  }

  // Extract activities
  const activities = [];
  const activityRegex = /###\s+Activity\s+\d+:\s+(.+?)\s*\n([\s\S]+?)(?=\n###\s+Activity|\n##\s+|$)/gi;
  let activityMatch;

  while ((activityMatch = activityRegex.exec(unitSection)) !== null) {
    const activityTitle = activityMatch[1].trim();
    const activityContent = activityMatch[2].trim();

    activities.push({
      title: activityTitle,
      content: parseMarkdownContent(activityContent)
    });
  }

  return {
    title,
    duration: durationMatch ? durationMatch[1].trim() : '',
    trainer: trainerMatch ? trainerMatch[1].trim() : '',
    location: locationMatch ? locationMatch[1].trim() : '',
    purpose,
    contentSections,
    activities,
    fullMarkdown: unitSection
  };
}

// Parse reflection questions from workbook
function parseReflectionQuestions(markdown, moduleNum, unitNum) {
  if (!markdown) return [];

  // Find the unit section in the workbook
  const unitRegex = new RegExp(`# UNIT ${moduleNum}\\.${unitNum}:([^#]+)`, 'i');
  const match = markdown.match(unitRegex);

  if (!match) {
    return [];
  }

  const startIndex = markdown.indexOf(match[0]);
  const nextUnitIndex = markdown.indexOf('\n# UNIT', startIndex + match[0].length);
  const endIndex = nextUnitIndex > 0 ? nextUnitIndex : markdown.indexOf('\n---', startIndex + match[0].length);

  if (endIndex <= startIndex) return [];

  const unitSection = markdown.substring(startIndex, endIndex);

  // Extract questions (look for **1.**, **2.**, etc.)
  const questions = [];
  const questionRegex = /\*\*\d+\.\s+(.+?):\*\*/g;
  let questionMatch;

  while ((questionMatch = questionRegex.exec(unitSection)) !== null) {
    questions.push(questionMatch[1].trim());
  }

  return questions;
}

// Parse markdown content into structured format
function parseMarkdownContent(content) {
  // Convert markdown to HTML-like structure for easy rendering
  const lines = content.split('\n');
  const parsed = [];
  let currentList = null;
  let currentParagraph = '';

  for (let line of lines) {
    line = line.trim();

    if (!line) {
      if (currentParagraph) {
        parsed.push({ type: 'paragraph', content: currentParagraph });
        currentParagraph = '';
      }
      if (currentList) {
        parsed.push(currentList);
        currentList = null;
      }
      continue;
    }

    // Bold text (**text**)
    if (line.startsWith('**') && line.includes(':**')) {
      if (currentParagraph) {
        parsed.push({ type: 'paragraph', content: currentParagraph });
        currentParagraph = '';
      }
      if (currentList) {
        parsed.push(currentList);
        currentList = null;
      }

      const boldMatch = line.match(/\*\*(.+?):\*\*(.*)/);
      if (boldMatch) {
        parsed.push({
          type: 'heading',
          content: boldMatch[1].trim(),
          detail: boldMatch[2].trim()
        });
      }
      continue;
    }

    // List items (- or *)
    if (line.startsWith('- ') || line.startsWith('* ')) {
      if (currentParagraph) {
        parsed.push({ type: 'paragraph', content: currentParagraph });
        currentParagraph = '';
      }

      if (!currentList) {
        currentList = { type: 'list', items: [] };
      }

      currentList.items.push(line.substring(2).trim());
      continue;
    }

    // Regular paragraph text
    currentParagraph += (currentParagraph ? ' ' : '') + line;
  }

  // Add any remaining content
  if (currentParagraph) {
    parsed.push({ type: 'paragraph', content: currentParagraph });
  }
  if (currentList) {
    parsed.push(currentList);
  }

  return parsed;
}
