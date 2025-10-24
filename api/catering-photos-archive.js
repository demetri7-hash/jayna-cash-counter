/**
 * Vercel Serverless Function: Archive/Unarchive Catering Photo
 * Updates the archived status of a photo in the database
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
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
    const { photoId, archived } = req.body;

    if (!photoId) {
      return res.status(400).json({
        success: false,
        error: 'Photo ID is required'
      });
    }

    if (typeof archived !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'Archived status must be a boolean'
      });
    }

    console.log(`📦 ${archived ? 'Archiving' : 'Unarchiving'} photo ${photoId}...`);

    // Update archived status
    const { data, error } = await supabase
      .from('catering_photos')
      .update({ archived })
      .eq('id', photoId)
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating photo:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update photo',
        details: error.message
      });
    }

    console.log(`✅ Photo ${archived ? 'archived' : 'unarchived'} successfully (ID: ${photoId})`);

    return res.status(200).json({
      success: true,
      message: `Photo ${archived ? 'archived' : 'unarchived'} successfully`,
      data: data
    });

  } catch (error) {
    console.error('❌ Archive error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update photo',
      details: error.message
    });
  }
}
