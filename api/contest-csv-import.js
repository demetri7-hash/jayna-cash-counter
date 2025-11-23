/**
 * Contest CSV Import API
 * Processes Instagram comment exports (CSV) and adds valid votes
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
    const { comments } = req.body;

    if (!comments || !Array.isArray(comments)) {
      return res.status(400).json({ error: 'Invalid request. Expected array of comments.' });
    }

    console.log(`📥 Processing ${comments.length} comments from CSV`);

    // Get valid schools
    const { data: validSchools, error: schoolsError } = await supabase
      .from('teacher_feast_schools')
      .select('school_name');

    if (schoolsError) throw schoolsError;

    const validSchoolNames = validSchools.map(s => s.school_name.toLowerCase());
    console.log(`📋 ${validSchoolNames.length} valid schools loaded`);

    let newVotes = 0;
    let duplicates = 0;
    let invalidTags = 0;
    const processedSchools = new Set();
    const invalidTagsList = [];

    for (const comment of comments) {
      try {
        const { username, text, id } = comment;

        if (!text) continue;

        // Extract school tags
        const schoolTags = extractSchoolTags(text);

        for (const tag of schoolTags) {
          // Validate school
          const validatedSchool = validateSchoolName(tag, validSchoolNames, validSchools);

          if (!validatedSchool) {
            console.log(`⚠️ Invalid: "${tag}" from @${username}`);
            invalidTagsList.push({ tag, username });
            invalidTags++;
            continue;
          }

          // Check for duplicate
          const commentId = id || `${username}_${Date.now()}`;
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
              voted_at: new Date().toISOString()
            }]);

          if (voteError) {
            console.error(`❌ Vote insert error:`, voteError);
            continue;
          }

          // Increment school votes
          const { error: incrementError } = await supabase
            .rpc('increment_school_votes', {
              school_name_param: validatedSchool,
              points_param: 1
            });

          if (incrementError) {
            console.error(`❌ Increment error:`, incrementError);
            continue;
          }

          newVotes++;
          processedSchools.add(validatedSchool);
          console.log(`✅ +1 vote for ${validatedSchool} from @${username}`);
        }
      } catch (error) {
        console.error(`❌ Error processing comment:`, error);
      }
    }

    console.log(`✅ Import complete: ${newVotes} new votes added`);

    res.status(200).json({
      success: true,
      stats: {
        total_comments: comments.length,
        new_votes: newVotes,
        duplicates_skipped: duplicates,
        invalid_tags: invalidTags,
        schools_updated: Array.from(processedSchools),
        invalid_tags_sample: invalidTagsList.slice(0, 20)
      }
    });

  } catch (error) {
    console.error('❌ CSV import error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

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
