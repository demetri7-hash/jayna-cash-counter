/**
 * Instagram Comment Scraper - Vercel Cron Job
 * Runs every hour to scrape new comments from contest post
 * No authentication needed - uses scraper-instagram npm package
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export default async function handler(req, res) {
  // Verify cron secret (security)
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('🤖 Instagram scraper cron started');

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
      console.log('⏸️ No post shortcode configured yet');
      return res.status(200).json({
        success: true,
        message: 'Waiting for post shortcode to be configured'
      });
    }

    console.log(`📸 Scraping comments from post: ${postShortcode}`);
    console.log(`📍 Last scraped comment ID: ${lastScrapedId || 'None (first run)'}`);

    // Import scraper-instagram dynamically (only when needed)
    const { instagram } = await import('scraper-instagram');
    const client = new instagram();

    // Fetch comments (max 500 per run)
    let allComments = [];
    let pageId = null;
    let hasMore = true;
    let pageCount = 0;
    const maxPages = 5; // Limit to 5 pages (100 comments each = 500 total)

    while (hasMore && pageCount < maxPages) {
      const response = await client.getPostComments(postShortcode, 100, pageId);

      if (!response || !response.comments || response.comments.length === 0) {
        hasMore = false;
        break;
      }

      allComments = allComments.concat(response.comments);
      pageId = response.nextPageId;
      hasMore = !!pageId;
      pageCount++;

      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 500));
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

    // Transform to CSV format for our existing processor
    const commentsForProcessing = newComments.map(comment => ({
      username: comment.owner?.username || 'unknown',
      text: comment.text || '',
      id: comment.id,
      timestamp: comment.created_time || new Date().toISOString()
    }));

    // Get valid schools from database
    const { data: validSchools, error: schoolsError } = await supabase
      .from('teacher_feast_schools')
      .select('school_name');

    if (schoolsError) throw schoolsError;

    const validSchoolNames = validSchools.map(s => s.school_name.toLowerCase());

    // Process comments using same logic as CSV import
    let newVotes = 0;
    let duplicates = 0;
    let invalidTags = 0;
    const processedSchools = new Set();

    for (const comment of commentsForProcessing) {
      try {
        const { username, text, id, timestamp } = comment;

        if (!text) continue;

        // Extract school tags
        const schoolTags = extractSchoolTags(text);

        for (const tag of schoolTags) {
          // Validate school
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
          const { error: voteError } = await supabase
            .from('teacher_feast_votes')
            .insert([{
              school_name: validatedSchool,
              vote_type: 'instagram',
              points: 1,
              instagram_username: username,
              instagram_comment_id: id,
              voted_at: timestamp
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

    // Update last scraped comment ID (first comment = most recent)
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

    console.log(`✅ Scraper complete: ${newVotes} new votes added`);

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
    console.error('❌ Instagram scraper error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

// Helper functions (same as CSV import)

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

  // Exact match
  const exactIndex = validSchoolNamesLower.indexOf(formattedLower);
  if (exactIndex !== -1) {
    return validSchools[exactIndex].school_name;
  }

  // Fuzzy match
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
