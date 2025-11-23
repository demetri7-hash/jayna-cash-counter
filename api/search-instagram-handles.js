/**
 * Instagram Handle Search Tool
 * Searches for Instagram handles for Sacramento area schools
 * Uses Google search to find official school Instagram accounts
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS,GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { school_name, search_query } = req.body || {};

    if (!school_name && !search_query) {
      // Return all schools that need Instagram handles
      const { data: schools, error } = await supabase
        .from('teacher_feast_schools')
        .select('id, school_name, instagram_handles')
        .order('school_name');

      if (error) throw error;

      // Filter schools with no handles
      const schoolsNeedingHandles = schools.filter(s =>
        !s.instagram_handles || s.instagram_handles.length === 0
      );

      return res.status(200).json({
        success: true,
        total_schools: schools.length,
        schools_needing_handles: schoolsNeedingHandles.length,
        schools: schoolsNeedingHandles
      });
    }

    // Search for Instagram handle for a specific school
    const query = search_query || `"${school_name}" Sacramento instagram`;

    console.log(`🔍 Searching for: ${query}`);

    // Use Google Custom Search API (if available) or return search URL
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;

    // For now, we'll return potential handles based on common patterns
    // In production, you'd use Google Custom Search API or manual verification
    const potentialHandles = extractPotentialHandles(school_name);

    res.status(200).json({
      success: true,
      school_name,
      search_url: searchUrl,
      potential_handles: potentialHandles,
      instructions: 'Visit the search URL and manually verify the correct Instagram handle, then use the admin UI to add it.'
    });

  } catch (error) {
    console.error('❌ Search error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

function extractPotentialHandles(schoolName) {
  // Generate potential Instagram handles based on school name patterns
  const handles = [];

  // Clean school name
  const clean = schoolName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim();

  // Pattern 1: Remove common words and join
  const withoutCommon = clean
    .replace(/\b(high|middle|elementary|school|jr|senior)\b/g, '')
    .trim()
    .replace(/\s+/g, '');

  if (withoutCommon) {
    handles.push(`@${withoutCommon}`);
    handles.push(`@${withoutCommon}hs`);
    handles.push(`@${withoutCommon}sac`);
    handles.push(`@sac${withoutCommon}`);
  }

  // Pattern 2: Acronym
  const words = clean.split(/\s+/);
  if (words.length > 1) {
    const acronym = words.map(w => w[0]).join('');
    handles.push(`@${acronym}`);
    handles.push(`@${acronym}hs`);
    handles.push(`@${acronym}sac`);
  }

  // Pattern 3: SCUSD prefix (for Sacramento City Unified schools)
  if (clean.includes('high')) {
    const baseName = clean.replace(/\s*high.*/, '').replace(/\s+/g, '');
    handles.push(`@scusd${baseName}`);
  }

  // Pattern 4: Full name with no spaces
  const fullNoSpaces = clean.replace(/\s+/g, '');
  handles.push(`@${fullNoSpaces}`);

  // Remove duplicates
  return [...new Set(handles)];
}
