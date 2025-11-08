-- Dessert Pricing & Cost Calculation Table
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS dessert_pricing (
  id SERIAL PRIMARY KEY,
  item_name TEXT NOT NULL,
  category TEXT NOT NULL, -- 'baklava', 'turkish_delight_current', 'turkish_delight_adjusted'
  sku TEXT,

  -- Baklava-specific fields
  pcs_per_case NUMERIC(10,2),
  weight_per_case TEXT,
  invoice_price_per_case NUMERIC(10,2),
  total_cases NUMERIC(10,2),
  pack_size INTEGER DEFAULT 3, -- 3-pack

  -- Turkish Delight fields
  total_pcs NUMERIC(10,2),
  weight TEXT,
  invoice_price NUMERIC(10,2),
  pricing_tier TEXT, -- 'Budget', 'Mid-Tier', 'Premium'

  -- Calculated fields (stored for reference, but recalculated in UI)
  cost_per_piece NUMERIC(10,2),
  cost_per_pack NUMERIC(10,2),
  retail_price NUMERIC(10,2),
  profit_per_unit NUMERIC(10,2),
  margin_percent NUMERIC(5,4),
  total_pieces_available NUMERIC(10,2),

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for faster category filtering
CREATE INDEX IF NOT EXISTS idx_dessert_pricing_category ON dessert_pricing(category);

-- Enable Row Level Security (optional, for future user permissions)
ALTER TABLE dessert_pricing ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations for now
CREATE POLICY "Allow all operations on dessert_pricing" ON dessert_pricing FOR ALL USING (true);

-- Insert initial data from Excel

-- BAKLAVA 3-PACKS
INSERT INTO dessert_pricing (item_name, category, sku, pcs_per_case, weight_per_case, invoice_price_per_case, total_cases, cost_per_piece, cost_per_pack, retail_price, profit_per_unit, margin_percent, total_pieces_available) VALUES
('Double Pistachio', 'baklava', 'L086953', 72, '6lb', 56, 5, 0.78, 2.33, 9.95, 7.62, 0.766, 360),
('Double Walnut', 'baklava', '6884620', 72, '6lb', 49, 5, 0.68, 2.04, 9.95, 7.91, 0.795, 360),
('SELAM Classic Pistachio', 'baklava', '253403P', 72, '5.5lb', 48, 5, 0.67, 2.00, 9.95, 7.95, 0.799, 360),
('Chocolate', 'baklava', 'T199028', 70, '6.5lb', 65, 5, 0.93, 2.79, 10.95, 8.16, 0.745, 350);

-- TURKISH DELIGHT - CURRENT PRICING
INSERT INTO dessert_pricing (item_name, category, sku, total_pcs, weight, invoice_price, cost_per_piece, retail_price, profit_per_unit, margin_percent) VALUES
('RUMI''S LOVE R104 - Hazelnut Chocolate', 'turkish_delight_current', '5237911', 25, '6.5lb', 49.08, 1.96, 5, 3.04, 0.608),
('RUMI''S LOVE R122 - Pomegranate Hazelnut', 'turkish_delight_current', '5900594', 52, '6.5lb', 57.53, 1.11, 5, 3.89, 0.778),
('RUMI''S LOVE R111 - Pomegranate Coconut', 'turkish_delight_current', 'K184600', 30, '6.5lb', 34.45, 1.15, 5, 3.85, 0.77),
('ALTIN R135 - Pistachio Red Cake', 'turkish_delight_current', '9720002', 30, '6.5lb', 56.23, 1.87, 5, 3.13, 0.626),
('ALTIN R137 - Hazelnut Purple Cage', 'turkish_delight_current', '5634443', 30, '6.5lb', 56.23, 1.87, 5, 3.13, 0.626),
('ANKA Rose Petals #KF17', 'turkish_delight_current', '472556S', 63, '11lb', 109, 1.73, 5, 3.27, 0.654),
('ANKA Nutella Kataifi #SR14', 'turkish_delight_current', '2592005', 42, '11lb', 58.3, 1.39, 5, 3.61, 0.722),
('ANKA Figachio #SR17', 'turkish_delight_current', '3972847', 45, '11lb', 105, 2.33, 5, 2.67, 0.534);

-- TURKISH DELIGHT - ADJUSTED FOR 80% MARGIN
INSERT INTO dessert_pricing (item_name, category, sku, total_pcs, weight, invoice_price, pricing_tier, cost_per_piece, retail_price, profit_per_unit, margin_percent) VALUES
('RUMI''S LOVE R104 - Hazelnut Chocolate', 'turkish_delight_adjusted', '5237911', 25, '6.5lb', 49.08, 'Premium', 1.96, 9.8, 7.84, 0.8),
('RUMI''S LOVE R122 - Pomegranate Hazelnut', 'turkish_delight_adjusted', '5900594', 52, '6.5lb', 57.53, 'Budget', 1.11, 5.55, 4.44, 0.8),
('RUMI''S LOVE R111 - Pomegranate Coconut', 'turkish_delight_adjusted', 'K184600', 30, '6.5lb', 34.45, 'Budget', 1.15, 5.75, 4.6, 0.8),
('ALTIN R135 - Pistachio Red Cake', 'turkish_delight_adjusted', '9720002', 30, '6.5lb', 56.23, 'Mid-Tier', 1.87, 9.35, 7.48, 0.8),
('ALTIN R137 - Hazelnut Purple Cage', 'turkish_delight_adjusted', '5634443', 30, '6.5lb', 56.23, 'Mid-Tier', 1.87, 9.35, 7.48, 0.8),
('ANKA Rose Petals #KF17', 'turkish_delight_adjusted', '472556S', 63, '11lb', 109, 'Mid-Tier', 1.73, 8.65, 6.92, 0.8),
('ANKA Nutella Kataifi #SR14', 'turkish_delight_adjusted', '2592005', 42, '11lb', 58.3, 'Mid-Tier', 1.39, 6.95, 5.56, 0.8),
('ANKA Figachio #SR17', 'turkish_delight_adjusted', '3972847', 45, '11lb', 105, 'Premium', 2.33, 11.65, 9.32, 0.8);

-- Success message
SELECT 'Table created and data imported successfully!' as status, COUNT(*) as total_items FROM dessert_pricing;
