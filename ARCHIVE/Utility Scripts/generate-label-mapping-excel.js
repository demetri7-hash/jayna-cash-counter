/**
 * Generate Label Name Mapping Excel File
 * Run with: node generate-label-mapping-excel.js
 */

import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generateMappingExcel() {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Label Name Mapping');

  // Set column widths
  worksheet.columns = [
    { header: 'CATEGORY', key: 'category', width: 25 },
    { header: 'CURRENT NAME', key: 'currentName', width: 40 },
    { header: 'NEW NAME (EDIT THIS)', key: 'newName', width: 40 },
    { header: 'NOTES / QUESTIONS', key: 'notes', width: 50 }
  ];

  // Style header row
  worksheet.getRow(1).font = { bold: true, size: 12 };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }
  };
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.getRow(1).height = 20;

  const data = [
    // BYO GYROS
    { category: 'BYO GYROS', currentName: 'Tzatziki Sauce', newName: 'TZATZIKI', notes: 'BYO Gyros sauce' },
    { category: 'BYO GYROS', currentName: 'Spicy Aioli Sauce', newName: 'SPICY AIOLI', notes: 'BYO Gyros sauce' },
    { category: 'BYO GYROS', currentName: 'Lemon Vinaigrette', newName: 'LEMON VINAIGRETTE', notes: 'BYO Gyros sauce' },
    { category: 'BYO GYROS', currentName: 'Mixed Greens', newName: 'MIXED GREENS', notes: 'BYO Gyros greens' },
    { category: 'BYO GYROS', currentName: 'Diced Tomatoes', newName: 'DICED TOMATOES', notes: 'BYO Gyros veggie' },
    { category: 'BYO GYROS', currentName: 'Sliced Red Onion', newName: 'RED ONIONS', notes: 'BYO Gyros veggie (renamed from "Sliced Red Onion")' },
    { category: 'BYO GYROS', currentName: 'Whole Pepperoncini', newName: 'PEPPERONCINI', notes: 'BYO Gyros veggie (simplified from "Whole Pepperoncini")' },
    { category: 'BYO GYROS', currentName: 'Grilled Pita Bread', newName: 'GRILLED PITA', notes: 'BYO Gyros pita (simplified from "Grilled Pita Bread")' },

    // SALADS
    { category: 'SALADS', currentName: 'Jayna House Salad', newName: 'JAYNA HOUSE SALAD', notes: 'EDIT: Add all salad names from your menu' },
    { category: 'SALADS', currentName: 'Jayna House Salad - Lemon Vinaigrette', newName: 'LEMON VINAIGRETTE (HOUSE SALAD)', notes: 'Salad dressing format' },
    { category: 'SALADS', currentName: 'Greek Salad', newName: 'GREEK SALAD', notes: 'EDIT: Add if this salad exists' },
    { category: 'SALADS', currentName: 'Greek Salad - Lemon Vinaigrette', newName: 'LEMON VINAIGRETTE (GREEK SALAD)', notes: 'EDIT: Add if this salad exists' },
    { category: 'SALADS', currentName: 'Caesar Salad', newName: 'CAESAR SALAD', notes: 'EDIT: Add if this salad exists' },
    { category: 'SALADS', currentName: '[ADD MORE SALADS]', newName: '[ADD MORE SALADS]', notes: 'QUESTION: What are ALL salad names in your menu?' },

    // DIPS
    { category: 'DIPS', currentName: 'Hummus', newName: 'HUMMUS', notes: 'Dip name' },
    { category: 'DIPS', currentName: 'Tzatziki', newName: 'TZATZIKI', notes: 'Dip name' },
    { category: 'DIPS', currentName: 'Spicy Feta', newName: 'SPICY FETA', notes: 'EDIT: Add if this dip exists' },
    { category: 'DIPS', currentName: 'Baba Ganoush', newName: 'BABA GANOUSH', notes: 'EDIT: Add if this dip exists' },
    { category: 'DIPS', currentName: '[ADD MORE DIPS]', newName: '[ADD MORE DIPS]', notes: 'QUESTION: What are ALL dip names in your menu?' },

    // DIP SIDES
    { category: 'DIP SIDES', currentName: 'Hummus - Veggie Sticks (Carrots)', newName: 'VEGGIE STICKS (CARROTS)', notes: 'QUESTION: Keep dip name prefix or remove it?' },
    { category: 'DIP SIDES', currentName: 'Hummus - Veggie Sticks (Celery)', newName: 'VEGGIE STICKS (CELERY)', notes: 'QUESTION: Keep dip name prefix or remove it?' },
    { category: 'DIP SIDES', currentName: 'Hummus - Sliced Pita Bread', newName: 'SLICED PITA', notes: 'QUESTION: Keep dip name prefix or remove it?' },
    { category: 'DIP SIDES', currentName: 'Hummus - GF Pita Bread', newName: 'GF PITA (SLICED)', notes: 'QUESTION: Keep dip name prefix or remove it?' },

    // GREEK FRIES BAR
    { category: 'GREEK FRIES BAR', currentName: 'Greek Fries + Protein', newName: 'GREEK FRIES + PROTEIN', notes: 'Main item' },
    { category: 'GREEK FRIES BAR', currentName: 'Greek Fries - Spicy Aioli', newName: 'SPICY AIOLI', notes: 'Topping (removed "Greek Fries -" prefix)' },
    { category: 'GREEK FRIES BAR', currentName: 'Greek Fries - Tzatziki', newName: 'TZATZIKI', notes: 'Topping (removed "Greek Fries -" prefix)' },
    { category: 'GREEK FRIES BAR', currentName: 'Greek Fries - Crumbled Feta', newName: 'CRUMBLED FETA', notes: 'Topping (removed "Greek Fries -" prefix)' },

    // DOLMAS
    { category: 'DOLMAS', currentName: 'Dolmas (10 pieces)', newName: 'DOLMAS (10 PIECES)', notes: 'EDIT: Add all dolma variations if multiple exist' },
    { category: 'DOLMAS', currentName: 'Dolmas (10 pieces) - Tzatziki Sauce', newName: 'TZATZIKI (DOLMAS)', notes: 'QUESTION: Use this format or "DOLMAS - TZATZIKI"?' },

    // SPANAKOPITA
    { category: 'SPANAKOPITA', currentName: 'Spanakopita (10 pieces)', newName: 'SPANAKOPITA (10 PIECES)', notes: 'EDIT: Add all spanakopita variations if multiple exist' },
    { category: 'SPANAKOPITA', currentName: 'Spanakopita (10 pieces) - Tzatziki Sauce', newName: 'TZATZIKI (SPANAKOPITA)', notes: 'QUESTION: Use this format or "SPANAKOPITA - TZATZIKI"?' },

    // SIDES
    { category: 'SIDES', currentName: 'Greek Fries (side)', newName: 'GREEK FRIES', notes: 'EDIT: Add all side items from your menu' },
    { category: 'SIDES', currentName: 'Rice Pilaf', newName: 'RICE PILAF', notes: 'EDIT: Add if this side exists' },
    { category: 'SIDES', currentName: '[ADD MORE SIDES]', newName: '[ADD MORE SIDES]', notes: 'QUESTION: What are ALL side items in your menu?' },

    // DESSERTS
    { category: 'DESSERTS', currentName: 'Baklava', newName: 'BAKLAVA', notes: 'EDIT: Add all dessert items from your menu' },
    { category: 'DESSERTS', currentName: '[ADD MORE DESSERTS]', newName: '[ADD MORE DESSERTS]', notes: 'QUESTION: What are ALL dessert items in your menu?' },

    // PINWHEELS
    { category: 'PINWHEELS', currentName: 'Chicken Pinwheels', newName: 'CHICKEN PINWHEELS', notes: 'EDIT: Add all pinwheel items from your menu' },
    { category: 'PINWHEELS', currentName: '[ADD MORE PINWHEELS]', newName: '[ADD MORE PINWHEELS]', notes: 'QUESTION: What are ALL pinwheel items in your menu?' }
  ];

  // Add data rows
  data.forEach(row => {
    const addedRow = worksheet.addRow(row);

    // Style category column
    addedRow.getCell(1).font = { bold: true };
    addedRow.getCell(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE7E6E6' }
    };

    // Highlight NEW NAME column for editing
    addedRow.getCell(3).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFFF00' } // Yellow highlight
    };

    // Style NOTES column
    if (row.notes.includes('QUESTION') || row.notes.includes('EDIT')) {
      addedRow.getCell(4).font = { color: { argb: 'FFFF0000' }, italic: true };
    }
  });

  // Add borders to all cells
  worksheet.eachRow((row, rowNumber) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      };
    });
  });

  // Add instructions at the bottom
  const lastRow = worksheet.rowCount + 2;
  worksheet.getCell(`A${lastRow}`).value = 'INSTRUCTIONS:';
  worksheet.getCell(`A${lastRow}`).font = { bold: true, size: 14, color: { argb: 'FFFF0000' } };

  worksheet.getCell(`A${lastRow + 1}`).value = '1. Edit the YELLOW "NEW NAME" column with your desired label names (ALL CAPS)';
  worksheet.getCell(`A${lastRow + 2}`).value = '2. Add any missing menu items (marked with [ADD MORE...])';
  worksheet.getCell(`A${lastRow + 3}`).value = '3. Answer questions in RED in the NOTES column';
  worksheet.getCell(`A${lastRow + 4}`).value = '4. Save this file and send it back to Claude';
  worksheet.getCell(`A${lastRow + 5}`).value = '5. Claude will update the code based on your edits';

  // Generate Excel file
  const buffer = await workbook.xlsx.writeBuffer();
  const filePath = path.join(__dirname, 'LABEL_NAME_MAPPING.xlsx');
  fs.writeFileSync(filePath, buffer);

  console.log('✅ Excel file created: LABEL_NAME_MAPPING.xlsx');
  console.log('📝 Open this file, edit the YELLOW column, and save it.');
  console.log('💾 Then upload it back to Claude Code for implementation.');
}

generateMappingExcel().catch(console.error);
