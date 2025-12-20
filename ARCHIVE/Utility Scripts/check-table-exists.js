// Check if daily_sales table exists in Supabase
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gaawtbqpnnbbnsyswqwv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdhYXd0YnFwbm5iYm5zeXN3cXd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1MDE1NTAsImV4cCI6MjA3MjA3NzU1MH0.F-y7AIQTWaUe7DRT4OnIZVn94mhXxfhpBbng2aJ8nXg';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('Checking if daily_sales table exists...\n');

// Try to query the table
const { data, error } = await supabase
  .from('daily_sales')
  .select('*')
  .limit(1);

if (error) {
  if (error.code === '42P01') {
    console.log('❌ TABLE DOES NOT EXIST');
    console.log('   The daily_sales table has not been created in Supabase.');
    console.log('   You need to run: database/daily_sales_schema.sql\n');
  } else {
    console.log('❌ Error:', error.message);
    console.log('   Code:', error.code);
    console.log('   Details:', error.details);
  }
} else {
  console.log('✅ TABLE EXISTS');
  console.log(`   Found ${data?.length || 0} record(s)\n`);

  if (data && data.length > 0) {
    console.log('Sample record:');
    console.log(JSON.stringify(data[0], null, 2));
  } else {
    console.log('Table exists but is empty. This is expected if the cron hasn\'t run yet.');
  }
}
