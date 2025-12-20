// API endpoint to update a user's training progress
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { username, module_number, unit_number, completed } = req.body;

    // Validation
    if (!username || !module_number || !unit_number || completed === undefined) {
      return res.status(400).json({ error: 'Username, module_number, unit_number, and completed are required' });
    }

    if (module_number < 1 || module_number > 5) {
      return res.status(400).json({ error: 'Module number must be between 1 and 5' });
    }

    if (unit_number < 1 || unit_number > 6) {
      return res.status(400).json({ error: 'Unit number must be between 1 and 6' });
    }

    // Initialize Supabase
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_KEY
    );

    // Verify user exists
    const { data: user, error: userError } = await supabase
      .from('training_users')
      .select('username')
      .eq('username', username.toLowerCase())
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update progress record
    const updateData = {
      completed: completed,
      completed_at: completed ? new Date().toISOString() : null
    };

    const { data: updatedProgress, error: updateError } = await supabase
      .from('training_progress')
      .update(updateData)
      .eq('username', username.toLowerCase())
      .eq('module_number', module_number)
      .eq('unit_number', unit_number)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating progress:', updateError);
      return res.status(500).json({ error: 'Failed to update progress' });
    }

    // Update user's last_active timestamp
    await supabase
      .from('training_users')
      .update({ last_active: new Date().toISOString() })
      .eq('username', username.toLowerCase());

    res.status(200).json({
      success: true,
      progress: updatedProgress,
      message: completed
        ? `Module ${module_number}, Unit ${unit_number} marked as complete!`
        : `Module ${module_number}, Unit ${unit_number} marked as incomplete`
    });

  } catch (error) {
    console.error('Error in training-update-progress:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
