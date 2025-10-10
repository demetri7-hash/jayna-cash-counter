/**
 * Bulk Import Script for Inventory Items
 *
 * Imports items from merged-inventory-data.json
 * - Creates/updates inventory_items
 * - Populates item_cost_history
 * - Handles duplicates intelligently
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase connection
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Read merged data
const dataPath = path.join(__dirname, '../merged-inventory-data.json');
const rawData = fs.readFileSync(dataPath, 'utf8');
const { merged_items } = JSON.parse(rawData);

console.log(`📦 Starting import of ${merged_items.length} items...\n`);

// Track results
let stats = {
  inserted: 0,
  updated: 0,
  costsAdded: 0,
  errors: 0,
  skipped: 0
};

/**
 * Normalize vendor names
 */
function normalizeVendor(vendor) {
  const mapping = {
    'Eatopia Foods': 'Eatopia',
    'Eatopia': 'Eatopia',
    'Mani Imports': 'Mani Imports',
    'Performance': 'Performance',
    'Greenleaf': 'Greenleaf',
    'Alsco': 'Alsco',
    'Restaurant Depot': 'Restaurant Depot',
    'Southern Glazer\'s': 'Southern Glazer\'s',
    'Breakthru Beverage': 'Breakthru Beverage',
    'Unknown': null
  };

  return mapping[vendor] || vendor;
}

/**
 * Parse date from various formats
 */
function parseDate(dateStr) {
  if (!dateStr) return null;

  try {
    // Try formats: MM/DD/YY, MM-DD-YY, YYYY-MM-DD
    const parts = dateStr.split(/[-/]/);

    if (parts.length === 3) {
      let year, month, day;

      if (parts[0].length === 4) {
        // YYYY-MM-DD
        [year, month, day] = parts;
      } else {
        // MM/DD/YY or MM-DD-YY
        [month, day, year] = parts;

        // Convert 2-digit year to 4-digit
        if (year.length === 2) {
          year = parseInt(year) > 50 ? `19${year}` : `20${year}`;
        }
      }

      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  } catch (err) {
    console.error(`Error parsing date: ${dateStr}`, err);
  }

  return null;
}

/**
 * Import a single item
 */
async function importItem(item) {
  const vendor = normalizeVendor(item.vendor);

  if (!vendor || vendor === 'Unknown') {
    console.log(`⚠️  Skipping "${item.itemName}" - Unknown vendor`);
    stats.skipped++;
    return;
  }

  try {
    // Check if item already exists (by name and vendor)
    const { data: existing, error: searchError } = await supabase
      .from('inventory_items')
      .select('id, current_unit_cost, upc')
      .eq('item_name', item.itemName)
      .eq('vendor', vendor)
      .single();

    if (searchError && searchError.code !== 'PGRST116') {
      throw searchError;
    }

    const itemData = {
      item_name: item.itemName,
      vendor: vendor,
      unit: item.unit || 'Each',
      par_level: item.parLevel || 0,
      current_stock: 0, // Will be updated via inventory counts
      upc: item.itemUpc || null,
      current_unit_cost: item.unitCost || null,
      last_cost_update: item.unitCost ? parseDate(item.invoiceDate) : null
    };

    let itemId;

    if (existing) {
      // Update existing item
      const { error: updateError } = await supabase
        .from('inventory_items')
        .update(itemData)
        .eq('id', existing.id);

      if (updateError) throw updateError;

      itemId = existing.id;
      console.log(`✅ Updated: ${item.itemName} (${vendor})`);
      stats.updated++;
    } else {
      // Insert new item
      const { data: newItem, error: insertError } = await supabase
        .from('inventory_items')
        .insert([itemData])
        .select()
        .single();

      if (insertError) throw insertError;

      itemId = newItem.id;
      console.log(`✨ Created: ${item.itemName} (${vendor})`);
      stats.inserted++;
    }

    // Add cost history if we have cost data
    if (item.unitCost && itemId) {
      const invoiceDate = parseDate(item.invoiceDate);

      if (invoiceDate) {
        // Check if this cost entry already exists
        const { data: existingCost } = await supabase
          .from('item_cost_history')
          .select('id')
          .eq('item_id', itemId)
          .eq('effective_date', invoiceDate)
          .single();

        if (!existingCost) {
          const { error: costError } = await supabase
            .from('item_cost_history')
            .insert([{
              item_id: itemId,
              vendor: vendor,
              unit_cost: item.unitCost,
              invoice_date: invoiceDate,
              effective_date: invoiceDate,
              notes: 'Imported from invoice data'
            }]);

          if (costError) {
            console.error(`   ⚠️  Failed to add cost history: ${costError.message}`);
          } else {
            console.log(`   💰 Added cost: $${item.unitCost} (${invoiceDate})`);
            stats.costsAdded++;
          }
        }
      }
    }

  } catch (err) {
    console.error(`❌ Error importing "${item.itemName}":`, err.message);
    stats.errors++;
  }
}

/**
 * Main import function
 */
async function main() {
  console.log('🚀 Starting bulk import...\n');

  // Process items sequentially to avoid rate limits
  for (const item of merged_items) {
    await importItem(item);
    // Small delay to avoid overwhelming the database
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 IMPORT COMPLETE');
  console.log('='.repeat(60));
  console.log(`✨ Items Created:      ${stats.inserted}`);
  console.log(`✅ Items Updated:      ${stats.updated}`);
  console.log(`💰 Cost Records Added: ${stats.costsAdded}`);
  console.log(`⚠️  Items Skipped:      ${stats.skipped}`);
  console.log(`❌ Errors:             ${stats.errors}`);
  console.log('='.repeat(60));
  console.log('\n✅ All done! Your inventory is now loaded.\n');
}

// Run the import
main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
