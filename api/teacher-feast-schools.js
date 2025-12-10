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
    // Get all schools with full details
    const { data: schools, error } = await supabase
      .from('teacher_feast_schools')
      .select('*')
      .order('school_name', { ascending: true });

    if (error) throw error;

    // Get latest vote for each school
    const schoolsWithLatestVote = await Promise.all(
      (schools || []).map(async (school) => {
        // Get the most recent vote for this school
        const { data: latestVoteData } = await supabase
          .from('teacher_feast_votes')
          .select('voted_at')
          .eq('school_name', school.school_name)
          .order('voted_at', { ascending: false })
          .limit(1)
          .single();

        return {
          ...school,
          latest_vote: latestVoteData?.voted_at || null
        };
      })
    );

    res.status(200).json({
      success: true,
      schools: schoolsWithLatestVote
    });

  } catch (error) {
    console.error('❌ Schools list error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
