// API endpoint to log whatever data Ooma sends
// This will help us understand the format

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Log everything we receive
    const logData = {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      query: req.query,
      headers: req.headers,
      body: req.body,
      cookies: req.cookies
    };

    console.log('='.repeat(60));
    console.log('OOMA DATA RECEIVED:');
    console.log(JSON.stringify(logData, null, 2));
    console.log('='.repeat(60));

    // Try to save to Supabase for persistent logging
    try {
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_KEY
      );

      await supabase.from('ooma_test_log').insert([
        {
          received_at: new Date().toISOString(),
          method: req.method,
          url: req.url,
          query_params: JSON.stringify(req.query),
          headers: JSON.stringify(req.headers),
          body_data: JSON.stringify(req.body),
          raw_data: JSON.stringify(logData)
        }
      ]);
    } catch (dbError) {
      console.log('DB logging failed (table may not exist yet):', dbError.message);
      // Don't fail the request if DB logging fails
    }

    // Return success with the data we received
    return res.status(200).json({
      success: true,
      message: 'Data logged successfully',
      received: logData
    });

  } catch (error) {
    console.error('Logger error:', error);
    return res.status(500).json({
      error: 'Logging failed',
      message: error.message
    });
  }
}
