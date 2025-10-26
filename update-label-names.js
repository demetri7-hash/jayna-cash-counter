import fs from 'fs';

console.log('🔄 Updating all label item names to use getLabelName()...\n');

const filePath = './catering.html';
let content = fs.readFileSync(filePath, 'utf8');

// Replacements for label generation (generateLabelsFromPrep section only)
const replacements = [
  // BYO Gyros vegetables
  { from: "item: 'Sliced Red Onion'", to: "item: getLabelName('Sliced Red Onion')" },
  { from: "item: 'Whole Pepperoncini'", to: "item: getLabelName('Whole Pepperoncini')" },
  { from: "item: 'Grilled Pita Bread'", to: "item: getLabelName('Grilled Pita Bread')" },

  // Salads - handle dynamic salad names
  { from: "item: salad.name,", to: "item: getLabelName(salad.name)," },
  { from: "item: `\\${salad.name} - Lemon Vinaigrette`", to: "item: getLabelName(`${salad.name} - Lemon Vinaigrette`)" },

  // Dips - handle dynamic dip names
  { from: "item: dip.name,", to: "item: getLabelName(dip.name)," },
  { from: "item: `\\${dip.name} - Veggie Sticks \\(Carrots\\)`", to: "item: getLabelName(`${dip.name} - Veggie Sticks (Carrots)`)" },
  { from: "item: `\\${dip.name} - Veggie Sticks \\(Celery\\)`", to: "item: getLabelName(`${dip.name} - Veggie Sticks (Celery)`)" },
  { from: "item: `\\${dip.name} - Sliced Pita Bread`", to: "item: getLabelName(`${dip.name} - Sliced Pita Bread`)" },
  { from: "item: `\\${dip.name} - GF Pita Bread`", to: "item: getLabelName(`${dip.name} - GF Pita Bread`)" },

  // Greek Fries Bar
  { from: "item: 'Greek Fries + Protein'", to: "item: getLabelName('Greek Fries + Protein')" },
  { from: "item: 'Greek Fries - Spicy Aioli'", to: "item: getLabelName('Greek Fries - Spicy Aioli')" },
  { from: "item: 'Greek Fries - Tzatziki'", to: "item: getLabelName('Greek Fries - Tzatziki')" },
  { from: "item: 'Greek Fries - Crumbled Feta'", to: "item: getLabelName('Greek Fries - Crumbled Feta')" },

  // Dolmas - handle dynamic names
  { from: "item: dolma.name,", to: "item: getLabelName(dolma.name)," },
  { from: "item: `\\${dolma.name} - Tzatziki Sauce`", to: "item: getLabelName(`${dolma.name} - Tzatziki Sauce`)" },

  // Spanakopita - handle dynamic names
  { from: "item: span.name,", to: "item: getLabelName(span.name)," },
  { from: "item: `\\${span.name} - Tzatziki Sauce`", to: "item: getLabelName(`${span.name} - Tzatziki Sauce`)" },

  // Sides - handle dynamic names
  { from: "item: side.name,", to: "item: getLabelName(side.name)," },

  // Desserts - handle dynamic names
  { from: "item: dessert.name,", to: "item: getLabelName(dessert.name)," },

  // Pinwheels - handle dynamic names
  { from: "item: pinwheel.name,", to: "item: getLabelName(pinwheel.name)," }
];

let changeCount = 0;

replacements.forEach(({ from, to }) => {
  const regex = new RegExp(from, 'g');
  const matches = content.match(regex);
  if (matches) {
    content = content.replace(regex, to);
    console.log(`✅ ${from.substring(0, 50)}... → ${to.substring(0, 50)}... (${matches.length} replacements)`);
    changeCount += matches.length;
  }
});

fs.writeFileSync(filePath, content, 'utf8');

console.log(`\n✅ Complete! Made ${changeCount} replacements.`);
console.log('📝 All item names now use getLabelName() function.');
