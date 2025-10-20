-- ============================================
-- DIAGNOSTIC: Check what's in checklist_definitions
-- ============================================
-- Run this FIRST to see what checklists actually exist
-- Copy this into Supabase SQL Editor

SELECT
  type,
  title,
  time_range,
  start_hour,
  start_minute,
  end_hour,
  end_minute,
  id
FROM checklist_definitions
ORDER BY type;

-- ============================================
-- Also check sections for each checklist
-- ============================================

SELECT
  cd.type AS checklist_type,
  cd.title AS checklist_title,
  COUNT(cs.id) AS section_count
FROM checklist_definitions cd
LEFT JOIN checklist_sections cs ON cs.checklist_id = cd.id
GROUP BY cd.type, cd.title
ORDER BY cd.type;
