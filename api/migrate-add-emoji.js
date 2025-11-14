/**
 * Vercel Serverless Function: Add Emoji Field Migration
 * Adds order_emoji column to catering_orders table
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🔄 Running emoji field migration...');
    console.log('⚠️  NOTE: Run the SQL migration file manually in Supabase SQL editor first!');
    console.log('📄 File: sql/add_emoji_to_catering_orders.sql');

    // Emoji list for backfilling
    const emojis = [
      '🍕', '🍔', '🌮', '🌯', '🍗', '🍖', '🥗', '🍝', '🍜', '🍲',
      '🍱', '🍛', '🍣', '🍤', '🥘', '🥙', '🥪', '🌭', '🍟', '🥓',
      '🥩', '🍳', '🥞', '🧇', '🧆', '🥟', '🍢', '🍡', '🍧', '🍨',
      '🍦', '🥧', '🧁', '🍰', '🎂', '🍮', '🍭', '🍬', '🍫', '🍿',
      '🧃', '🧉', '🥤', '☕', '🍵', '🫖', '🍾', '🥂', '🍻', '🍺',
      '🍇', '🍈', '🍉', '🍊', '🍋', '🍌', '🍍', '🥭', '🍎', '🍏',
      '🍐', '🍑', '🍒', '🍓', '🫐', '🥝', '🍅', '🫒', '🥥', '🥑'
    ];

    // Get all orders without emoji
    const { data: ordersWithoutEmoji, error: fetchError } = await supabase
      .from('catering_orders')
      .select('id')
      .is('order_emoji', null);

    if (fetchError) {
      console.error('❌ Error fetching orders:', fetchError);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch orders',
        details: fetchError.message
      });
    }

    console.log(`🎯 Found ${ordersWithoutEmoji?.length || 0} orders without emojis`);

    // Assign random emoji to each order
    if (ordersWithoutEmoji && ordersWithoutEmoji.length > 0) {
      for (const order of ordersWithoutEmoji) {
        const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];

        const { error: updateError } = await supabase
          .from('catering_orders')
          .update({ order_emoji: randomEmoji })
          .eq('id', order.id);

        if (updateError) {
          console.error(`⚠️  Error updating order ${order.id}:`, updateError);
        }
      }

      console.log(`✅ Backfilled ${ordersWithoutEmoji.length} orders with random emojis`);
    }

    return res.status(200).json({
      success: true,
      message: '✅ Emoji field migration completed successfully!',
      data: {
        ordersBackfilled: ordersWithoutEmoji?.length || 0
      }
    });

  } catch (error) {
    console.error('❌ Migration error:', error);

    return res.status(500).json({
      success: false,
      error: 'Migration failed',
      details: error.message
    });
  }
}
