// Vercel Cron Job: Parse Toast Performance Summary Emails
// Runs daily at 5pm UTC (9am PT) - after Toast sends emails (4-9am PT)
// Fetches emails from jaynascans@gmail.com, parses data, saves to Supabase

import { createClient } from '@supabase/supabase-js';
import Imap from 'imap';
import { simpleParser } from 'mailparser';

export default async function handler(req, res) {
  // Verify this is a cron request (Vercel adds special headers)
  if (req.headers['x-vercel-cron'] !== '1') {
    return res.status(401).json({ error: 'Unauthorized - not a cron request' });
  }

  try {
    console.log('Starting Toast email parsing cron job...');

    // Initialize Supabase client
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY
    );

    // Gmail IMAP configuration
    const imap = new Imap({
      user: 'jaynascans@gmail.com',
      password: process.env.GMAIL_APP_PASSWORD, // App-specific password from Gmail
      host: 'imap.gmail.com',
      port: 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false }
    });

    const emails = await fetchUnreadToastEmails(imap);
    console.log(`Found ${emails.length} unread Toast emails`);

    const parsedData = [];

    for (const email of emails) {
      try {
        const data = parseToastPerformanceEmail(email);
        if (data) {
          // Save to database
          const { error } = await supabase
            .from('daily_sales')
            .upsert(data, { onConflict: 'date' });

          if (error) {
            console.error('Error saving to database:', error);
          } else {
            parsedData.push(data);
            console.log(`Saved data for ${data.date}`);
          }
        }
      } catch (parseError) {
        console.error('Error parsing email:', parseError);
      }
    }

    // Mark emails as read
    await markEmailsAsRead(imap, emails);

    return res.json({
      success: true,
      message: `Processed ${parsedData.length} Toast performance emails`,
      data: parsedData
    });

  } catch (error) {
    console.error('Cron job error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// Fetch unread emails from Toast
async function fetchUnreadToastEmails(imap) {
  return new Promise((resolve, reject) => {
    const emails = [];

    imap.once('ready', () => {
      imap.openBox('INBOX', false, (err, box) => {
        if (err) return reject(err);

        // Search for unread emails from Toast
        imap.search([
          'UNSEEN',
          ['FROM', 'noreply@toasttab.com']
        ], (err, results) => {
          if (err) return reject(err);
          if (!results || results.length === 0) {
            imap.end();
            return resolve([]);
          }

          const fetch = imap.fetch(results, { bodies: '', markSeen: false });

          fetch.on('message', (msg, seqno) => {
            msg.on('body', (stream, info) => {
              simpleParser(stream, async (err, parsed) => {
                if (err) {
                  console.error('Error parsing email:', err);
                  return;
                }
                emails.push({
                  uid: seqno,
                  subject: parsed.subject,
                  text: parsed.text,
                  html: parsed.html,
                  date: parsed.date,
                  attachments: parsed.attachments
                });
              });
            });
          });

          fetch.once('error', reject);
          fetch.once('end', () => {
            imap.end();
            resolve(emails);
          });
        });
      });
    });

    imap.once('error', reject);
    imap.connect();
  });
}

// Parse Toast Performance Summary email
function parseToastPerformanceEmail(email) {
  const html = email.html || '';
  const text = email.text || '';

  // Check if this is a Daily or Weekly Performance Summary
  if (!email.subject?.includes('Performance Summary')) {
    return null;
  }

  // Extract date from subject or body
  const dateMatch = email.subject.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
  if (!dateMatch) return null;

  const emailDate = new Date(dateMatch[1]);
  const formattedDate = emailDate.toISOString().split('T')[0];

  // Parse key metrics from HTML/text
  // Toast emails typically have structured data like:
  // "Net Sales: $X,XXX.XX"
  // "Credit Tips: $XXX.XX"
  // "Cash Sales: $XXX.XX"

  const netSalesMatch = html.match(/Net Sales[:\s]*\$?([\d,]+\.?\d*)/i);
  const creditTipsMatch = html.match(/Credit.*Tips[:\s]*\$?([\d,]+\.?\d*)/i);
  const cashSalesMatch = html.match(/Cash.*Sales[:\s]*\$?([\d,]+\.?\d*)/i);

  return {
    date: formattedDate,
    net_sales: netSalesMatch ? parseFloat(netSalesMatch[1].replace(/,/g, '')) : null,
    credit_tips: creditTipsMatch ? parseFloat(creditTipsMatch[1].replace(/,/g, '')) : null,
    cash_sales: cashSalesMatch ? parseFloat(cashSalesMatch[1].replace(/,/g, '')) : null,
    imported_at: new Date().toISOString(),
    source: 'toast_email_auto'
  };
}

// Mark emails as read
async function markEmailsAsRead(imap, emails) {
  return new Promise((resolve, reject) => {
    if (emails.length === 0) return resolve();

    imap.once('ready', () => {
      imap.openBox('INBOX', false, (err, box) => {
        if (err) return reject(err);

        const uids = emails.map(e => e.uid);
        imap.addFlags(uids, ['\\Seen'], (err) => {
          imap.end();
          if (err) return reject(err);
          resolve();
        });
      });
    });

    imap.connect();
  });
}
