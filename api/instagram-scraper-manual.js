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
      .in('config_key', ['instagram_post_shortcode', 'last_scraped_comment_id', 'instagram_session_cookie']);

    if (configError) throw configError;

    const configMap = {};
    config.forEach(item => {
      configMap[item.config_key] = item.config_value;
    });

    const postShortcode = configMap.instagram_post_shortcode;
    const lastScrapedId = configMap.last_scraped_comment_id || null;
    const sessionCookie = configMap.instagram_session_cookie || null;

    if (!postShortcode || postShortcode === 'PLACEHOLDER') {
      return res.status(400).json({
        success: false,
        error: 'No post shortcode configured. Please add it to teacher_feast_config table.'
      });
    }

    if (!sessionCookie) {
      console.log('⚠️ No session cookie configured - Instagram may block requests');
    }

    console.log(`📸 Scraping comments from post: ${postShortcode}`);
    console.log(`📍 Last scraped comment ID: ${lastScrapedId || 'None (first run)'}`);

    // Try multiple Instagram endpoint formats
    // Based on working GitHub solutions (2024-2025)
    const baseHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'X-IG-App-ID': '936619743392459', // Critical header from working scrapers
      'Accept-Language': 'en-US,en;q=0.9',
      'Referer': `https://www.instagram.com/p/${postShortcode}/`,
      'Origin': 'https://www.instagram.com'
    };

    // Add session cookie if configured (allows authenticated requests to bypass blocking)
    if (sessionCookie) {
      baseHeaders['Cookie'] = `sessionid=${sessionCookie}`;
      console.log('🔐 Using authenticated session cookie');
    }

    const endpointsToTry = [
      {
        name: 'GraphQL API (X-IG-App-ID)',
        url: `https://www.instagram.com/api/graphql`,
        method: 'POST',
        headers: {
          ...baseHeaders,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': '*/*'
        },
        body: `variables={"shortcode":"${postShortcode}","first":50}&doc_id=25531498899829322`
      },
      {
        name: 'Public JSON Endpoint',
        url: `https://www.instagram.com/p/${postShortcode}/?__a=1&__d=dis`,
        method: 'GET',
        headers: {
          ...baseHeaders,
          'Accept': 'application/json, text/html',
          'X-Requested-With': 'XMLHttpRequest'
        }
      },
      {
        name: 'GraphQL Query Hash',
        url: `https://www.instagram.com/graphql/query/?query_hash=f0986789a5c5d17c2400faebf16efd0d&variables={"shortcode":"${postShortcode}"}`,
        method: 'GET',
        headers: {
          ...baseHeaders,
          'Accept': '*/*'
        }
      },
      {
        name: 'Legacy API',
        url: `https://www.instagram.com/p/${postShortcode}/?__a=1`,
        method: 'GET',
        headers: {
          ...baseHeaders,
          'Accept': 'application/json'
        }
      }
    ];

    let data = null;
    let lastError = null;

    for (const endpoint of endpointsToTry) {
      try {
        console.log(`🔄 Trying ${endpoint.name}...`);

        const fetchOptions = {
          method: endpoint.method,
          headers: endpoint.headers
        };

        if (endpoint.body) {
          fetchOptions.body = endpoint.body;
        }

        const response = await fetch(endpoint.url, fetchOptions);

        if (response.ok) {
          // Get raw text first (Instagram may prefix JSON with "for (;;);" to prevent hijacking)
          let responseText = await response.text();

          // Strip Instagram's JSON prefix if present
          if (responseText.startsWith('for (;;);')) {
            console.log('🔧 Stripping Instagram JSON prefix: for (;;);');
            responseText = responseText.substring('for (;;);'.length);
          }

          // Now parse the cleaned JSON
          data = JSON.parse(responseText);

          // Check if Instagram returned an error payload (soft-block)
          if (data.error || (data.payload === null && data.errorSummary)) {
            const errorMsg = data.errorDescription || data.errorSummary || 'Unknown Instagram error';
            console.log(`❌ Instagram returned error ${data.error}: ${errorMsg}`);
            lastError = `Instagram error ${data.error}: ${errorMsg}`;
            data = null; // Clear data so we try next endpoint
            continue;
          }

          console.log(`✅ Success with ${endpoint.name}!`);
          console.log(`📊 Response structure:`, Object.keys(data));
          break;
        } else {
          lastError = `${response.status}: ${response.statusText}`;
          console.log(`❌ ${endpoint.name} failed: ${lastError}`);
        }
      } catch (error) {
        lastError = error.message;
        console.log(`❌ ${endpoint.name} error: ${lastError}`);
        continue;
      }
    }

    if (!data) {
      const errorMsg = sessionCookie
        ? `All Instagram endpoints failed. Last error: ${lastError}. Your session cookie may be expired. Try refreshing it or use the CSV Import method.`
        : `All Instagram endpoints failed. Last error: ${lastError}. Instagram is blocking unauthenticated requests. Please add your Instagram session cookie to the config (see documentation) or use the CSV Import method.`;
      throw new Error(errorMsg);
    }

    // Extract media data from Instagram response
    // Try multiple response structures (Instagram keeps changing their API)
    let media = null;

    // Structure 1: GraphQL API (data.data.xdt_shortcode_media)
    if (data?.data?.xdt_shortcode_media) {
      media = data.data.xdt_shortcode_media;
      console.log('📦 Using GraphQL API response structure');
    }
    // Structure 2: Legacy GraphQL (data.graphql.shortcode_media)
    else if (data?.graphql?.shortcode_media) {
      media = data.graphql.shortcode_media;
      console.log('📦 Using legacy GraphQL response structure');
    }
    // Structure 3: Items array (data.items[0])
    else if (data?.items?.[0]) {
      media = data.items[0];
      console.log('📦 Using items array response structure');
    }
    // Structure 4: Direct media object
    else if (data?.shortcode_media) {
      media = data.shortcode_media;
      console.log('📦 Using direct media object structure');
    }

    if (!media) {
      console.error('❌ Full response data:', JSON.stringify(data, null, 2).substring(0, 500));
      throw new Error('Unable to parse Instagram response - media data not found. Check console for response structure.');
    }

    // Extract comments from media data
    let allComments = [];

    // Try different response structures (Instagram changes format)
    if (media.edge_media_to_parent_comment) {
      // GraphQL format (most common)
      console.log(`💬 Found ${media.edge_media_to_parent_comment.edges?.length || 0} comments in GraphQL format`);
      allComments = media.edge_media_to_parent_comment.edges.map(edge => ({
        id: edge.node.id,
        text: edge.node.text,
        username: edge.node.owner.username,
        timestamp: edge.node.created_at
      }));
    } else if (media.edge_media_preview_comment) {
      // Alternative GraphQL format (preview comments)
      console.log(`💬 Found ${media.edge_media_preview_comment.edges?.length || 0} comments in preview format`);
      allComments = media.edge_media_preview_comment.edges.map(edge => ({
        id: edge.node.id,
        text: edge.node.text,
        username: edge.node.owner.username,
        timestamp: edge.node.created_at
      }));
    } else if (media.comments) {
      // API v1 format
      console.log(`💬 Found ${media.comments.length} comments in API v1 format`);
      allComments = media.comments.map(comment => ({
        id: comment.pk || comment.id,
        text: comment.text,
        username: comment.user?.username || 'unknown',
        timestamp: comment.created_at || comment.created_at_utc
      }));
    } else {
      console.error('❌ No comments found in media object. Available keys:', Object.keys(media));
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

    // Get valid schools (including Instagram handles)
    const { data: validSchools, error: schoolsError } = await supabase
      .from('teacher_feast_schools')
      .select('school_name, instagram_handles');

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

  // PRIORITY 1: Check Instagram handle exact match (most accurate!)
  for (let i = 0; i < validSchools.length; i++) {
    const school = validSchools[i];
    if (school.instagram_handles && Array.isArray(school.instagram_handles)) {
      for (const handle of school.instagram_handles) {
        const cleanHandle = handle.replace('@', '').toLowerCase();
        const cleanTag = taggedName.replace('@', '').replace('#', '').toLowerCase();
        if (cleanHandle === cleanTag) {
          console.log(`✅ Instagram handle match: @${cleanTag} → ${school.school_name}`);
          return school.school_name;
        }
      }
    }
  }

  // PRIORITY 2: Exact school name match
  const exactIndex = validSchoolNamesLower.indexOf(formattedLower);
  if (exactIndex !== -1) {
    return validSchools[exactIndex].school_name;
  }

  // PRIORITY 3: Fuzzy match on school name
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
