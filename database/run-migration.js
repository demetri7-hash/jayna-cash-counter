// Run database migration for show_in_bottle_count column
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://gaawtbqpnnbbnsyswqwv.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_KEY || 'YOUR_KEY_HERE';

async function runMigration() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  const sql = fs.readFileSync(path.join(__dirname, 'add_bottle_count_checkbox.sql'), 'utf8');
  
  console.log('Running migration...');
  console.log(sql);
  
  // Note: Supabase JS client doesn't support raw SQL ALTER TABLE
  // You need to run this in the Supabase SQL editor or via psql
  console.log('\n⚠️  Please run this SQL in your Supabase Dashboard SQL Editor:');
  console.log('https://app.supabase.com/project/gaawtbqpnnbbnsyswqwv/sql\n');
}

runMigration();
