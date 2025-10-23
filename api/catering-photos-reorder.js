/**
 * Vercel Serverless Function: Reorder Catering Photos
 * Updates display_order for all photos based on new positions
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { photoIds } = req.body; // Array of photo IDs in new order

    if (!photoIds || !Array.isArray(photoIds)) {
      return res.status(400).json({
        success: false,
        error: 'Photo IDs array is required'
      });
    }

    console.log(`🔄 Reordering ${photoIds.length} photos...`);

    // Update each photo's display_order
    const updates = photoIds.map((id, index) =>
      supabase
        .from('catering_photos')
        .update({ display_order: index })
        .eq('id', id)
    );

    await Promise.all(updates);

    console.log('✅ Photos reordered successfully');

    return res.status(200).json({
      success: true,
      message: 'Photos reordered successfully'
    });

  } catch (error) {
    console.error('❌ Reorder error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to reorder photos',
      details: error.message
    });
  }
}
