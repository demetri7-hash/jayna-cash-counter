/**
 * Vercel Cron Job: Auto-complete Expired Checklists
 * Runs every hour to mark incomplete checklists as complete when their time window expires
 */

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('⏰ Auto-complete: Starting...');

    // Initialize Supabase
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get current Pacific time
    const now = new Date();
    const pacificTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
    const currentHour = pacificTime.getHours();
    const currentMinute = pacificTime.getMinutes();
    const currentTimeInMinutes = (currentHour * 60) + currentMinute;

    console.log(`⏰ Current Pacific Time: ${currentHour}:${String(currentMinute).padStart(2, '0')}`);

    // Get today's date in Pacific time
    const todayDate = pacificTime.toISOString().split('T')[0];
    console.log(`📅 Checking sessions for: ${todayDate}`);

    // Fetch ALL incomplete sessions from today
    const { data: incompleteSessions, error: sessionsError } = await supabase
      .from('foh_checklist_sessions')
      .select('*, checklist_type')
      .eq('session_date', todayDate)
      .eq('is_complete', false);

    if (sessionsError) throw sessionsError;

    if (!incompleteSessions || incompleteSessions.length === 0) {
      console.log('✅ No incomplete sessions found for today');
      return res.json({
        success: true,
        message: 'No incomplete sessions to auto-complete',
        date: todayDate
      });
    }

    console.log(`🔍 Found ${incompleteSessions.length} incomplete sessions`);

    // Fetch checklist definitions to get end times
    const { data: definitions, error: defsError } = await supabase
      .from('checklist_definitions')
      .select('type, end_hour, end_minute, start_hour');

    if (defsError) throw defsError;

    // Create map of checklist types to their end times
    const definitionsMap = {};
    definitions.forEach(def => {
      definitionsMap[def.type] = {
        end_hour: def.end_hour,
        end_minute: def.end_minute,
        start_hour: def.start_hour
      };
    });

    // Check each session to see if it's expired
    const expiredSessionIds = [];
    for (const session of incompleteSessions) {
      const def = definitionsMap[session.checklist_type];

      if (!def || def.end_hour === undefined || def.end_minute === undefined) {
        // No end time defined, skip
        continue;
      }

      const endTimeInMinutes = (def.end_hour * 60) + (def.end_minute || 0);

      // Handle overnight time ranges (e.g., 22:00 to 02:00)
      let isExpired = false;
      if (def.end_hour < def.start_hour) {
        // Overnight range - expired if we're past end time but before start time
        isExpired = currentTimeInMinutes >= endTimeInMinutes && currentTimeInMinutes < (def.start_hour * 60);
      } else {
        // Same-day range - expired if we're past end time
        isExpired = currentTimeInMinutes >= endTimeInMinutes;
      }

      if (isExpired) {
        console.log(`⏰ Session expired: ${session.checklist_type} (end time: ${def.end_hour}:${String(def.end_minute).padStart(2, '0')})`);
        expiredSessionIds.push(session.id);
      }
    }

    if (expiredSessionIds.length === 0) {
      console.log('✅ No expired sessions to auto-complete');
      return res.json({
        success: true,
        message: 'No expired sessions found',
        date: todayDate,
        incompleteSessions: incompleteSessions.length
      });
    }

    // Mark expired sessions as complete
    const completedAt = new Date().toISOString();
    const { data: updated, error: updateError } = await supabase
      .from('foh_checklist_sessions')
      .update({
        is_complete: true,
        completed_at: completedAt,
        updated_at: completedAt
      })
      .in('id', expiredSessionIds)
      .select();

    if (updateError) throw updateError;

    console.log(`✅ Auto-completed ${updated.length} expired sessions`);

    return res.json({
      success: true,
      message: `Auto-completed ${updated.length} expired sessions`,
      date: todayDate,
      sessionsCompleted: updated.length,
      completedSessions: updated.map(s => ({
        id: s.id,
        checklist_type: s.checklist_type,
        started_at: s.started_at,
        completed_at: s.completed_at
      }))
    });

  } catch (error) {
    console.error('❌ Auto-complete error:', error);
    return res.status(500).json({
      error: 'Failed to auto-complete expired checklists',
      details: error.message
    });
  }
}
