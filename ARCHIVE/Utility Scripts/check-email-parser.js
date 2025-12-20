// Quick script to check if automated Toast email parser ran successfully
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gaawtbqpnnbbnsyswqwv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdhYXd0YnFwbm5iYm5zeXN3cXd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1MDE1NTAsImV4cCI6MjA3MjA3NzU1MH0.F-y7AIQTWaUe7DRT4OnIZVn94mhXxfhpBbng2aJ8nXg';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Get today's date in YYYY-MM-DD format
const today = new Date().toISOString().split('T')[0];
console.log(`Checking for email parser results for ${today}...`);

// Query daily_sales table for automated email records
const { data, error } = await supabase
  .from('daily_sales')
  .select('*')
  .eq('source', 'toast_email_auto')
  .order('date', { ascending: false })
  .limit(7); // Get last 7 days

if (error) {
  console.error('❌ Error querying database:', error);
  process.exit(1);
}

if (!data || data.length === 0) {
  console.log('❌ No automated email records found in database.');
  console.log('   The email parser may not have run yet, or there are no unread emails.');
} else {
  console.log(`✅ Found ${data.length} automated email records:\n`);

  data.forEach(record => {
    console.log(`📅 Date: ${record.date}`);
    console.log(`   Net Sales: $${record.net_sales?.toFixed(2) || 'N/A'}`);
    console.log(`   Credit Tips: $${record.credit_tips?.toFixed(2) || 'N/A'}`);
    console.log(`   Cash Sales: $${record.cash_sales?.toFixed(2) || 'N/A'}`);
    console.log(`   Imported At: ${new Date(record.imported_at).toLocaleString()}`);
    console.log(`   Source: ${record.source}`);
    console.log('');
  });

  // Check if today's data exists
  const todayRecord = data.find(r => r.date === today);
  if (todayRecord) {
    console.log('✅ TODAY\'S EMAIL PARSER RAN SUCCESSFULLY!');
  } else {
    console.log('⚠️  No record for today yet. Parser may run later today (scheduled for 9am PT).');
  }
}

console.log('\n📊 All records in daily_sales table (last 30 days):');
const { data: allRecords } = await supabase
  .from('daily_sales')
  .select('date, source, imported_at')
  .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
  .order('date', { ascending: false });

if (allRecords && allRecords.length > 0) {
  console.table(allRecords);
} else {
  console.log('No records found in last 30 days.');
}
