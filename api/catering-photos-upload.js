/**
 * Vercel Serverless Function: Upload Catering Photo
 * Stores base64 image in database with auto-incrementing display order
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
    const { imageData, caption } = req.body;

    if (!imageData) {
      return res.status(400).json({
        success: false,
        error: 'Image data is required'
      });
    }

    console.log('📸 Uploading catering photo...');

    // Get current max display order
    const { data: maxOrder } = await supabase
      .from('catering_photos')
      .select('display_order')
      .order('display_order', { ascending: false })
      .limit(1);

    const nextOrder = (maxOrder && maxOrder.length > 0) ? maxOrder[0].display_order + 1 : 0;

    // Insert photo
    const { data: photo, error } = await supabase
      .from('catering_photos')
      .insert({
        image_data: imageData,
        image_url: imageData, // For now, store base64 as URL
        caption: caption || null,
        display_order: nextOrder
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error uploading photo:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to upload photo',
        details: error.message
      });
    }

    console.log(`✅ Photo uploaded successfully (ID: ${photo.id})`);

    return res.status(200).json({
      success: true,
      message: 'Photo uploaded successfully',
      data: photo
    });

  } catch (error) {
    console.error('❌ Upload error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to upload photo',
      details: error.message
    });
  }
}
