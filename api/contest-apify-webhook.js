/**
 * Apify Webhook Handler
 * Receives Instagram comment data from Apify scraper
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export default async function handler(req, res) {
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
    console.log('🔔 Apify webhook received');

    // Apify sends data in various formats - handle both
    const payload = req.body;
    let comments = [];

    // Format 1: Direct array
    if (Array.isArray(payload)) {
      comments = payload;
    }
    // Format 2: Nested in resource
    else if (payload.resource && Array.isArray(payload.resource.defaultDatasetItems)) {
      comments = payload.resource.defaultDatasetItems;
    }
    // Format 3: Direct items
    else if (Array.isArray(payload.items)) {
      comments = payload.items;
    }

    if (comments.length === 0) {
      return res.status(400).json({ error: 'No comments found in payload' });
    }

    console.log(`📥 Processing ${comments.length} comments from Apify`);

    // Get valid schools
    const { data: validSchools, error: schoolsError } = await supabase
      .from('teacher_feast_schools')
      .select('school_name');

    if (schoolsError) throw schoolsError;

    const validSchoolNames = validSchools.map(s => s.school_name.toLowerCase());

    let newVotes = 0;
    let duplicates = 0;
    let invalidTags = 0;
    const processedSchools = new Set();

    for (const comment of comments) {
      try {
        // Apify comment structure: {ownerUsername, text, id, timestamp}
        const username = comment.ownerUsername || comment.username;
        const text = comment.text;
        const commentId = comment.id || comment.shortcode;

        if (!text || !username) continue;

        const schoolTags = extractSchoolTags(text);

        for (const tag of schoolTags) {
          const validatedSchool = validateSchoolName(tag, validSchoolNames, validSchools);

          if (!validatedSchool) {
            invalidTags++;
            continue;
          }

          // Check duplicate
          const { data: existing } = await supabase
            .from('teacher_feast_votes')
            .select('id')
            .eq('instagram_comment_id', commentId)
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
              instagram_comment_id: commentId,
              voted_at: comment.timestamp || new Date().toISOString()
            }]);

          if (voteError) {
            console.error(`❌ Vote error:`, voteError);
            continue;
          }

          // Increment
          await supabase.rpc('increment_school_votes', {
            school_name_param: validatedSchool,
            points_param: 1
          });

          newVotes++;
          processedSchools.add(validatedSchool);
          console.log(`✅ +1 vote for ${validatedSchool}`);
        }
      } catch (error) {
        console.error(`❌ Comment processing error:`, error);
      }
    }

    console.log(`✅ Apify webhook complete: ${newVotes} new votes`);

    res.status(200).json({
      success: true,
      stats: {
        total_comments: comments.length,
        new_votes: newVotes,
        duplicates_skipped: duplicates,
        invalid_tags: invalidTags,
        schools_updated: Array.from(processedSchools)
      }
    });

  } catch (error) {
    console.error('❌ Apify webhook error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

function extractSchoolTags(text) {
  const schools = [];
  const cleanText = text.replace(/https?:\/\/[^\s]+/g, '').replace(/[\u{1F600}-\u{1F64F}]/gu, '');
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
  if (exactIndex !== -1) return validSchools[exactIndex].school_name;

  for (let i = 0; i < validSchoolNamesLower.length; i++) {
    const schoolName = validSchoolNamesLower[i];
    const tagCleaned = formattedLower.replace(/\b(high|middle|elementary|school)\b/g, '').trim();
    const schoolCleaned = schoolName.replace(/\b(high|middle|elementary|school)\b/g, '').trim();

    if (tagCleaned && schoolCleaned && (tagCleaned.includes(schoolCleaned) || schoolCleaned.includes(tagCleaned))) {
      return validSchools[i].school_name;
    }
  }

  return null;
}

function formatSchoolName(name) {
  return name.split(/\s+/).map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ').replace(/[^a-zA-Z0-9\s]/g, '').trim();
}
