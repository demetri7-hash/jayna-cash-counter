// Local test for markdown parser
const fs = require('fs');
const path = require('path');

// Copy the parsing function
function parseUnitFromMarkdown(markdown, moduleNum, unitNum) {
  try {
    console.log(`parseUnitFromMarkdown: Looking for Module ${moduleNum}, Unit ${unitNum}`);
    const unitHeading = `# UNIT ${moduleNum}.${unitNum}:`;
    console.log(`Searching for heading: "${unitHeading}"`);
    const startIndex = markdown.indexOf(unitHeading);
    console.log(`Found at index: ${startIndex}`);

    if (startIndex === -1) {
      console.error(`Unit heading not found in markdown`);
      return null;
    }

    // Find where this unit ends
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

    // Extract title
    const title = lines[0].replace(unitHeading, '').trim();
    console.log(`Extracted title: "${title}"`);

    return {
      title: title || 'Training Unit',
      test: 'success'
    };
  } catch (error) {
    console.error('Error parsing unit:', error);
    return null;
  }
}

// Test with real file
const moduleContent = fs.readFileSync(
  path.join(__dirname, 'training', 'modules', 'MODULE_1_FOUNDATION_AND_CULTURE.md'),
  'utf-8'
);

console.log('=== TESTING PARSER ===');
console.log(`Markdown file length: ${moduleContent.length} characters`);

const result = parseUnitFromMarkdown(moduleContent, 1, 1);

if (result) {
  console.log('\n=== PARSE SUCCESS ===');
  console.log('Result:', result);

  // Test JSON serialization
  try {
    const json = JSON.stringify(result);
    console.log('\n=== JSON SERIALIZATION SUCCESS ===');
    console.log(`JSON length: ${json.length} characters`);
  } catch (e) {
    console.error('\n=== JSON SERIALIZATION FAILED ===');
    console.error('Error:', e.message);
  }
} else {
  console.log('\n=== PARSE FAILED ===');
}
