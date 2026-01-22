/**
 * Vercel Serverless Function: Update Auto-Tracking
 * Toggle auto-tracking on/off for an order
 */

import { createClient } from '@supabase/supabase-js';

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
    const { orderId, enabled } = req.body;

    if (!orderId || enabled === undefined) {
      return res.status(400).json({
        success: false,
        error: 'orderId and enabled are required'
      });
    }

    console.log(`🔄 Updating auto-tracking for order ${orderId}: ${enabled}`);

    // Initialize Supabase
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Update auto_tracking_enabled
    const { error } = await supabase
      .from('catering_orders')
      .update({
        auto_tracking_enabled: enabled
      })
      .eq('id', orderId);

    if (error) {
      throw error;
    }

    console.log(`✅ Auto-tracking ${enabled ? 'enabled' : 'disabled'} for order ${orderId}`);

    return res.status(200).json({
      success: true,
      message: `Auto-tracking ${enabled ? 'enabled' : 'disabled'}`
    });

  } catch (error) {
    console.error('❌ Error updating auto-tracking:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
