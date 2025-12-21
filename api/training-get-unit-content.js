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
    console.log('=== API REQUEST START ===');
    const { module_number, unit_number } = req.body;
    console.log(`Requesting Module ${module_number}, Unit ${unit_number}`);

    if (!module_number || !unit_number) {
      console.error('Missing parameters');
      return res.status(400).json({
        error: 'module_number and unit_number are required'
      });
    }

    // Find the main module file (not reflection workbook)
    console.log('Reading directory...');
    const modulesDir = path.join(process.cwd(), 'training', 'modules');
    console.log('Modules directory:', modulesDir);

    const moduleFiles = fs.readdirSync(modulesDir);
    console.log('Found files:', moduleFiles);

    const mainModuleFile = moduleFiles.find(f =>
      f.startsWith(`MODULE_${module_number}_`) &&
      !f.includes('REFLECTION') &&
      !f.includes('WORKBOOK')
    );

    const reflectionFile = moduleFiles.find(f =>
      f.startsWith(`MODULE_${module_number}_`) &&
      (f.includes('REFLECTION') || f.includes('WORKBOOK'))
    );

    console.log('Main module file:', mainModuleFile);
    console.log('Reflection file:', reflectionFile);

    if (!mainModuleFile) {
      console.error(`Module ${module_number} not found`);
      return res.status(404).json({
        error: `Module ${module_number} not found`
      });
    }

    // Read module content
    console.log('Reading main module file...');
    const moduleContent = fs.readFileSync(
      path.join(modulesDir, mainModuleFile),
      'utf-8'
    );
    console.log(`Read ${moduleContent.length} characters from main module`);

    // Read reflection workbook if exists
    let reflectionContent = '';
    if (reflectionFile) {
      console.log('Reading reflection file...');
      reflectionContent = fs.readFileSync(
        path.join(modulesDir, reflectionFile),
        'utf-8'
      );
      console.log(`Read ${reflectionContent.length} characters from reflection`);
    }

    // Parse the markdown to extract unit content
    console.log('Parsing unit content...');
    const unitContent = parseUnitFromMarkdown(moduleContent, module_number, unit_number);

    if (!unitContent) {
      console.error(`Unit ${module_number}.${unit_number} not found in markdown`);
      return res.status(404).json({
        error: `Unit ${module_number}.${unit_number} not found`
      });
    }
    console.log('Unit content parsed successfully');

    console.log('Parsing reflection questions...');
    const reflectionQuestions = parseReflectionQuestions(reflectionContent, module_number, unit_number);
    console.log(`Found ${reflectionQuestions.length} reflection questions`);

    // Add reflection questions to unit content
    unitContent.reflection = reflectionQuestions;

    console.log('Preparing JSON response...');
    const responseData = {
      success: true,
      unit: unitContent
    };

    // Try to serialize to check for issues
    const jsonString = JSON.stringify(responseData);
    console.log(`JSON response is ${jsonString.length} characters`);

    res.setHeader('Content-Type', 'application/json');
    console.log('=== API REQUEST SUCCESS ===');
    return res.status(200).json(responseData);

  } catch (error) {
    console.error('=== API ERROR ===');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    return res.status(500).json({
      error: 'Failed to fetch training content',
      details: error.message,
      errorType: error.constructor.name
    });
  }
}

// Parse unit content from markdown - simplified approach
function parseUnitFromMarkdown(markdown, moduleNum, unitNum) {
  try {
    console.log(`  parseUnitFromMarkdown: Looking for Module ${moduleNum}, Unit ${unitNum}`);
    // Find the unit heading
    const unitHeading = `# UNIT ${moduleNum}.${unitNum}:`;
    console.log(`  Searching for heading: "${unitHeading}"`);
    const startIndex = markdown.indexOf(unitHeading);
    console.log(`  Found at index: ${startIndex}`);

    if (startIndex === -1) {
      console.error(`  Unit heading not found in markdown`);
      return null;
    }

    // Find where this unit ends (next unit or end of file)
    let endIndex = markdown.length;
    const searchStart = startIndex + unitHeading.length;

    // Look for next unit heading
    for (let i = moduleNum; i <= 5; i++) {
      for (let j = 1; j <= 6; j++) {
        if (i === moduleNum && j === unitNum) continue;
        const nextHeading = `\n# UNIT ${i}.${j}:`;
        const nextIndex = markdown.indexOf(nextHeading, searchStart);
        if (nextIndex !== -1 && nextIndex < endIndex) {
          endIndex = nextIndex;
        }
      }
    }

    const unitSection = markdown.substring(startIndex, endIndex);
    const lines = unitSection.split('\n');

    // Extract title (first line)
    const title = lines[0].replace(unitHeading, '').trim();

    // Extract metadata
    let duration = '';
    let trainer = '';
    let location = '';

    for (let i = 0; i < Math.min(10, lines.length); i++) {
      const line = lines[i];
      if (line.includes('**Duration:**')) {
        duration = line.split('**Duration:**')[1].trim();
      }
      if (line.includes('**Trainer:**')) {
        trainer = line.split('**Trainer:**')[1].trim();
      }
      if (line.includes('**Location:**')) {
        location = line.split('**Location:**')[1].trim();
      }
    }

    // Extract purpose
    let purpose = '';
    const purposeStart = unitSection.indexOf('## Purpose');
    if (purposeStart !== -1) {
      const purposeEnd = unitSection.indexOf('\n##', purposeStart + 10);
      if (purposeEnd !== -1) {
        purpose = unitSection.substring(purposeStart + 10, purposeEnd).trim();
      }
    }

    // Extract content sections (### headings)
    const contentSections = [];
    const activities = [];

    const sectionLines = unitSection.split('\n');
    for (let i = 0; i < sectionLines.length; i++) {
      const line = sectionLines[i];

      // Found a ### heading
      if (line.startsWith('### ')) {
        const heading = line.substring(4).trim();

        // Find the content until next ### or ## or end
        let contentLines = [];
        let j = i + 1;
        while (j < sectionLines.length && !sectionLines[j].startsWith('###') && !sectionLines[j].startsWith('## ')) {
          contentLines.push(sectionLines[j]);
          j++;
        }

        const content = contentLines.join('\n').trim();

        // Check if it's an activity
        if (heading.toLowerCase().startsWith('activity')) {
          // Remove "Activity N: " prefix
          let activityTitle = heading;
          const colonIndex = heading.indexOf(':');
          if (colonIndex !== -1) {
            activityTitle = heading.substring(colonIndex + 1).trim();
          }

          activities.push({
            title: activityTitle,
            content: parseMarkdownContent(content)
          });
        } else {
          contentSections.push({
            heading: heading,
            content: parseMarkdownContent(content)
          });
        }
      }
    }

    return {
      title: title || 'Training Unit',
      duration: duration || 'varies',
      trainer: trainer || 'Demetri',
      location: location || '',
      purpose: purpose,
      contentSections: contentSections,
      activities: activities,
      fullMarkdown: unitSection
    };
  } catch (error) {
    console.error('Error parsing unit:', error);
    return null;
  }
}

// Parse reflection questions from workbook - simplified
function parseReflectionQuestions(markdown, moduleNum, unitNum) {
  if (!markdown) return [];

  try {
    // Find the unit section in the workbook
    const unitHeading = `# UNIT ${moduleNum}.${unitNum}:`;
    const startIndex = markdown.indexOf(unitHeading);

    if (startIndex === -1) {
      return [];
    }

    // Find end of this unit section
    let endIndex = markdown.indexOf('\n# UNIT', startIndex + unitHeading.length);
    if (endIndex === -1) {
      endIndex = markdown.indexOf('\n---', startIndex + unitHeading.length);
    }
    if (endIndex === -1) {
      endIndex = markdown.length;
    }

    const unitSection = markdown.substring(startIndex, endIndex);

    // Extract questions - look for **1. **, **2. **, etc.
    const questions = [];
    const lines = unitSection.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Look for pattern like **1. Question text:**
      if (line.startsWith('**') && line.includes(':**')) {
        // Extract the question between ** and :**
        const firstStar = line.indexOf('**');
        const lastColon = line.lastIndexOf(':**');

        if (firstStar !== -1 && lastColon !== -1) {
          const questionText = line.substring(firstStar + 2, lastColon);

          // Remove the number prefix (e.g., "1. ")
          const dotIndex = questionText.indexOf('. ');
          if (dotIndex !== -1) {
            const cleanQuestion = questionText.substring(dotIndex + 2).trim();
            if (cleanQuestion.length > 0) {
              questions.push(cleanQuestion);
            }
          }
        }
      }
    }

    return questions;
  } catch (error) {
    console.error('Error parsing reflection questions:', error);
    return [];
  }
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

      // Extract text between ** and :**
      const colonPos = line.indexOf(':**');
      if (colonPos !== -1) {
        const boldText = line.substring(2, colonPos).trim();
        const afterColon = line.substring(colonPos + 3).trim();

        parsed.push({
          type: 'heading',
          content: boldText,
          detail: afterColon
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
