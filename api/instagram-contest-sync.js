/**
 * Instagram Contest Vote Sync API
 * Fetches Instagram comments/tags from contest post and syncs votes to database
 * AUTOMATIC VALIDATION: Only counts tags that match actual schools in database
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

    // Get list of valid schools from database (for validation)
    const { data: validSchools, error: schoolsError } = await supabase
      .from('teacher_feast_schools')
      .select('school_name');

    if (schoolsError) {
      throw new Error(`Error fetching schools: ${schoolsError.message}`);
    }

    const validSchoolNames = validSchools.map(s => s.school_name.toLowerCase());
    console.log(`📋 ${validSchoolNames.length} valid schools in database`);

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
    const comments = await fetchInstagramComments(instagramPostId);

    console.log(`📥 Fetched ${comments.length} comments from Instagram`);

    let newVotesCount = 0;
    let skippedDuplicates = 0;
    let skippedInvalid = 0;
    const processedSchools = new Set();
    const invalidTags = [];

    // Process each comment
    for (const comment of comments) {
      try {
        // Extract school tags from comment
        const schoolTags = extractSchoolTags(comment.text);

        for (const schoolTag of schoolTags) {
          // AUTOMATIC VALIDATION: Check if school exists in database
          const validatedSchool = validateSchoolName(schoolTag, validSchoolNames, validSchools);

          if (!validatedSchool) {
            console.log(`⚠️ Invalid school tag "${schoolTag}" from @${comment.username} - NOT COUNTED`);
            invalidTags.push({ tag: schoolTag, username: comment.username });
            skippedInvalid++;
            continue; // Skip invalid school
          }

          // Check if this comment has already been processed
          const { data: existingVote } = await supabase
            .from('teacher_feast_votes')
            .select('id')
            .eq('instagram_comment_id', comment.id)
            .eq('school_name', validatedSchool)
            .single();

          if (existingVote) {
            skippedDuplicates++;
            continue; // Skip duplicate
          }

          // Insert vote
          const { error: voteError } = await supabase
            .from('teacher_feast_votes')
            .insert([{
              school_name: validatedSchool,
              vote_type: 'instagram',
              points: 1,
              instagram_username: comment.username,
              instagram_comment_id: comment.id,
              voted_at: comment.timestamp
            }]);

          if (voteError) {
            console.error(`❌ Error inserting vote for ${validatedSchool}:`, voteError);
            continue;
          }

          // Increment school votes using RPC function
          const { error: incrementError } = await supabase
            .rpc('increment_school_votes', {
              school_name_param: validatedSchool,
              points_param: 1
            });

          if (incrementError) {
            console.error(`❌ Error incrementing votes for ${validatedSchool}:`, incrementError);
            continue;
          }

          newVotesCount++;
          processedSchools.add(validatedSchool);
          console.log(`✅ Added 1 vote for ${validatedSchool} from @${comment.username}`);
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
        duplicate_votes_skipped: skippedDuplicates,
        invalid_tags_skipped: skippedInvalid,
        schools_updated: Array.from(processedSchools),
        invalid_tags_sample: invalidTags.slice(0, 10) // Show first 10 invalid tags
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
 * Validate school name against database
 * Uses fuzzy matching to handle variations
 *
 * @param {string} taggedName - School name from Instagram tag
 * @param {Array} validSchoolNamesLower - Array of lowercase valid school names
 * @param {Array} validSchools - Array of school objects from database
 * @returns {string|null} Valid school name or null if not found
 */
function validateSchoolName(taggedName, validSchoolNamesLower, validSchools) {
  const formatted = formatSchoolName(taggedName);
  const formattedLower = formatted.toLowerCase();

  // Exact match (case-insensitive)
  const exactIndex = validSchoolNamesLower.indexOf(formattedLower);
  if (exactIndex !== -1) {
    return validSchools[exactIndex].school_name;
  }

  // Fuzzy match: Check if tag contains school name or vice versa
  for (let i = 0; i < validSchoolNamesLower.length; i++) {
    const schoolName = validSchoolNamesLower[i];

    // Remove common words for better matching
    const tagCleaned = formattedLower
      .replace(/\b(high|middle|elementary|school)\b/g, '')
      .trim();
    const schoolCleaned = schoolName
      .replace(/\b(high|middle|elementary|school)\b/g, '')
      .trim();

    // Match if core name is the same
    if (tagCleaned && schoolCleaned && (
      tagCleaned.includes(schoolCleaned) ||
      schoolCleaned.includes(tagCleaned)
    )) {
      return validSchools[i].school_name;
    }
  }

  return null; // No match found - invalid tag
}

/**
 * Extract school names from comment text
 * Looks for school tags in various formats:
 * - @SchoolName
 * - #SchoolName
 *
 * @param {string} text - Comment text
 * @returns {Array} Array of potential school names (still need validation)
 */
function extractSchoolTags(text) {
  const schools = [];

  // Remove URLs and emojis for cleaner parsing
  const cleanText = text
    .replace(/https?:\/\/[^\s]+/g, '')
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '');

  // Pattern: @mentions or #hashtags
  const tagPattern = /[@#]([a-zA-Z0-9_\s]+)/g;
  let match;

  while ((match = tagPattern.exec(cleanText)) !== null) {
    const potentialSchool = match[1].trim();
    if (potentialSchool.length > 2) { // Ignore very short tags
      schools.push(formatSchoolName(potentialSchool));
    }
  }

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
