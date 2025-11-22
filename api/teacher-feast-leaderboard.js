/**
 * Teacher Feast Contest - Get Leaderboard
 * Returns top 5 schools with vote counts
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get top 5 schools
    const { data: schools, error } = await supabase
      .from('teacher_feast_schools')
      .select('*')
      .order('total_votes', { ascending: false })
      .order('updated_at', { ascending: true })
      .limit(5);

    if (error) throw error;

    res.status(200).json({
      success: true,
      schools: schools || [],
      last_updated: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Leaderboard error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
