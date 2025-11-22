/**
 * Instagram Contest Vote Sync API
 * Fetches Instagram comments/tags from contest post and syncs votes to database
 *
 * This endpoint should be called periodically (via cron job or manual trigger)
 * to sync Instagram tags with the leaderboard
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    console.log('🔄 Starting Instagram vote sync...');

    // Get Instagram post ID from config
    const { data: configData, error: configError } = await supabase
      .from('teacher_feast_config')
      .select('config_value')
      .eq('config_key', 'instagram_post_id')
      .single();

    if (configError) {
      throw new Error(`Config error: ${configError.message}`);
    }

    const instagramPostId = configData.config_value;

    if (!instagramPostId || instagramPostId === 'PLACEHOLDER_POST_ID') {
      return res.status(400).json({
        success: false,
        error: 'Instagram post ID not configured. Please update teacher_feast_config table.'
      });
    }

    // Fetch Instagram comments using Instagram Basic Display API or Graph API
    // Note: You'll need to implement this based on your Instagram API access
    const comments = await fetchInstagramComments(instagramPostId);

    console.log(`📥 Fetched ${comments.length} comments from Instagram`);

    let newVotesCount = 0;
    let skippedVotesCount = 0;
    const processedSchools = new Set();

    // Process each comment
    for (const comment of comments) {
      try {
        // Extract school tags from comment
        const schoolTags = extractSchoolTags(comment.text);

        for (const schoolName of schoolTags) {
          // Check if this comment has already been processed
          const { data: existingVote } = await supabase
            .from('teacher_feast_votes')
            .select('id')
            .eq('instagram_comment_id', comment.id)
            .eq('school_name', schoolName)
            .single();

          if (existingVote) {
            skippedVotesCount++;
            continue; // Skip duplicate
          }

          // Insert vote
          const { error: voteError } = await supabase
            .from('teacher_feast_votes')
            .insert([{
              school_name: schoolName,
              vote_type: 'instagram',
              points: 1,
              instagram_username: comment.username,
              instagram_comment_id: comment.id,
              voted_at: comment.timestamp
            }]);

          if (voteError) {
            console.error(`❌ Error inserting vote for ${schoolName}:`, voteError);
            continue;
          }

          // Increment school votes using RPC function
          const { error: incrementError } = await supabase
            .rpc('increment_school_votes', {
              school_name_param: schoolName,
              points_param: 1
            });

          if (incrementError) {
            console.error(`❌ Error incrementing votes for ${schoolName}:`, incrementError);
            continue;
          }

          newVotesCount++;
          processedSchools.add(schoolName);
          console.log(`✅ Added 1 vote for ${schoolName} from @${comment.username}`);
        }
      } catch (error) {
        console.error(`❌ Error processing comment ${comment.id}:`, error);
      }
    }

    console.log('✅ Instagram sync completed');

    res.status(200).json({
      success: true,
      message: 'Instagram votes synced successfully',
      stats: {
        total_comments_processed: comments.length,
        new_votes_added: newVotesCount,
        duplicate_votes_skipped: skippedVotesCount,
        schools_updated: Array.from(processedSchools)
      }
    });

  } catch (error) {
    console.error('❌ Instagram sync error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Fetch Instagram comments for the contest post
 *
 * NOTE: This is a placeholder function. You'll need to implement this based on:
 * 1. Instagram Basic Display API (for personal accounts)
 * 2. Instagram Graph API (for business accounts)
 * 3. Third-party Instagram scraping service
 *
 * @param {string} postId - Instagram post ID
 * @returns {Array} Array of comment objects
 */
async function fetchInstagramComments(postId) {
  // Option 1: Instagram Graph API (requires Facebook App + Business Account)
  if (process.env.INSTAGRAM_ACCESS_TOKEN) {
    return await fetchCommentsViaGraphAPI(postId);
  }

  // Option 2: Manual import (fallback)
  console.warn('⚠️ Instagram API not configured. Using manual import mode.');
  return [];
}

/**
 * Fetch comments using Instagram Graph API
 * Requires: Facebook App, Instagram Business Account, Access Token
 */
async function fetchCommentsViaGraphAPI(postId) {
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  const url = `https://graph.instagram.com/${postId}/comments?fields=id,text,username,timestamp&access_token=${accessToken}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      throw new Error(`Instagram API error: ${data.error.message}`);
    }

    return data.data || [];
  } catch (error) {
    console.error('❌ Instagram Graph API error:', error);
    return [];
  }
}

/**
 * Extract school names from comment text
 * Looks for school tags in various formats:
 * - @SchoolName
 * - #SchoolName
 * - School Name (matched against database)
 *
 * @param {string} text - Comment text
 * @returns {Array} Array of school names
 */
function extractSchoolTags(text) {
  const schools = [];

  // Remove URLs and emojis for cleaner parsing
  const cleanText = text
    .replace(/https?:\/\/[^\s]+/g, '')
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '');

  // Pattern 1: @mentions or #hashtags
  const tagPattern = /[@#]([a-zA-Z0-9_\s]+)/g;
  let match;

  while ((match = tagPattern.exec(cleanText)) !== null) {
    const potentialSchool = match[1].trim();
    schools.push(formatSchoolName(potentialSchool));
  }

  // Pattern 2: Direct school name mentions (you may need to maintain a list)
  // This could be enhanced by checking against known school names in database

  return [...new Set(schools)]; // Remove duplicates
}

/**
 * Format school name to match database entries
 * @param {string} name - Raw school name from comment
 * @returns {string} Formatted school name
 */
function formatSchoolName(name) {
  // Convert to title case and clean up
  return name
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .trim();
}
