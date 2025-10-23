/**
 * Vercel Serverless Function: Delete Catering Photo
 * Removes photo from database
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
    const { photoId } = req.body;

    if (!photoId) {
      return res.status(400).json({
        success: false,
        error: 'Photo ID is required'
      });
    }

    console.log(`🗑️ Deleting photo ${photoId}...`);

    const { error } = await supabase
      .from('catering_photos')
      .delete()
      .eq('id', photoId);

    if (error) {
      console.error('❌ Error deleting photo:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to delete photo',
        details: error.message
      });
    }

    console.log('✅ Photo deleted successfully');

    return res.status(200).json({
      success: true,
      message: 'Photo deleted successfully'
    });

  } catch (error) {
    console.error('❌ Delete error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete photo',
      details: error.message
    });
  }
}
