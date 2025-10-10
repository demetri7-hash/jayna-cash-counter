-- ============================================
-- BULK INVENTORY IMPORT - Generated SQL
-- Run this with: psql connection-string < import-inventory.sql
-- ============================================

-- Disable triggers for faster bulk insert
SET session_replication_role = replica;

-- Insert items (this is a sample - full list in next message)
-- The script will INSERT or UPDATE based on conflicts

INSERT INTO inventory_items (item_name, vendor, unit, par_level, current_stock, upc, current_unit_cost, last_cost_update)
VALUES
  ('KIT P''S BLK 6PC', 'Restaurant Depot', 'CASE', 0, 0, '760695018550', 18.94, '2025-11-29'),
  ('PD HRB BASIL ILII', 'Restaurant Depot', 'Each', 0, 0, '610708097914', 5.63, '2025-11-29'),
  ('PD LEMON CH 140', 'Restaurant Depot', 'Each', 0, 0, '020600791672', 41.66, '2025-11-29'),
  ('PO MANGO LARGE', 'Restaurant Depot', 'Each', 0, 0, '020600426888', 6.00, '2025-11-29'),
  ('PD MICRO FUR ORCED', 'Restaurant Depot', 'Each', 0, 0, '840465132690', 8.10, '2025-11-29')
ON CONFLICT (item_name, vendor)
DO UPDATE SET
  upc = EXCLUDED.upc,
  current_unit_cost = EXCLUDED.current_unit_cost,
  last_cost_update = EXCLUDED.last_cost_update,
  par_level = COALESCE(EXCLUDED.par_level, inventory_items.par_level);

-- Re-enable triggers
SET session_replication_role = DEFAULT;

-- Show results
SELECT COUNT(*) as total_items FROM inventory_items;
