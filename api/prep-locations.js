/**
 * Vercel Serverless Function: Prep Locations Management
 * Manage custom prep areas/locations for multi-location inventory tracking
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // GET: Fetch all prep locations
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('prep_locations')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;

      return res.status(200).json({
        success: true,
        data: data || []
      });
    }

    // POST: Add new prep location
    if (req.method === 'POST') {
      const { name } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Location name is required'
        });
      }

      // Capitalize first letter
      const locationName = name.charAt(0).toUpperCase() + name.slice(1);

      // Check if location already exists
      const { data: existing } = await supabase
        .from('prep_locations')
        .select('*')
        .eq('name', locationName)
        .single();

      if (existing) {
        return res.status(200).json({
          success: true,
          data: existing,
          message: 'Location already exists'
        });
      }

      // Create new location
      const { data, error } = await supabase
        .from('prep_locations')
        .insert([{
          name: locationName,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;

      return res.status(200).json({
        success: true,
        data: data,
        message: 'Location created successfully'
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('❌ Prep locations error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to manage prep locations',
      details: error.message
    });
  }
}
