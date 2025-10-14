// Quick test to verify Gmail IMAP connection with new credentials
const Imap = require('imap');
const fs = require('fs');

// Read .env file manually
const envContent = fs.readFileSync('.env', 'utf8');
const envLines = envContent.split('\n');
const env = {};
envLines.forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim();
  }
});

process.env.GMAIL_APP_PASSWORD = env.GMAIL_APP_PASSWORD;

console.log('Testing Gmail IMAP connection...\n');

const imap = new Imap({
  user: 'jaynascans@gmail.com',
  password: process.env.GMAIL_APP_PASSWORD,
  host: 'imap.gmail.com',
  port: 993,
  tls: true,
  tlsOptions: { rejectUnauthorized: false }
});

imap.once('ready', () => {
  console.log('✅ SUCCESS: Connected to Gmail IMAP!');
  console.log('✅ Credentials are working correctly');

  imap.openBox('INBOX', true, (err, box) => {
    if (err) {
      console.error('❌ Error opening inbox:', err);
      imap.end();
      process.exit(1);
    }

    console.log(`✅ Inbox opened successfully`);
    console.log(`📧 Total messages: ${box.messages.total}`);
    console.log(`📬 Unread messages: ${box.messages.new}`);

    // Search for Toast emails
    imap.search([['FROM', 'noreply@toasttab.com']], (err, results) => {
      if (err) {
        console.error('❌ Error searching emails:', err);
      } else {
        console.log(`🔍 Found ${results ? results.length : 0} emails from Toast`);
      }

      imap.end();
      console.log('\n✅ Test completed successfully!');
      process.exit(0);
    });
  });
});

imap.once('error', (err) => {
  console.error('❌ IMAP connection error:', err.message);
  console.error('\n⚠️  This likely means:');
  console.error('   1. Gmail app password is incorrect');
  console.error('   2. IMAP is not enabled in Gmail settings');
  console.error('   3. Network/firewall issue');
  process.exit(1);
});

imap.once('end', () => {
  console.log('📪 IMAP connection closed');
});

console.log('Connecting to Gmail...');
imap.connect();
