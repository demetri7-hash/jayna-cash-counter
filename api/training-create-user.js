// API endpoint to create a new training user
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
    const { username, full_name, role } = req.body;

    // Validation
    if (!username || !full_name) {
      return res.status(400).json({ error: 'Username and full name are required' });
    }

    // Username validation (alphanumeric and underscores only, 3-20 chars)
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(username)) {
      return res.status(400).json({
        error: 'Username must be 3-20 characters and contain only letters, numbers, and underscores'
      });
    }

    // Initialize Supabase
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_KEY
    );

    // Check if username already exists
    const { data: existingUser } = await supabase
      .from('training_users')
      .select('username')
      .eq('username', username.toLowerCase())
      .single();

    if (existingUser) {
      return res.status(409).json({ error: 'Username already exists. Please choose a different username.' });
    }

    // Create new user
    const { data: newUser, error: createError } = await supabase
      .from('training_users')
      .insert([
        {
          username: username.toLowerCase(),
          full_name: full_name,
          role: role || 'Assistant Manager',
          created_at: new Date().toISOString(),
          last_active: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (createError) {
      console.error('Error creating user:', createError);
      return res.status(500).json({ error: 'Failed to create user account' });
    }

    // Initialize progress for all 30 units (5 modules × 6 units)
    const progressRecords = [];
    for (let module = 1; module <= 5; module++) {
      for (let unit = 1; unit <= 6; unit++) {
        progressRecords.push({
          username: username.toLowerCase(),
          module_number: module,
          unit_number: unit,
          completed: false,
          completed_at: null
        });
      }
    }

    const { error: progressError } = await supabase
      .from('training_progress')
      .insert(progressRecords);

    if (progressError) {
      console.error('Error initializing progress:', progressError);
      // Don't fail the whole operation if progress init fails
    }

    res.status(201).json({
      success: true,
      user: newUser,
      message: 'Training account created successfully!'
    });

  } catch (error) {
    console.error('Error in training-create-user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
