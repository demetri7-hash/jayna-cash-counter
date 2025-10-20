-- ============================================
-- INSERT MISSING CHECKLISTS: AM CLEANING + FOH OPENING
-- ============================================
-- Created: 2025-10-19
-- Purpose: Add AM CLEANING and FOH OPENING checklists to database
-- They were only in hardcoded data, never saved to database!
-- Run this in Supabase SQL Editor

-- ============================================
-- STEP 1: Insert AM CLEANING CHECKLIST REVIEW
-- ============================================

DO $$
DECLARE
  checklist_uuid UUID;
  section_uuid UUID;
BEGIN
  -- Insert checklist definition
  INSERT INTO checklist_definitions (
    type,
    title,
    time_range,
    description,
    staff_count,
    has_ratings,
    has_notes,
    has_photos,
    rating_scale,
    start_hour,
    start_minute,
    end_hour,
    end_minute,
    created_at,
    updated_at,
    updated_by
  ) VALUES (
    'am_cleaning',
    'AM CLEANING CHECKLIST REVIEW',
    '9:00 AM - 3:00 PM',
    'Review of overnight cleaning completed by BOH staff',
    1,
    true,
    true,
    true,
    '1 – MAJOR ISSUES | 3 – ACCEPTABLE | 5 – GUEST-READY',
    9,
    0,
    15,
    0,
    NOW(),
    NOW(),
    'System Migration'
  )
  RETURNING id INTO checklist_uuid;

  RAISE NOTICE '✅ Created AM CLEANING checklist (ID: %)', checklist_uuid;

  -- Insert the single rating section
  INSERT INTO checklist_sections (checklist_id, name, description, section_type, display_order)
  VALUES (checklist_uuid, 'Quality Review', NULL, 'rating', 0)
  RETURNING id INTO section_uuid;

  -- Insert 8 rating categories
  INSERT INTO checklist_section_categories (section_id, name, description, display_order) VALUES
  (section_uuid, 'Sweeping', 'Crumbs, litter, spiderwebs, trash', 0),
  (section_uuid, 'Chairs', 'Put down and neatly tucked in to each table', 1),
  (section_uuid, 'Exterior of Building and Parking Lot', 'Clear of debris and trash', 2),
  (section_uuid, 'Dumpster Area', 'Kept locked, clean, nothing overflowing in the bins', 3),
  (section_uuid, 'Bathrooms', 'Sinks, mirrors, soap, dryer, towels, perimeter lip dusted?', 4),
  (section_uuid, 'Toilets', 'Specifically the entire white porcelain, top to bottom- wiped? clean? sanitized?', 5),
  (section_uuid, 'Floors in Bathroom', 'Swept, mopped, area behind and around toilets', 6),
  (section_uuid, 'Container Status', 'Clean, tidy, organized, no unopened boxes on the ground', 7);

  RAISE NOTICE '✅ Created Quality Review section with 8 categories';
END $$;

-- ============================================
-- STEP 2: Insert FOH OPENING CHECKLIST
-- ============================================

DO $$
DECLARE
  checklist_uuid UUID;
  section_uuid UUID;
BEGIN
  -- Insert checklist definition
  INSERT INTO checklist_definitions (
    type,
    title,
    time_range,
    description,
    staff_count,
    has_ratings,
    has_notes,
    has_photos,
    rating_scale,
    start_hour,
    start_minute,
    end_hour,
    end_minute,
    created_at,
    updated_at,
    updated_by
  ) VALUES (
    'foh_opening',
    'FOH OPENING CHECKLIST',
    '9:00 AM - 4:00 PM',
    'Complete opening procedures for dining room, bar, and guest areas',
    2,
    true,
    false,
    true,
    '1 – MAJOR ISSUES | 3 – ACCEPTABLE | 5 – GUEST-READY',
    9,
    0,
    16,
    0,
    NOW(),
    NOW(),
    'System Migration'
  )
  RETURNING id INTO checklist_uuid;

  RAISE NOTICE '✅ Created FOH OPENING checklist (ID: %)', checklist_uuid;

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
  -- SECTION 1: Dining Room & Patio Setup
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
  -- SECTION 2: Cleanliness & Walkthrough
  -- ==========================================
  INSERT INTO checklist_sections (checklist_id, name, description, section_type, display_order)
  VALUES (checklist_uuid, 'Cleanliness & Walkthrough', NULL, 'checkbox', 2)
  RETURNING id INTO section_uuid;

  INSERT INTO checklist_section_tasks (section_id, task_text, display_order) VALUES
  (section_uuid, 'Sweep perimeter and remove cobwebs from: Pergola area, Back wall, Between sofas, Under all tables and planter boxes (inside & facing parking lot)', 0),
  (section_uuid, 'Review previous night''s closing checklist for any notes', 1);

  -- ==========================================
  -- SECTION 3: Bathroom Checks
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
  -- SECTION 4: Expo Station & Sauce Prep
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
  -- SECTION 5: Kitchen Support & Restock
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
  -- SECTION 6: Water Station
  -- ==========================================
  INSERT INTO checklist_sections (checklist_id, name, description, section_type, display_order)
  VALUES (checklist_uuid, 'Water Station', '"ABUNDANT" SPA VIBE', 'checkbox', 6)
  RETURNING id INTO section_uuid;

  INSERT INTO checklist_section_tasks (section_id, task_text, display_order) VALUES
  (section_uuid, 'Cut 2 English cucumbers into thick ribbons using mandolin slicer — Place in Water Station 1 — fresh, bountiful look', 0),
  (section_uuid, 'Cut 4 lemons into thick wheels — Place in Water Station 2 — fancy, abundant, spa-like vibe', 1),
  (section_uuid, 'Fill both dispensers with ice, fruit, and water — should look luxurious and inviting', 2);

  -- ==========================================
  -- SECTION 7: Bar Fruit Prep
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
  -- SECTION 8: Bar Setup & Stock
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
  -- SECTION 9: Froyo Machines
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
  -- SECTION 10: Wines by the Glass
  -- ==========================================
  INSERT INTO checklist_sections (checklist_id, name, description, section_type, display_order)
  VALUES (checklist_uuid, 'Wines by the Glass', NULL, 'checkbox', 10)
  RETURNING id INTO section_uuid;

  INSERT INTO checklist_section_tasks (section_id, task_text, display_order) VALUES
  (section_uuid, 'Check all wines: Whites & bubbles in fridge, Reds on bar', 0),
  (section_uuid, 'Confirm open dates', 1),
  (section_uuid, 'Taste if questionable – DUMP IF BAD', 2),
  (section_uuid, 'Keep selection fresh and labeled', 3);

  RAISE NOTICE '✅ Created FOH OPENING with all 11 sections!';
END $$;

-- ============================================
-- VERIFICATION
-- ============================================
DO $$
DECLARE
  am_cleaning_count INTEGER;
  foh_opening_count INTEGER;
BEGIN
  -- Count sections for AM CLEANING
  SELECT COUNT(*) INTO am_cleaning_count
  FROM checklist_sections cs
  JOIN checklist_definitions cd ON cd.id = cs.checklist_id
  WHERE cd.type = 'am_cleaning';

  -- Count sections for FOH OPENING
  SELECT COUNT(*) INTO foh_opening_count
  FROM checklist_sections cs
  JOIN checklist_definitions cd ON cd.id = cs.checklist_id
  WHERE cd.type = 'foh_opening';

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'VERIFICATION RESULTS';
  RAISE NOTICE '========================================';

  IF am_cleaning_count = 1 THEN
    RAISE NOTICE '✅ AM CLEANING: 1 section (CORRECT)';
  ELSE
    RAISE WARNING '⚠️ AM CLEANING: % sections (expected 1)', am_cleaning_count;
  END IF;

  IF foh_opening_count = 11 THEN
    RAISE NOTICE '✅ FOH OPENING: 11 sections (CORRECT)';
  ELSE
    RAISE WARNING '⚠️ FOH OPENING: % sections (expected 11)', foh_opening_count;
  END IF;

  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Refresh the EDIT tab to see both checklists!';
END $$;
