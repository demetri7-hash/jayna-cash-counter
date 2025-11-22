/**
 * Teacher Feast Contest - Get All Schools
 * Returns list of all schools for form dropdown
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
    const { data: schools, error } = await supabase
      .from('teacher_feast_schools')
      .select('school_name')
      .order('school_name', { ascending: true });

    if (error) throw error;

    res.status(200).json({
      success: true,
      schools: schools || []
    });

  } catch (error) {
    console.error('❌ Schools list error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
