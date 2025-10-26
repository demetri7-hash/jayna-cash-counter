import ExcelJS from 'exceljs';
import fs from 'fs';

const workbook = new ExcelJS.Workbook();
await workbook.xlsx.readFile('LABEL_NAME_MAPPING.xlsx');
const worksheet = workbook.getWorksheet('Label Name Mapping');

console.log('LABEL NAME MAPPING - USER EDITS:');
console.log('='.repeat(100));

const mappings = [];
let hasQuestions = false;

worksheet.eachRow((row, rowNumber) => {
  if (rowNumber === 1) return; // Skip header

  const category = row.getCell(1).value;
  const currentName = row.getCell(2).value;
  const newName = row.getCell(3).value;
  const notes = row.getCell(4).value;

  if (category && currentName && !currentName.toString().includes('INSTRUCTIONS')) {
    const mapping = {
      category: String(category || ''),
      currentName: String(currentName || ''),
      newName: String(newName || ''),
      notes: String(notes || '')
    };

    // Check for unanswered questions
    if (newName && newName.toString().includes('[ADD MORE')) {
      hasQuestions = true;
      console.log(`⚠️  NEEDS INFO: ${category} - "${currentName}" → "${newName}"`);
    } else if (!newName || newName.toString().trim() === '') {
      hasQuestions = true;
      console.log(`❌ MISSING: ${category} - "${currentName}" (no new name provided)`);
    } else {
      mappings.push(mapping);
      console.log(`✅ ${category.padEnd(20)} | ${currentName.padEnd(40)} → ${newName}`);
    }
  }
});

console.log('='.repeat(100));
console.log(`\nTotal Mappings: ${mappings.length}`);
console.log(`Has Questions: ${hasQuestions ? 'YES - Need more info' : 'NO - Ready to implement'}`);

// Write mappings to JSON for code implementation
fs.writeFileSync('label-mappings.json', JSON.stringify(mappings, null, 2));
console.log('\n✅ Mappings saved to label-mappings.json');
