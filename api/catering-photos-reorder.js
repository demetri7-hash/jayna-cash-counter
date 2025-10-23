/**
 * Vercel Serverless Function: Reorder Catering Photos & Update Filters
 * Updates display_order, brightness, and contrast for all photos
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
    const { photos } = req.body; // Array of photo objects with id, order, brightness, contrast

    if (!photos || !Array.isArray(photos)) {
      return res.status(400).json({
        success: false,
        error: 'Photos array is required'
      });
    }

    console.log(`🔄 Updating ${photos.length} photos (order + filters)...`);

    // Update each photo's display_order, brightness, and contrast
    const updates = photos.map((photo, index) =>
      supabase
        .from('catering_photos')
        .update({
          display_order: index,
          brightness: photo.brightness || 100,
          contrast: photo.contrast || 100
        })
        .eq('id', photo.id)
    );

    await Promise.all(updates);

    console.log('✅ Photos updated successfully');

    return res.status(200).json({
      success: true,
      message: 'Photos updated successfully'
    });

  } catch (error) {
    console.error('❌ Update error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update photos',
      details: error.message
    });
  }
}
