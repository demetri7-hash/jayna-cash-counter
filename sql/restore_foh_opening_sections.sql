-- ============================================
-- RESTORE FOH OPENING CHECKLIST - ALL 11 SECTIONS
-- ============================================
-- Created: 2025-10-19
-- Purpose: Restore complete FOH OPENING checklist with all sections and tasks
-- Current state: Only has 1 section (rating) - missing 10 checkbox sections
-- Run this in Supabase SQL Editor

-- ============================================
-- STEP 1: Delete existing incomplete sections
-- ============================================

-- Get the checklist_id for foh_opening
DO $$
DECLARE
  checklist_uuid UUID;
BEGIN
  -- Find foh_opening checklist
  SELECT id INTO checklist_uuid
  FROM checklist_definitions
  WHERE type = 'foh_opening';

  IF checklist_uuid IS NULL THEN
    RAISE EXCEPTION 'FOH OPENING checklist not found! Cannot proceed.';
  END IF;

  -- Delete all existing sections (will cascade delete tasks/categories)
  DELETE FROM checklist_sections
  WHERE checklist_id = checklist_uuid;

  RAISE NOTICE '✅ Deleted old sections for FOH OPENING';
  RAISE NOTICE 'Checklist ID: %', checklist_uuid;
END $$;

-- ============================================
-- STEP 2: Insert all 11 sections with tasks
-- ============================================

-- Temporary variable to hold checklist_id and section_ids
DO $$
DECLARE
  checklist_uuid UUID;
  section_uuid UUID;
BEGIN
  -- Get checklist_id
  SELECT id INTO checklist_uuid
  FROM checklist_definitions
  WHERE type = 'foh_opening';

  -- ==========================================
  -- SECTION 0: Closing Review From Previous Night (RATING)
  -- ==========================================
  INSERT INTO checklist_sections (checklist_id, name, description, section_type, display_order)
  VALUES (checklist_uuid, 'Closing Review From Previous Night', NULL, 'rating', 0)
  RETURNING id INTO section_uuid;

  INSERT INTO checklist_section_categories (section_id, name, description, display_order) VALUES
  (section_uuid, 'Dining Rooms', 'Chairs clean, mirrors, windows, décor, lights', 0),
  (section_uuid, 'Expo & Water Station', 'Stocked, clean, organized', 1),
  (section_uuid, 'Sauces + Baklava Prep + Beverage Fridge', '', 2),
  (section_uuid, 'Cashier & Retail', 'Baklava at POS, menus wiped, retail shelves, Turkish delights', 3),
  (section_uuid, 'Silver', 'Rollies, prefold linens, leftover washed silver', 4),
  (section_uuid, 'Fro-Yo', 'Backups, cleanliness, turned off?', 5),
  (section_uuid, 'Office', 'Trash, clean and organized', 6),
  (section_uuid, 'Bar', 'To go cups and lids, stickiness, lemonades, batch cocktails, garnishes, glassware, floors, front of fridge', 7);

  -- ==========================================
  -- SECTION 1: Dining Room & Patio Setup (CHECKBOX)
  -- ==========================================
  INSERT INTO checklist_sections (checklist_id, name, description, section_type, display_order)
  VALUES (checklist_uuid, 'Dining Room & Patio Setup', NULL, 'checkbox', 1)
  RETURNING id INTO section_uuid;

  INSERT INTO checklist_section_tasks (section_id, task_text, display_order) VALUES
  (section_uuid, 'Remove chairs and re-wipe all tables', 0),
  (section_uuid, 'Wipe table sides, legs, chairs, and banquette sofas', 1),
  (section_uuid, 'Don''t forget the top wood ledge of sofas (especially outside)', 2),
  (section_uuid, 'Ensure chairs are tucked in and tables are aligned and evenly spaced', 3),
  (section_uuid, 'Place lamps on tables, hide charging cables', 4),
  (section_uuid, '"Salt to the Street" – salt shakers toward parking lot, pepper toward kitchen', 5),
  (section_uuid, 'Wipe and dry menus — remove stickiness', 6),
  (section_uuid, 'Turn on all dining room lights', 7),
  (section_uuid, 'Unlock doors and flip both signs to "OPEN"', 8),
  (section_uuid, 'Check and refill all rollups (napkin + silverware)', 9),
  (section_uuid, 'Wipe patio tables and barstools with fresh towel', 10),
  (section_uuid, 'Raise blinds', 11),
  (section_uuid, 'Windex front doors', 12),
  (section_uuid, 'Wipe down front of registers', 13);

  -- ==========================================
  -- SECTION 2: Cleanliness & Walkthrough (CHECKBOX)
  -- ==========================================
  INSERT INTO checklist_sections (checklist_id, name, description, section_type, display_order)
  VALUES (checklist_uuid, 'Cleanliness & Walkthrough', NULL, 'checkbox', 2)
  RETURNING id INTO section_uuid;

  INSERT INTO checklist_section_tasks (section_id, task_text, display_order) VALUES
  (section_uuid, 'Sweep perimeter and remove cobwebs from: Pergola area, Back wall, Between sofas, Under all tables and planter boxes (inside & facing parking lot)', 0),
  (section_uuid, 'Review previous night''s closing checklist for any notes', 1);

  -- ==========================================
  -- SECTION 3: Bathroom Checks (CHECKBOX)
  -- ==========================================
  INSERT INTO checklist_sections (checklist_id, name, description, section_type, display_order)
  VALUES (checklist_uuid, 'Bathroom Checks', 'EVERY MORNING DAILY! BOH CLEANER WILL CLEAN BUT YOU MUST VERIFY IF NOT OK, CLEAN YOURSELF AND NOTIFY DEMETRI IMMEDIATELY', 'checkbox', 3)
  RETURNING id INTO section_uuid;

  INSERT INTO checklist_section_tasks (section_id, task_text, display_order) VALUES
  (section_uuid, 'Clean toilets thoroughly: bowl, lid, seat, under seat, and floor around and behind', 0),
  (section_uuid, 'Windex mirrors', 1),
  (section_uuid, 'Dust the following areas: Top of hand dryer, Soap dispenser, Lip around perimeter of bathroom wall', 2),
  (section_uuid, 'Scrub and clean sink + remove mold from drain', 3),
  (section_uuid, 'Dry and polish all surfaces', 4),
  (section_uuid, 'Restock: Toilet paper, Paper towels, Toilet seat covers', 5);

  -- ==========================================
  -- SECTION 4: Expo Station & Sauce Prep (CHECKBOX)
  -- ==========================================
  INSERT INTO checklist_sections (checklist_id, name, description, section_type, display_order)
  VALUES (checklist_uuid, 'Expo Station & Sauce Prep', NULL, 'checkbox', 4)
  RETURNING id INTO section_uuid;

  INSERT INTO checklist_section_tasks (section_id, task_text, display_order) VALUES
  (section_uuid, 'Fill 1 sanitation tub at expo: Fill ¾ with sanitizer, Add 2 new microfiber towels, One must be hanging half in/half out (health code requirement)', 0),
  (section_uuid, 'Expo towels: 1 damp towel for wiping plate edges, 1 dry towel for expo counter and surfaces', 1),
  (section_uuid, 'Sauce backups (filled ramekins): Tzatziki – 1–2 full (2oz), Spicy Aioli – 1–2 full (2oz), Lemon Dressing – 1–2 full (3oz)', 2),
  (section_uuid, 'Squeeze bottles for ramekin plating: 1 full each of: Tzatziki, Spicy Aioli, Lemon Dressing', 3);

  -- ==========================================
  -- SECTION 5: Kitchen Support & Restock (CHECKBOX)
  -- ==========================================
  INSERT INTO checklist_sections (checklist_id, name, description, section_type, display_order)
  VALUES (checklist_uuid, 'Kitchen Support & Restock', NULL, 'checkbox', 5)
  RETURNING id INTO section_uuid;

  INSERT INTO checklist_section_tasks (section_id, task_text, display_order) VALUES
  (section_uuid, 'Bring out sauces and mark any finished', 0),
  (section_uuid, 'Stock kitchen with plates and bowls from drying rack — keep replenishing throughout shift', 1),
  (section_uuid, 'Restock to-go bowls & pita boxes above handwashing sink — must appear full and complete', 2),
  (section_uuid, 'Restock baklava at: Retail shelves, POS', 3);

  -- ==========================================
  -- SECTION 6: Water Station (CHECKBOX)
  -- ==========================================
  INSERT INTO checklist_sections (checklist_id, name, description, section_type, display_order)
  VALUES (checklist_uuid, 'Water Station', '"ABUNDANT" SPA VIBE', 'checkbox', 6)
  RETURNING id INTO section_uuid;

  INSERT INTO checklist_section_tasks (section_id, task_text, display_order) VALUES
  (section_uuid, 'Cut 2 English cucumbers into thick ribbons using mandolin slicer — Place in Water Station 1 — fresh, bountiful look', 0),
  (section_uuid, 'Cut 4 lemons into thick wheels — Place in Water Station 2 — fancy, abundant, spa-like vibe', 1),
  (section_uuid, 'Fill both dispensers with ice, fruit, and water — should look luxurious and inviting', 2);

  -- ==========================================
  -- SECTION 7: Bar Fruit Prep (CHECKBOX)
  -- ==========================================
  INSERT INTO checklist_sections (checklist_id, name, description, section_type, display_order)
  VALUES (checklist_uuid, 'Bar Fruit Prep', NULL, 'checkbox', 7)
  RETURNING id INTO section_uuid;

  INSERT INTO checklist_section_tasks (section_id, task_text, display_order) VALUES
  (section_uuid, '4 lemons – perfect wheels only (continuous rind)', 0),
  (section_uuid, '2 lemons – thick wedges (easy to squeeze)', 1),
  (section_uuid, '1 lime – perfect wheels (for cocktails & cherry soda)', 2),
  (section_uuid, '1 lime – thick wedges', 3),
  (section_uuid, '1 orange – thick slices (sangria, orange soda, cocktails)', 4);

  -- ==========================================
  -- SECTION 8: Bar Setup & Stock (CHECKBOX)
  -- ==========================================
  INSERT INTO checklist_sections (checklist_id, name, description, section_type, display_order)
  VALUES (checklist_uuid, 'Bar Setup & Stock', NULL, 'checkbox', 8)
  RETURNING id INTO section_uuid;

  INSERT INTO checklist_section_tasks (section_id, task_text, display_order) VALUES
  (section_uuid, 'Fill ice well to overflowing', 0),
  (section_uuid, 'Fill garnish container with ice + water for fruit', 1),
  (section_uuid, 'Bring out and check: Juices & simple syrups — full, clean, labeled, Signature cocktail containers: Day-use = full, clean, labeled, Backup gallons = prep more if low, clean before refilling', 2),
  (section_uuid, 'Stock all 3 bar caddies with: Straws, Beverage napkins, Black plastic spoons for froyo', 3);

  -- ==========================================
  -- SECTION 9: Froyo Machines (CHECKBOX)
  -- ==========================================
  INSERT INTO checklist_sections (checklist_id, name, description, section_type, display_order)
  VALUES (checklist_uuid, 'Froyo Machines', NULL, 'checkbox', 9)
  RETURNING id INTO section_uuid;

  INSERT INTO checklist_section_tasks (section_id, task_text, display_order) VALUES
  (section_uuid, 'SWITCH BUTTON TO STOP THEN PRESS AUTO TO GET THEM GOING', 0),
  (section_uuid, 'ADD STRAWBERRY TO SMALL MACHINE, IF NOT RINSED CLEAN, ENSURE PRODUCT IS COLD AND WAS LEFT IN FRESH MODE OVERNIGHT, USE A SPOON TO STIR / CONSISTENT', 1),
  (section_uuid, '1 batch ready to serve inside machine', 2),
  (section_uuid, '1 labeled backup in wine fridge (prep if missing)', 3);

  -- ==========================================
  -- SECTION 10: Wines by the Glass (CHECKBOX)
  -- ==========================================
  INSERT INTO checklist_sections (checklist_id, name, description, section_type, display_order)
  VALUES (checklist_uuid, 'Wines by the Glass', NULL, 'checkbox', 10)
  RETURNING id INTO section_uuid;

  INSERT INTO checklist_section_tasks (section_id, task_text, display_order) VALUES
  (section_uuid, 'Check all wines: Whites & bubbles in fridge, Reds on bar', 0),
  (section_uuid, 'Confirm open dates', 1),
  (section_uuid, 'Taste if questionable – DUMP IF BAD', 2),
  (section_uuid, 'Keep selection fresh and labeled', 3);

  RAISE NOTICE '✅ FOH OPENING restored with all 11 sections!';
  RAISE NOTICE 'Section 0: Closing Review (rating - 8 categories)';
  RAISE NOTICE 'Section 1: Dining Room & Patio (checkbox - 14 tasks)';
  RAISE NOTICE 'Section 2: Cleanliness & Walkthrough (checkbox - 2 tasks)';
  RAISE NOTICE 'Section 3: Bathroom Checks (checkbox - 6 tasks)';
  RAISE NOTICE 'Section 4: Expo Station & Sauce Prep (checkbox - 4 tasks)';
  RAISE NOTICE 'Section 5: Kitchen Support & Restock (checkbox - 4 tasks)';
  RAISE NOTICE 'Section 6: Water Station (checkbox - 3 tasks)';
  RAISE NOTICE 'Section 7: Bar Fruit Prep (checkbox - 5 tasks)';
  RAISE NOTICE 'Section 8: Bar Setup & Stock (checkbox - 4 tasks)';
  RAISE NOTICE 'Section 9: Froyo Machines (checkbox - 4 tasks)';
  RAISE NOTICE 'Section 10: Wines by the Glass (checkbox - 4 tasks)';
  RAISE NOTICE 'Total: 1 rating section + 10 checkbox sections = 11 sections';
END $$;

-- ============================================
-- VERIFICATION
-- ============================================
DO $$
DECLARE
  section_count INTEGER;
  checklist_uuid UUID;
BEGIN
  SELECT id INTO checklist_uuid
  FROM checklist_definitions
  WHERE type = 'foh_opening';

  SELECT COUNT(*) INTO section_count
  FROM checklist_sections
  WHERE checklist_id = checklist_uuid;

  IF section_count = 11 THEN
    RAISE NOTICE '✅ VERIFICATION PASSED: FOH OPENING has 11 sections';
  ELSE
    RAISE WARNING '⚠️ VERIFICATION FAILED: FOH OPENING has % sections (expected 11)', section_count;
  END IF;
END $$;
