// Build script to pre-process training markdown into JSON
// Run this script to convert all training markdown files into JSON
// This eliminates runtime parsing errors and improves API performance

const fs = require('fs');
const path = require('path');

// Parse markdown content into structured format
function parseMarkdownContent(content) {
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

    if (line.startsWith('**') && line.includes(':**')) {
      if (currentParagraph) {
        parsed.push({ type: 'paragraph', content: currentParagraph });
        currentParagraph = '';
      }
      if (currentList) {
        parsed.push(currentList);
        currentList = null;
      }

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

    currentParagraph += (currentParagraph ? ' ' : '') + line;
  }

  if (currentParagraph) {
    parsed.push({ type: 'paragraph', content: currentParagraph });
  }
  if (currentList) {
    parsed.push(currentList);
  }

  return parsed;
}

// Parse unit content from markdown
function parseUnitFromMarkdown(markdown, moduleNum, unitNum) {
  try {
    const unitHeading = `# UNIT ${moduleNum}.${unitNum}:`;
    const startIndex = markdown.indexOf(unitHeading);

    if (startIndex === -1) {
      return null;
    }

    let endIndex = markdown.length;
    const searchStart = startIndex + unitHeading.length;

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
    const title = lines[0].replace(unitHeading, '').trim();

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

    let purpose = '';
    const purposeStart = unitSection.indexOf('## Purpose');
    if (purposeStart !== -1) {
      const purposeEnd = unitSection.indexOf('\n##', purposeStart + 10);
      if (purposeEnd !== -1) {
        purpose = unitSection.substring(purposeStart + 10, purposeEnd).trim();
      }
    }

    const contentSections = [];
    const activities = [];
    const sectionLines = unitSection.split('\n');

    for (let i = 0; i < sectionLines.length; i++) {
      const line = sectionLines[i];

      if (line.startsWith('### ')) {
        const heading = line.substring(4).trim();
        let contentLines = [];
        let j = i + 1;

        while (j < sectionLines.length && !sectionLines[j].startsWith('###') && !sectionLines[j].startsWith('## ')) {
          contentLines.push(sectionLines[j]);
          j++;
        }

        const content = contentLines.join('\n').trim();

        if (heading.toLowerCase().startsWith('activity')) {
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

// Parse reflection questions from workbook
function parseReflectionQuestions(markdown, moduleNum, unitNum) {
  if (!markdown) return [];

  try {
    const unitHeading = `# UNIT ${moduleNum}.${unitNum}:`;
    const startIndex = markdown.indexOf(unitHeading);

    if (startIndex === -1) {
      return [];
    }

    let endIndex = markdown.indexOf('\n# UNIT', startIndex + unitHeading.length);
    if (endIndex === -1) {
      endIndex = markdown.indexOf('\n---', startIndex + unitHeading.length);
    }
    if (endIndex === -1) {
      endIndex = markdown.length;
    }

    const unitSection = markdown.substring(startIndex, endIndex);
    const questions = [];
    const lines = unitSection.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.startsWith('**') && line.includes(':**')) {
        const firstStar = line.indexOf('**');
        const lastColon = line.lastIndexOf(':**');

        if (firstStar !== -1 && lastColon !== -1) {
          const questionText = line.substring(firstStar + 2, lastColon);
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

// Main build process
console.log('=== BUILDING TRAINING CONTENT ===\n');

const modulesDir = path.join(__dirname, '..', 'training', 'modules');
const outputDir = path.join(__dirname, '..', 'training', 'processed');

// Create output directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
  console.log(`Created output directory: ${outputDir}`);
}

// Process each module (1-5)
for (let moduleNum = 1; moduleNum <= 5; moduleNum++) {
  console.log(`\nProcessing Module ${moduleNum}...`);

  // Find module files
  const moduleFiles = fs.readdirSync(modulesDir);
  const mainModuleFile = moduleFiles.find(f =>
    f.startsWith(`MODULE_${moduleNum}_`) &&
    !f.includes('REFLECTION') &&
    !f.includes('WORKBOOK')
  );

  const reflectionFile = moduleFiles.find(f =>
    f.startsWith(`MODULE_${moduleNum}_`) &&
    (f.includes('REFLECTION') || f.includes('WORKBOOK'))
  );

  if (!mainModuleFile) {
    console.log(`  ⚠️  Module ${moduleNum} main file not found, skipping`);
    continue;
  }

  // Read module content
  const moduleContent = fs.readFileSync(
    path.join(modulesDir, mainModuleFile),
    'utf-8'
  );

  let reflectionContent = '';
  if (reflectionFile) {
    reflectionContent = fs.readFileSync(
      path.join(modulesDir, reflectionFile),
      'utf-8'
    );
  }

  // Process each unit (1-6)
  for (let unitNum = 1; unitNum <= 6; unitNum++) {
    const unitContent = parseUnitFromMarkdown(moduleContent, moduleNum, unitNum);

    if (!unitContent) {
      // Unit doesn't exist, skip
      continue;
    }

    const reflectionQuestions = parseReflectionQuestions(reflectionContent, moduleNum, unitNum);
    unitContent.reflection = reflectionQuestions;

    // Write to JSON file
    const outputFilename = `module_${moduleNum}_unit_${unitNum}.json`;
    const outputPath = path.join(outputDir, outputFilename);

    const jsonData = {
      success: true,
      unit: unitContent
    };

    fs.writeFileSync(outputPath, JSON.stringify(jsonData, null, 2), 'utf-8');
    console.log(`  ✅ Unit ${moduleNum}.${unitNum}: ${unitContent.title} (${unitContent.contentSections.length} sections, ${unitContent.activities.length} activities)`);
  }
}

console.log('\n=== BUILD COMPLETE ===');
console.log(`JSON files written to: ${outputDir}`);
