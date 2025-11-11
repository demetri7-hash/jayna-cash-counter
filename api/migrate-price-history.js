/**
 * One-time migration: Add source columns to price_history table
 * Run once to fix: "Could not find the 'source' column of 'price_history'"
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role key for migrations
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
    console.log('🔧 Running price_history migration...');

    // Add missing columns using raw SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        -- Add source tracking columns to price_history table
        ALTER TABLE price_history
        ADD COLUMN IF NOT EXISTS source TEXT,
        ADD COLUMN IF NOT EXISTS source_id BIGINT,
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

        -- Create indexes for fast lookups
        CREATE INDEX IF NOT EXISTS idx_price_history_source ON price_history(source);
        CREATE INDEX IF NOT EXISTS idx_price_history_source_id ON price_history(source_id);
      `
    });

    if (error) {
      console.error('❌ Migration failed:', error);

      // If exec_sql doesn't exist, return SQL for manual execution
      return res.status(200).json({
        success: false,
        error: 'Could not run migration automatically',
        message: 'Please run the SQL manually in Supabase SQL Editor',
        sql: `
ALTER TABLE price_history
ADD COLUMN IF NOT EXISTS source TEXT,
ADD COLUMN IF NOT EXISTS source_id BIGINT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_price_history_source ON price_history(source);
CREATE INDEX IF NOT EXISTS idx_price_history_source_id ON price_history(source_id);
        `.trim()
      });
    }

    console.log('✅ Migration completed successfully');

    return res.status(200).json({
      success: true,
      message: 'price_history table updated with source columns',
      columns_added: ['source', 'source_id', 'updated_at'],
      indexes_created: ['idx_price_history_source', 'idx_price_history_source_id']
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
