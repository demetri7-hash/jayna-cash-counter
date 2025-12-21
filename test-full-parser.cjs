const fs = require('fs');
const path = require('path');

// Copy parseMarkdownContent function
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

// Copy full parseUnitFromMarkdown
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

// Test
const moduleContent = fs.readFileSync(
  path.join(__dirname, 'training', 'modules', 'MODULE_1_FOUNDATION_AND_CULTURE.md'),
  'utf-8'
);

console.log('=== TESTING FULL PARSER ===');
const result = parseUnitFromMarkdown(moduleContent, 1, 1);

if (result) {
  console.log('✅ Parse successful');
  console.log(`Title: ${result.title}`);
  console.log(`Duration: ${result.duration}`);
  console.log(`Trainer: ${result.trainer}`);
  console.log(`Location: ${result.location}`);
  console.log(`Content sections: ${result.contentSections.length}`);
  console.log(`Activities: ${result.activities.length}`);
  console.log(`Full markdown length: ${result.fullMarkdown.length}`);

  try {
    const json = JSON.stringify(result);
    console.log(`\n✅ JSON serialization successful`);
    console.log(`JSON length: ${json.length} characters`);
  } catch (e) {
    console.error('\n❌ JSON serialization failed');
    console.error('Error:', e.message);
  }
} else {
  console.log('❌ Parse failed');
}
