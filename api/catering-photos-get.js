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

    // Fetch only needed fields - EXCLUDE image_data (base64) for 33% bandwidth savings
    // We use image_url (Supabase Storage URL) instead
    const { data: photos, error } = await supabase
      .from('catering_photos')
      .select('id, image_url, display_order, brightness, contrast, order_type, order_due_date, time_due, leave_jayna_at, guest_name, phone_number, email, delivery_address, special_notes, actual_order, caption, uploaded_by, created_at, archived, calendar_event_id')
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
