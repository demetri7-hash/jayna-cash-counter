// Vercel serverless function to receive Ooma caller ID webhooks
// URL: https://jayna-cash-counter.vercel.app/api/ooma-caller-id?number=9165551234&name=JOHN+SMITH

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Enable CORS for testing
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Get caller ID from query parameters
    const { number, name } = req.query;

    if (!number) {
      return res.status(400).json({
        error: 'Missing phone number',
        usage: '/api/ooma-caller-id?number=9165551234&name=JOHN+SMITH'
      });
    }

    console.log('[OOMA WEBHOOK] Received caller ID:', { number, name });

    // Initialize Supabase
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_KEY
    );

    // Store caller ID in database
    const { data, error } = await supabase
      .from('caller_id_queue')
      .insert([
        {
          phone_number: number,
          caller_name: name || 'UNKNOWN',
          received_at: new Date().toISOString(),
          processed: false
        }
      ])
      .select();

    if (error) {
      console.error('[SUPABASE ERROR]', error);
      return res.status(500).json({ error: 'Database error', details: error.message });
    }

    console.log('[SAVED] Caller ID saved to queue:', data);

    // Return success
    return res.status(200).json({
      success: true,
      message: 'Caller ID received and queued',
      data: data[0]
    });

  } catch (error) {
    console.error('[ERROR]', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
