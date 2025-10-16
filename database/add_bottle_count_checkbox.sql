-- Add checkbox control for bottled & to-go prep section
-- Date: 2025-10-15

ALTER TABLE inventory_items 
ADD COLUMN IF NOT EXISTS show_in_bottle_count BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN inventory_items.show_in_bottle_count IS 'When checked, item appears in "BOTTLED & TO-GO PREP CHECK" section of PDF';
