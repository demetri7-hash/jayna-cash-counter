/**
 * Teacher Feast Contest - Submit Form Vote
 * Handles double-points form submissions with newsletter signup
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
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { school_name, full_name, email, phone, newsletter_signup } = req.body;

    // Validate required fields
    if (!school_name || !full_name || !email || !phone) {
      return res.status(400).json({
        success: false,
        error: 'All fields are required'
      });
    }

    if (!newsletter_signup) {
      return res.status(400).json({
        success: false,
        error: 'Newsletter signup is required'
      });
    }

    // Validate phone number - reject all zeros or invalid patterns
    const phoneDigits = phone.replace(/\D/g, ''); // Remove all non-digit characters
    if (phoneDigits.length < 10) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid phone number'
      });
    }
    if (/^0+$/.test(phoneDigits)) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid phone number'
      });
    }

    // Get IP address for fraud tracking
    const ip_address = req.headers['x-forwarded-for']?.split(',')[0].trim() ||
                       req.headers['x-real-ip'] ||
                       'unknown';

    // Check IP-based rate limiting (1 vote per hour per IP)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recentIpVote } = await supabase
      .from('teacher_feast_votes')
      .select('voted_at')
      .eq('ip_address', ip_address)
      .gte('voted_at', oneHourAgo)
      .order('voted_at', { ascending: false })
      .limit(1)
      .single();

    if (recentIpVote) {
      const lastVoteTime = new Date(recentIpVote.voted_at);
      const nextVoteTime = new Date(lastVoteTime.getTime() + 60 * 60 * 1000);
      const now = new Date();
      const minutesRemaining = Math.ceil((nextVoteTime - now) / (1000 * 60));

      return res.status(429).json({
        success: false,
        error: `We see you're eager to help your school win! 🎓 You can vote again in ${minutesRemaining} minute${minutesRemaining !== 1 ? 's' : ''}. Thank you for your patience!`,
        waitTime: minutesRemaining,
        nextVoteTime: nextVoteTime.toISOString()
      });
    }

    // Check for duplicate email (only 1 vote per email address ever)
    const { data: existingVote } = await supabase
      .from('teacher_feast_votes')
      .select('id, school_name, voted_at')
      .eq('email', email)
      .single();

    if (existingVote) {
      return res.status(400).json({
        success: false,
        error: 'This email address has already voted. Only 1 vote per email address is allowed. Thank you for your support! ⚠️ Note: We\'ve noticed some people using fake email addresses to vote multiple times. This contest is for a good cause - to celebrate and feed our hardworking teachers. Cheating is NOT okay with us and undermines this wonderful initiative. Please play fair! 💙'
      });
    }

    // Check if school exists, create if it doesn't (for custom schools)
    const { data: schoolExists } = await supabase
      .from('teacher_feast_schools')
      .select('school_name')
      .eq('school_name', school_name)
      .single();

    if (!schoolExists) {
      // Auto-create custom school
      console.log(`🆕 Creating custom school: ${school_name}`);

      const { error: createSchoolError } = await supabase
        .from('teacher_feast_schools')
        .insert([{
          school_name: school_name,
          instagram_handles: [],
          total_votes: 0,
          instagram_votes: 0,
          form_votes: 0
        }]);

      if (createSchoolError) {
        // Check if error is due to duplicate (race condition)
        if (!createSchoolError.message.includes('duplicate')) {
          console.error('Error creating custom school:', createSchoolError);
          return res.status(500).json({
            success: false,
            error: 'Error creating custom school'
          });
        }
        // If duplicate, it means another request created it, continue
      }
    }

    // Insert vote
    const { error: voteError } = await supabase
      .from('teacher_feast_votes')
      .insert([{
        school_name,
        vote_type: 'form',
        points: 2,
        full_name,
        email,
        phone,
        newsletter_signup,
        voted_at: new Date().toISOString(),
        ip_address
      }]);

    if (voteError) throw voteError;

    // Update school votes (2 points for form submission)
    const { error: incrementError } = await supabase.rpc('increment_school_votes', {
      school_name_param: school_name,
      points_param: 2
    });

    if (incrementError) throw incrementError;

    // Add to newsletter if not already subscribed
    const { error: newsletterError } = await supabase
      .from('teacher_feast_newsletter')
      .upsert([{
        email,
        full_name,
        phone,
        school_name,
        subscribed_at: new Date().toISOString(),
        is_active: true
      }], {
        onConflict: 'email',
        ignoreDuplicates: false
      });

    // Don't fail vote if newsletter insert fails
    if (newsletterError) {
      console.warn('⚠️ Newsletter insert warning:', newsletterError);
    }

    console.log(`✅ Vote submitted: ${school_name} (+2 points) from ${email}`);

    res.status(200).json({
      success: true,
      message: 'Vote counted! 2 points added.',
      school: school_name,
      points: 2
    });

  } catch (error) {
    console.error('❌ Vote submission error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error submitting vote'
    });
  }
}
