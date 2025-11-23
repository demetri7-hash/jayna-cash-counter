/**
 * Instagram Comment Scraper - Manual Trigger
 * Allows manual scraping anytime (for testing or immediate updates)
 * Uses Instagram's public JSON endpoint (no auth needed, no npm packages)
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export default async function handler(req, res) {
  // Set CORS headers
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
    console.log('🤖 Manual Instagram scraper triggered');

    // Get contest configuration from database
    const { data: config, error: configError } = await supabase
      .from('teacher_feast_config')
      .select('config_key, config_value')
      .in('config_key', ['instagram_post_shortcode', 'last_scraped_comment_id']);

    if (configError) throw configError;

    const configMap = {};
    config.forEach(item => {
      configMap[item.config_key] = item.config_value;
    });

    const postShortcode = configMap.instagram_post_shortcode;
    const lastScrapedId = configMap.last_scraped_comment_id || null;

    if (!postShortcode || postShortcode === 'PLACEHOLDER') {
      return res.status(400).json({
        success: false,
        error: 'No post shortcode configured. Please add it to teacher_feast_config table.'
      });
    }

    console.log(`📸 Scraping comments from post: ${postShortcode}`);
    console.log(`📍 Last scraped comment ID: ${lastScrapedId || 'None (first run)'}`);

    // Fetch post data from Instagram's public JSON endpoint
    const instagramUrl = `https://www.instagram.com/p/${postShortcode}/?__a=1&__d=dis`;

    const response = await fetch(instagramUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        'X-Requested-With': 'XMLHttpRequest'
      }
    });

    if (!response.ok) {
      throw new Error(`Instagram returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Extract media data from Instagram response
    const media = data?.items?.[0] || data?.graphql?.shortcode_media;

    if (!media) {
      throw new Error('Unable to parse Instagram response - media data not found');
    }

    // Extract comments from media data
    let allComments = [];

    // Try different response structures (Instagram changes format)
    if (media.edge_media_to_parent_comment) {
      // GraphQL format
      allComments = media.edge_media_to_parent_comment.edges.map(edge => ({
        id: edge.node.id,
        text: edge.node.text,
        username: edge.node.owner.username,
        timestamp: edge.node.created_at
      }));
    } else if (media.comments) {
      // Alternative format
      allComments = media.comments.map(comment => ({
        id: comment.pk || comment.id,
        text: comment.text,
        username: comment.user?.username || 'unknown',
        timestamp: comment.created_at || comment.created_at_utc
      }));
    }

    console.log(`📥 Fetched ${allComments.length} comments total`);

    // Filter out already-processed comments
    let newComments = allComments;
    if (lastScrapedId) {
      const lastScrapedIndex = allComments.findIndex(c => c.id === lastScrapedId);
      if (lastScrapedIndex !== -1) {
        newComments = allComments.slice(0, lastScrapedIndex);
        console.log(`✂️ Filtered to ${newComments.length} new comments (after last scraped)`);
      }
    }

    if (newComments.length === 0) {
      console.log('✅ No new comments to process');
      return res.status(200).json({
        success: true,
        message: 'No new comments since last run',
        stats: {
          total_fetched: allComments.length,
          new_comments: 0
        }
      });
    }

    // Get valid schools
    const { data: validSchools, error: schoolsError } = await supabase
      .from('teacher_feast_schools')
      .select('school_name');

    if (schoolsError) throw schoolsError;

    const validSchoolNames = validSchools.map(s => s.school_name.toLowerCase());

    // Process comments
    let newVotes = 0;
    let duplicates = 0;
    let invalidTags = 0;
    const processedSchools = new Set();

    for (const comment of newComments) {
      try {
        const { username, text, id, timestamp } = comment;

        if (!text) continue;

        const schoolTags = extractSchoolTags(text);

        for (const tag of schoolTags) {
          const validatedSchool = validateSchoolName(tag, validSchoolNames, validSchools);

          if (!validatedSchool) {
            invalidTags++;
            continue;
          }

          // Check for duplicate
          const { data: existing } = await supabase
            .from('teacher_feast_votes')
            .select('id')
            .eq('instagram_comment_id', id)
            .eq('school_name', validatedSchool)
            .single();

          if (existing) {
            duplicates++;
            continue;
          }

          // Insert vote
          const voteTimestamp = timestamp ?
            new Date(timestamp * 1000).toISOString() :
            new Date().toISOString();

          const { error: voteError } = await supabase
            .from('teacher_feast_votes')
            .insert([{
              school_name: validatedSchool,
              vote_type: 'instagram',
              points: 1,
              instagram_username: username,
              instagram_comment_id: id,
              voted_at: voteTimestamp
            }]);

          if (voteError) {
            console.error(`❌ Vote insert error:`, voteError);
            continue;
          }

          // Increment school votes
          await supabase.rpc('increment_school_votes', {
            school_name_param: validatedSchool,
            points_param: 1
          });

          newVotes++;
          processedSchools.add(validatedSchool);
          console.log(`✅ +1 vote for ${validatedSchool} from @${username}`);
        }
      } catch (error) {
        console.error(`❌ Error processing comment:`, error);
      }
    }

    // Update last scraped comment ID
    if (newComments.length > 0) {
      const mostRecentCommentId = newComments[0].id;
      await supabase
        .from('teacher_feast_config')
        .upsert({
          config_key: 'last_scraped_comment_id',
          config_value: mostRecentCommentId,
          updated_at: new Date().toISOString()
        });
      console.log(`📌 Updated last scraped comment ID: ${mostRecentCommentId}`);
    }

    console.log(`✅ Manual scraper complete: ${newVotes} new votes added`);

    res.status(200).json({
      success: true,
      stats: {
        total_comments_fetched: allComments.length,
        new_comments_processed: newComments.length,
        new_votes: newVotes,
        duplicates_skipped: duplicates,
        invalid_tags: invalidTags,
        schools_updated: Array.from(processedSchools)
      }
    });

  } catch (error) {
    console.error('❌ Manual scraper error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

// Helper functions

function extractSchoolTags(text) {
  const schools = [];
  const cleanText = text
    .replace(/https?:\/\/[^\s]+/g, '')
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '');

  const tagPattern = /[@#]([a-zA-Z0-9_\s]+)/g;
  let match;

  while ((match = tagPattern.exec(cleanText)) !== null) {
    const potentialSchool = match[1].trim();
    if (potentialSchool.length > 2) {
      schools.push(formatSchoolName(potentialSchool));
    }
  }

  return [...new Set(schools)];
}

function validateSchoolName(taggedName, validSchoolNamesLower, validSchools) {
  const formatted = formatSchoolName(taggedName);
  const formattedLower = formatted.toLowerCase();

  const exactIndex = validSchoolNamesLower.indexOf(formattedLower);
  if (exactIndex !== -1) {
    return validSchools[exactIndex].school_name;
  }

  for (let i = 0; i < validSchoolNamesLower.length; i++) {
    const schoolName = validSchoolNamesLower[i];
    const tagCleaned = formattedLower
      .replace(/\b(high|middle|elementary|school)\b/g, '')
      .trim();
    const schoolCleaned = schoolName
      .replace(/\b(high|middle|elementary|school)\b/g, '')
      .trim();

    if (tagCleaned && schoolCleaned && (
      tagCleaned.includes(schoolCleaned) ||
      schoolCleaned.includes(tagCleaned)
    )) {
      return validSchools[i].school_name;
    }
  }

  return null;
}

function formatSchoolName(name) {
  return name
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .trim();
}
