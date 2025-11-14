-- ============================================
-- ADD EMOJI FIELD TO CATERING ORDERS
-- ============================================
-- Created: November 13, 2025
-- Purpose: Add persistent random emoji to each catering order
--
-- New Field:
--   - order_emoji: Random emoji assigned when order created (persistent)

-- Add emoji column
ALTER TABLE catering_orders
  ADD COLUMN IF NOT EXISTS order_emoji VARCHAR(10);

-- Function to generate random food-related emoji
CREATE OR REPLACE FUNCTION generate_random_order_emoji()
RETURNS VARCHAR(10) AS $$
DECLARE
  emojis VARCHAR(10)[] := ARRAY[
    '🍕', '🍔', '🌮', '🌯', '🍗', '🍖', '🥗', '🍝', '🍜', '🍲',
    '🍱', '🍛', '🍣', '🍤', '🥘', '🥙', '🥪', '🌭', '🍟', '🥓',
    '🥩', '🍳', '🥞', '🧇', '🧆', '🥟', '🍢', '🍡', '🍧', '🍨',
    '🍦', '🥧', '🧁', '🍰', '🎂', '🍮', '🍭', '🍬', '🍫', '🍿',
    '🧃', '🧉', '🥤', '☕', '🍵', '🫖', '🍾', '🥂', '🍻', '🍺',
    '🍇', '🍈', '🍉', '🍊', '🍋', '🍌', '🍍', '🥭', '🍎', '🍏',
    '🍐', '🍑', '🍒', '🍓', '🫐', '🥝', '🍅', '🫒', '🥥', '🥑'
  ];
BEGIN
  RETURN emojis[floor(random() * array_length(emojis, 1) + 1)];
END;
$$ LANGUAGE plpgsql;

-- Function to auto-assign emoji on insert (if not already set)
CREATE OR REPLACE FUNCTION assign_order_emoji()
RETURNS TRIGGER AS $$
BEGIN
  -- Only assign if not already set
  IF NEW.order_emoji IS NULL THEN
    NEW.order_emoji = generate_random_order_emoji();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-assign emoji
DROP TRIGGER IF EXISTS trigger_assign_order_emoji ON catering_orders;
CREATE TRIGGER trigger_assign_order_emoji
  BEFORE INSERT ON catering_orders
  FOR EACH ROW
  EXECUTE FUNCTION assign_order_emoji();

-- Backfill emojis for existing orders
UPDATE catering_orders
SET order_emoji = generate_random_order_emoji()
WHERE order_emoji IS NULL;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Emoji field added successfully!';
  RAISE NOTICE 'Each order now has a unique persistent emoji 🎉';
END $$;
