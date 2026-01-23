/**
 * Vercel Serverless Function: Update Courier Assignment
 * Updates the courier (driver) assigned to a catering order
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
    const { orderId, courierName, courierPhone } = req.body;

    if (!orderId || !courierName || !courierPhone) {
      return res.status(400).json({
        success: false,
        error: 'orderId, courierName, and courierPhone are required'
      });
    }

    console.log(`🚚 Updating courier for order ${orderId}: ${courierName} ${courierPhone}`);

    // Initialize Supabase
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Update courier assignment in database
    const { data, error } = await supabase
      .from('catering_orders')
      .update({
        courier_name: courierName,
        courier_phone: courierPhone,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .select()
      .single();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    console.log(`✅ Courier updated successfully for order ${orderId}`);

    return res.status(200).json({
      success: true,
      message: `Courier assigned: ${courierName}`,
      data: data
    });

  } catch (error) {
    console.error('❌ Update courier error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update courier assignment',
      details: error.message
    });
  }
}
