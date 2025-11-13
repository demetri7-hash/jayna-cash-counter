const fs = require('fs');
const https = require('https');

// Supabase credentials
const SUPABASE_URL = 'https://gaawtbqpnnbbnsyswqwv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdhYXd0YnFwbm5iYm5zeXN3cXd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1MDE1NTAsImV4cCI6MjA3MjA3NzU1MH0.F-y7AIQTWaUe7DRT4OnIZVn94mhXxfhpBbng2aJ8nXg';

// Role mapping function
function mapRole(csvRole) {
  if (!csvRole || csvRole.trim() === '') return null;
  
  const role = csvRole.toUpperCase().trim();
  
  // Bartenders
  if (role === 'BARTENDER') return 'Bartender';
  
  // Servers
  if (role === 'SERVER' || role === 'SERVER TRAIN') return 'Server';
  
  // Support Staff (hosts, bussers, food runners)
  if (role.includes('HOST') || 
      role.includes('BUSSER') || 
      role.includes('RUNNER') ||
      role.includes('EXPO')) {
    return 'Support Staff';
  }
  
  // Skip back of house
  if (role.includes('COOK') || 
      role.includes('PREP') || 
      role.includes('DISH') ||
      role.includes('KITCHEN')) {
    return 'SKIP';
  }
  
  // Skip managers
  if (role.includes('MANAGER')) return 'SKIP';
  
  // Unknown - leave blank
  return null;
}

// Parse CSV
const csvContent = fs.readFileSync('/Users/demetrigregorakis/Downloads/team-Tarla LLC.csv', 'utf-8');
const lines = csvContent.split('\n').filter(line => line.trim());
const employees = [];

for (let i = 1; i < lines.length; i++) {
  const line = lines[i];
  if (!line.includes('Tarla Grill')) continue;
  
  const parts = line.split(',');
  const firstName = parts[0]?.replace(/"/g, '').trim();
  const lastName = parts[1]?.replace(/"/g, '').trim();
  const csvRole = parts[12]?.replace(/"/g, '').trim();
  
  if (!firstName) continue;
  
  const mappedRole = mapRole(csvRole);
  if (mappedRole === 'SKIP') continue;
  
  const fullName = lastName ? `${firstName} ${lastName}` : firstName;
  
  employees.push({
    name: fullName,
    role: mappedRole,
    csvRole: csvRole || '(empty)'
  });
}

console.log(`\n📊 PARSED ${employees.length} FOH EMPLOYEES FROM CSV:\n`);
employees.forEach((emp, idx) => {
  const roleDisplay = emp.role || '❓ (blank - needs manual entry)';
  console.log(`${idx + 1}. ${emp.name.padEnd(30)} → ${roleDisplay.padEnd(20)} [CSV: ${emp.csvRole}]`);
});

// Function to make Supabase request
function supabaseRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'gaawtbqpnnbbnsyswqwv.supabase.co',
      path: `/rest/v1/${path}`,
      method: method,
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      }
    };
    
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(body ? JSON.parse(body) : null);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        }
      });
    });
    
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function run() {
  console.log('\n🗑️  STEP 1: Deleting all existing test employees...\n');
  
  try {
    await supabaseRequest('DELETE', 'tarla_employees?tarla_id=gte.0');
    console.log('✅ All test employees deleted\n');
  } catch (err) {
    console.error('❌ Error deleting:', err.message);
    process.exit(1);
  }
  
  console.log('📥 STEP 2: Importing real employees...\n');
  
  const insertData = employees.map(emp => ({
    tarla_name: emp.name,
    tarla_role: emp.role || '',
    tarla_is_active: true
  }));
  
  try {
    await supabaseRequest('POST', 'tarla_employees', insertData);
    console.log(`✅ Successfully imported ${employees.length} employees!\n`);
    console.log('📋 SUMMARY:');
    console.log(`   Servers: ${employees.filter(e => e.role === 'Server').length}`);
    console.log(`   Bartenders: ${employees.filter(e => e.role === 'Bartender').length}`);
    console.log(`   Support Staff: ${employees.filter(e => e.role === 'Support Staff').length}`);
    console.log(`   Blank (need manual entry): ${employees.filter(e => !e.role).length}`);
    console.log('\n✨ Import complete! Visit roster.html to review and edit roles as needed.\n');
  } catch (err) {
    console.error('❌ Error importing:', err.message);
    process.exit(1);
  }
}

run();
