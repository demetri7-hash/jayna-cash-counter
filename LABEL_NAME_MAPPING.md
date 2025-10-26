# Label Export Item Name Mapping

## Current → New Name Mapping (for review)

### BYO GYROS ITEMS

| Current Name | New Name | Notes |
|--------------|----------|-------|
| Tzatziki Sauce | TZATZIKI | BYO Gyros sauce |
| Spicy Aioli Sauce | SPICY AIOLI | BYO Gyros sauce |
| Lemon Vinaigrette | LEMON VINAIGRETTE | BYO Gyros sauce |
| Mixed Greens | MIXED GREENS | BYO Gyros greens |
| Diced Tomatoes | DICED TOMATOES | BYO Gyros veggie |
| Sliced Red Onion | RED ONIONS | BYO Gyros veggie (renamed) |
| Whole Pepperoncini | PEPPERONCINI | BYO Gyros veggie (simplified) |
| Grilled Pita Bread | GRILLED PITA | BYO Gyros pita (simplified) |

### SALAD ITEMS

| Current Name | New Name | Notes |
|--------------|----------|-------|
| Jayna House Salad | JAYNA HOUSE SALAD | Salad name (uppercase) |
| Jayna House Salad - Lemon Vinaigrette | LEMON VINAIGRETTE (HOUSE SALAD) | Salad dressing (renamed format) |
| Greek Salad | GREEK SALAD | Salad name (if exists) |
| Greek Salad - Lemon Vinaigrette | LEMON VINAIGRETTE (GREEK SALAD) | Salad dressing (if exists) |
| Caesar Salad | CAESAR SALAD | Salad name (if exists) |
| Caesar Salad - Lemon Vinaigrette | LEMON VINAIGRETTE (CAESAR SALAD) | Salad dressing (if exists) |

**⚠️ QUESTION:** What are ALL the possible salad names in your menu? I need the complete list to create proper mappings.

### DIP ITEMS

| Current Name | New Name | Notes |
|--------------|----------|-------|
| Hummus | HUMMUS | Dip name (uppercase) |
| Tzatziki | TZATZIKI | Dip name (uppercase) |
| Spicy Feta | SPICY FETA | Dip name (if exists) |
| Baba Ganoush | BABA GANOUSH | Dip name (if exists) |
| {DIP_NAME} - Veggie Sticks (Carrots) | VEGGIE STICKS (CARROTS) | Dip side (simplified?) |
| {DIP_NAME} - Veggie Sticks (Celery) | VEGGIE STICKS (CELERY) | Dip side (simplified?) |
| {DIP_NAME} - Sliced Pita Bread | SLICED PITA | Dip side (simplified?) |
| {DIP_NAME} - GF Pita Bread | GF PITA (SLICED) | Dip side (simplified?) |

**⚠️ QUESTION:** Should dip sides keep the dip name prefix (e.g., "HUMMUS - VEGGIE STICKS (CARROTS)") or remove it?

### GREEK FRIES BAR

| Current Name | New Name | Notes |
|--------------|----------|-------|
| Greek Fries + Protein | GREEK FRIES + PROTEIN | Main item |
| Greek Fries - Spicy Aioli | SPICY AIOLI | Topping (simplified) |
| Greek Fries - Tzatziki | TZATZIKI | Topping (simplified) |
| Greek Fries - Crumbled Feta | CRUMBLED FETA | Topping (simplified) |

### DOLMAS

| Current Name | New Name | Notes |
|--------------|----------|-------|
| Dolmas (10 pieces) | DOLMAS (10 PIECES) | Dolma name (uppercase, if dynamic) |
| Dolmas (10 pieces) - Tzatziki Sauce | TZATZIKI (DOLMAS) | Sauce for dolmas |

**⚠️ QUESTION:** How should dolma sauces be labeled? "TZATZIKI (DOLMAS)" or "DOLMAS - TZATZIKI"?

### SPANAKOPITA

| Current Name | New Name | Notes |
|--------------|----------|-------|
| Spanakopita (10 pieces) | SPANAKOPITA (10 PIECES) | Spanakopita name (uppercase, if dynamic) |
| Spanakopita (10 pieces) - Tzatziki Sauce | TZATZIKI (SPANAKOPITA) | Sauce for spanakopita |

**⚠️ QUESTION:** How should spanakopita sauces be labeled? "TZATZIKI (SPANAKOPITA)" or "SPANAKOPITA - TZATZIKI"?

### SIDES

| Current Name | New Name | Notes |
|--------------|----------|-------|
| Greek Fries (side) | GREEK FRIES | Side item (uppercase) |
| Rice Pilaf | RICE PILAF | Side item (if exists) |
| Roasted Potatoes | ROASTED POTATOES | Side item (if exists) |

**⚠️ QUESTION:** What are ALL the possible side items in your menu?

### DESSERTS

| Current Name | New Name | Notes |
|--------------|----------|-------|
| Baklava | BAKLAVA | Dessert item (uppercase) |
| Greek Yogurt | GREEK YOGURT | Dessert item (if exists) |

**⚠️ QUESTION:** What are ALL the possible dessert items in your menu?

### PINWHEELS

| Current Name | New Name | Notes |
|--------------|----------|-------|
| Chicken Pinwheels | CHICKEN PINWHEELS | Pinwheel item (uppercase) |
| Veggie Pinwheels | VEGGIE PINWHEELS | Pinwheel item (if exists) |

**⚠️ QUESTION:** What are ALL the possible pinwheel items in your menu?

---

## Label Sorting Order

Labels will be sorted alphabetically by NEW NAME so that all labels for the same item print together:

1. CRUMBLED FETA
2. DICED TOMATOES
3. GREEK FRIES + PROTEIN
4. GRILLED PITA
5. HUMMUS
6. JAYNA HOUSE SALAD
7. LEMON VINAIGRETTE
8. LEMON VINAIGRETTE (HOUSE SALAD)
9. MIXED GREENS
10. PEPPERONCINI
11. RED ONIONS
12. SPICY AIOLI
13. TZATZIKI

---

## Questions for You:

Please provide complete lists for:

1. **All Salad Names** (e.g., Jayna House Salad, Greek Salad, Caesar Salad, etc.)
2. **All Dip Names** (e.g., Hummus, Tzatziki, Spicy Feta, Baba Ganoush, etc.)
3. **All Side Items**
4. **All Dessert Items**
5. **All Pinwheel Items**
6. **All Dolma Items** (if multiple types)
7. **All Spanakopita Items** (if multiple types)

Also clarify:
- Should dip sides keep the dip name in the label? (e.g., "HUMMUS - VEGGIE STICKS" vs just "VEGGIE STICKS")
- How should sauces for dolmas/spanakopita be labeled?

Once you provide these details, I'll update the code to implement the exact naming and sorting you want.
