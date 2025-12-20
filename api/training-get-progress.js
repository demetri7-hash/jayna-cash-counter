// API endpoint to get a user's training progress
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
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    // Initialize Supabase
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_KEY
    );

    // Get user info
    const { data: user, error: userError } = await supabase
      .from('training_users')
      .select('*')
      .eq('username', username.toLowerCase())
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update last_active timestamp
    await supabase
      .from('training_users')
      .update({ last_active: new Date().toISOString() })
      .eq('username', username.toLowerCase());

    // Get all progress records
    const { data: progress, error: progressError } = await supabase
      .from('training_progress')
      .select('*')
      .eq('username', username.toLowerCase())
      .order('module_number')
      .order('unit_number');

    if (progressError) {
      console.error('Error fetching progress:', progressError);
      return res.status(500).json({ error: 'Failed to fetch progress' });
    }

    // Calculate statistics
    const totalUnits = 30;
    const completedUnits = progress.filter(p => p.completed).length;
    const completionPercentage = Math.round((completedUnits / totalUnits) * 100);

    // Calculate module completion
    const moduleProgress = {};
    for (let module = 1; module <= 5; module++) {
      const moduleUnits = progress.filter(p => p.module_number === module);
      const completedInModule = moduleUnits.filter(p => p.completed).length;
      moduleProgress[`module_${module}`] = {
        total: 6,
        completed: completedInModule,
        percentage: Math.round((completedInModule / 6) * 100)
      };
    }

    // Find current unit (first incomplete unit)
    const currentUnit = progress.find(p => !p.completed);

    res.status(200).json({
      success: true,
      user: {
        username: user.username,
        full_name: user.full_name,
        role: user.role,
        created_at: user.created_at,
        last_active: user.last_active
      },
      progress: progress,
      statistics: {
        total_units: totalUnits,
        completed_units: completedUnits,
        completion_percentage: completionPercentage,
        module_progress: moduleProgress,
        current_unit: currentUnit ? {
          module: currentUnit.module_number,
          unit: currentUnit.unit_number
        } : null
      }
    });

  } catch (error) {
    console.error('Error in training-get-progress:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
