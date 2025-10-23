/**
 * Vercel Serverless Function: Get All Catering Photos
 * Returns photos ordered by display_order
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('📸 Fetching catering photos...');

    const { data: photos, error } = await supabase
      .from('catering_photos')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) {
      console.error('❌ Error fetching photos:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch photos',
        details: error.message
      });
    }

    console.log(`✅ Found ${photos.length} photos`);

    return res.status(200).json({
      success: true,
      data: photos
    });

  } catch (error) {
    console.error('❌ Fetch error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch photos',
      details: error.message
    });
  }
}
