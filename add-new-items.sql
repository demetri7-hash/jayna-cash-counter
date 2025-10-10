-- Add new inventory items
-- Performance items
INSERT INTO inventory_items (item_name, vendor, par_level, current_stock, unit) VALUES
  ('Sabert Tongs 10" Black Plastic Squeeze', 'Performance', 1, 0, 'Case'),
  ('FRST MRK Scouring Pad HD 6x9', 'Performance', 1, 0, 'Case'),
  ('FRST MRK Film PVC 12" Roll Metal Edge', 'Performance', 2, 0, 'Rolls'),
  ('FRST MRK Can Liner 45 GA XHW Black', 'Performance', 2, 0, 'Cases'),
  ('FRST MRK Pan Steam Table Alum FS 3', 'Performance', 2, 0, 'Cases'),
  ('PTRSNPCF Napkin Beverage 10x10 2 PLY Black', 'Performance', 2, 0, 'Cases'),
  ('FRST MRK Lid Steam Pan FS Alum', 'Performance', 1, 0, 'Case'),
  ('HANDGARD Glove Nitrile MED Black Powder-Free', 'Performance', 2, 0, 'Cases'),
  ('Beyond Meat Burger Imitation FZ', 'Performance', 2, 0, 'Cases'),
  ('Coke Soda Syrup Classic BNB', 'Performance', 2, 0, 'Boxes'),
  ('Diet Coke Soda Syrup BNB', 'Performance', 2, 0, 'Boxes'),
  ('Sprite Soda Syrup Lemon Lime BNB', 'Performance', 1, 0, 'Box'),
  ('C&H Sugar Granulated', 'Performance', 2, 0, 'Bags');

-- Greenleaf items
INSERT INTO inventory_items (item_name, vendor, par_level, current_stock, unit) VALUES
  ('Butter-Darigold Salted 30x1LB', 'Greenleaf', 1, 0, 'Case'),
  ('Lettuce-Iceberg Shredded 4x5LB', 'Greenleaf', 4, 0, 'Cases'),
  ('Tomato-Cherry Toybox 15x1 PINT', 'Greenleaf', 1, 0, 'Case'),
  ('Herb-Basil 1/BUNCH', 'Greenleaf', 6, 0, 'EA'),
  ('Melon-Watermelon Seedless (6ct size)', 'Greenleaf', 5, 0, 'EA');

-- Alsco items
INSERT INTO inventory_items (item_name, vendor, par_level, current_stock, unit) VALUES
  ('3x4 Mat, Black (Service)', 'Alsco', 3, 0, 'EA'),
  ('Laundry Bag (Service)', 'Alsco', 10, 0, 'EA'),
  ('Soiled Laundry Carts (Service)', 'Alsco', 1, 0, 'EA');

-- Verify all items were inserted
SELECT vendor, COUNT(*) as item_count
FROM inventory_items
GROUP BY vendor
ORDER BY vendor;

-- Show total count
SELECT COUNT(*) as total_items FROM inventory_items;
