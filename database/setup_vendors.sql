-- Setup Jayna Gyro Vendors with Ordering Schedules
-- Run this to populate the vendors table

-- First, let's add order schedule fields to vendors table if they don't exist
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS order_days TEXT[]; -- Array of days: ['Tuesday', 'Thursday']
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS order_cutoff_time TEXT; -- e.g., '3:00 PM'
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS order_method TEXT; -- 'text', 'online', 'phone', 'email'
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS rep_name TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS rep_phone TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS order_url TEXT; -- For online ordering
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS delivery_days TEXT[]; -- Days they deliver
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS special_notes TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal'; -- 'high', 'normal', 'low'

-- Clear existing sample vendors
DELETE FROM vendors;

-- Insert actual vendors with full details
INSERT INTO vendors (
  vendor_name,
  contact_name,
  contact_phone,
  order_days,
  order_cutoff_time,
  order_method,
  rep_name,
  rep_phone,
  delivery_days,
  special_notes,
  priority,
  active
) VALUES
(
  'Mani Imports',
  'Anna Marcos',
  NULL, -- Will add when you have it
  ARRAY['Tuesday', 'Thursday'],
  '3:00 PM',
  'text',
  'Anna Marcos',
  NULL, -- Rep phone number
  ARRAY['Wednesday', 'Friday'], -- Assumed delivery day after order
  'Tuesday = smaller order. Thursday = larger order for next 5 days',
  'high',
  TRUE
),
(
  'Greenleaf',
  NULL,
  NULL,
  ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  '10:00 PM',
  'online',
  NULL,
  NULL,
  ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  'No deliveries Sunday - Saturday order must be for 2 days worth of produce',
  'high',
  TRUE
),
(
  'Eatopia',
  NULL,
  NULL, -- Main contact number
  ARRAY['Monday', 'Tuesday', 'Wednesday'], -- Order anytime but arrives Thursday
  '11:59 PM', -- Anytime before Thursday
  'text',
  'Rep changes randomly',
  NULL, -- Need this number
  ARRAY['Thursday'],
  'Baklava, Turkish Delights. Rep changes but number stays same. Always Thursday delivery.',
  'normal',
  TRUE
),
(
  'EcoLab',
  'Customer Service',
  NULL, -- Main CS number
  NULL, -- Every couple weeks
  NULL,
  'phone',
  NULL,
  NULL,
  NULL,
  'Dishwasher chemicals (front/back), floor cleaners, disinfectants. Order every couple weeks.',
  'normal',
  TRUE
),
(
  'Restaurant Depot',
  NULL,
  NULL,
  NULL,
  NULL,
  'in-person',
  NULL,
  NULL,
  NULL,
  'CURRENTLY HORRIBLE - Need to find replacement vendors for: Halal whole chickens (3.5-4lb), Halal 80/20 ground beef, Fry Box (small brown craft Chinese food style box for Greek Fries)',
  'low',
  TRUE
),
(
  'Performance Food Service',
  NULL,
  NULL,
  ARRAY['Sunday', 'Wednesday'],
  '3:00 PM',
  'online',
  NULL,
  NULL,
  ARRAY['Monday', 'Thursday'], -- Next morning delivery
  'Dry goods, Pita/Lavash bread, ground lamb, whole frozen octopus, Rotellas vegan hamburger buns, vegan yogurt, HD degreaser, hand soap, Coca Cola products (12pk cans, bag-in-box for soda gun). Order by 3pm for next morning delivery.',
  'high',
  TRUE
);

-- Create order schedule tracking table
CREATE TABLE IF NOT EXISTS order_schedules (
  id BIGSERIAL PRIMARY KEY,
  vendor_id BIGINT REFERENCES vendors(id) ON DELETE CASCADE,
  vendor_name TEXT NOT NULL,
  order_day TEXT NOT NULL, -- 'Monday', 'Tuesday', etc.
  order_cutoff_time TEXT, -- '3:00 PM'
  delivery_day TEXT, -- Expected delivery day
  is_recurring BOOLEAN DEFAULT TRUE,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create order alerts table
CREATE TABLE IF NOT EXISTS order_alerts (
  id BIGSERIAL PRIMARY KEY,
  vendor_id BIGINT REFERENCES vendors(id),
  vendor_name TEXT NOT NULL,
  alert_date DATE NOT NULL,
  alert_time TIME,
  order_day TEXT, -- 'Tuesday', 'Thursday'
  message TEXT,
  dismissed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create suggested orders table (will be populated by algorithm)
CREATE TABLE IF NOT EXISTS suggested_orders (
  id BIGSERIAL PRIMARY KEY,
  vendor_id BIGINT REFERENCES vendors(id),
  inventory_item_id BIGINT REFERENCES inventory_items(id),
  suggested_qty NUMERIC,
  current_stock NUMERIC,
  par_level NUMERIC,
  weekly_usage NUMERIC,
  days_until_next_order INTEGER,
  confidence_score NUMERIC, -- 0-100, based on data quality
  based_on_sales BOOLEAN DEFAULT FALSE, -- TRUE when we have Toast sales integration
  calculation_date DATE DEFAULT CURRENT_DATE,
  order_by_date DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create invoice archive table for PDF analysis
CREATE TABLE IF NOT EXISTS invoice_archive (
  id BIGSERIAL PRIMARY KEY,
  vendor_id BIGINT REFERENCES vendors(id),
  vendor_name TEXT NOT NULL,
  invoice_date DATE NOT NULL,
  invoice_number TEXT,
  total_amount NUMERIC,
  pdf_url TEXT, -- If stored in cloud
  pdf_data BYTEA, -- If stored in database
  ocr_text TEXT, -- Extracted text from OCR
  parsed_data JSONB, -- Structured data extracted from invoice
  items_extracted JSONB, -- Array of items from invoice
  processed BOOLEAN DEFAULT FALSE,
  verified BOOLEAN DEFAULT FALSE, -- Manual verification
  notes TEXT,
  uploaded_at TIMESTAMP DEFAULT NOW()
);

-- Create order history table
CREATE TABLE IF NOT EXISTS order_history (
  id BIGSERIAL PRIMARY KEY,
  vendor_id BIGINT REFERENCES vendors(id),
  vendor_name TEXT NOT NULL,
  order_date DATE NOT NULL,
  delivery_date DATE,
  total_amount NUMERIC,
  items_ordered JSONB, -- Array of items with quantities
  order_method TEXT, -- How it was ordered
  invoice_id BIGINT REFERENCES invoice_archive(id), -- Link to invoice when it arrives
  created_by TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Populate order schedules from vendor data
INSERT INTO order_schedules (vendor_id, vendor_name, order_day, order_cutoff_time, delivery_day)
SELECT
  v.id,
  v.vendor_name,
  unnest(v.order_days) as order_day,
  v.order_cutoff_time,
  CASE
    WHEN v.vendor_name = 'Mani Imports' AND unnest(v.order_days) = 'Tuesday' THEN 'Wednesday'
    WHEN v.vendor_name = 'Mani Imports' AND unnest(v.order_days) = 'Thursday' THEN 'Friday'
    WHEN v.vendor_name = 'Greenleaf' THEN unnest(v.order_days) -- Same day delivery
    WHEN v.vendor_name = 'Eatopia' THEN 'Thursday'
    WHEN v.vendor_name = 'Performance Food Service' AND unnest(v.order_days) = 'Sunday' THEN 'Monday'
    WHEN v.vendor_name = 'Performance Food Service' AND unnest(v.order_days) = 'Wednesday' THEN 'Thursday'
    ELSE NULL
  END
FROM vendors v
WHERE v.order_days IS NOT NULL;

-- Success message
SELECT
  'Vendors setup complete!' as status,
  COUNT(*) as vendor_count
FROM vendors
WHERE active = TRUE;

SELECT
  vendor_name,
  array_to_string(order_days, ', ') as order_days,
  order_cutoff_time,
  order_method,
  priority
FROM vendors
WHERE active = TRUE
ORDER BY priority DESC, vendor_name;
