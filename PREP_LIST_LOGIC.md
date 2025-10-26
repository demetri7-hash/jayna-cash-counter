# PREP LIST CALCULATION LOGIC

**Last Updated:** October 26, 2025
**File Location:** `api/print-prep-list-new.js`
**Function:** `calculatePrepList()` and `generatePrepListPDF()`

This document explains how the catering prep list calculates quantities, containers, and utensils for each menu item.

---

## 📋 TABLE OF CONTENTS

1. [Overview](#overview)
2. [Container Types & Sizing](#container-types--sizing)
3. [Utensil Counting](#utensil-counting)
4. [BYO Gyro Pitas](#byo-gyro-pitas)
5. [Salads](#salads)
6. [Dips](#dips)
7. [Greek Fries Bar](#greek-fries-bar)
8. [Dolmas](#dolmas)
9. [Spanakopita](#spanakopita)
10. [Sides](#sides)
11. [Desserts & Pinwheels](#desserts--pinwheels)
12. [How to Update This Logic](#how-to-update-this-logic)

---

## OVERVIEW

The prep list automatically calculates:
- **Container needs** (half pans, full pans, deli containers, brown bowls, round trays)
- **Utensil needs** (tongs, large serving spoons, small spoons)
- **Ingredient quantities** per item
- **Special prep instructions** per item

**Key Principle:** All quantities are based on **guest portions** and scale automatically based on order size.

---

## CONTAINER TYPES & SIZING

### Container Hierarchy (Smallest to Largest)

| Container Type | Use Case | Typical Portions |
|----------------|----------|------------------|
| **16oz Deli Container** | Small portions, sauces, toppings | 1-10 portions |
| **32oz Deli Container** | Medium portions | 10-20 portions |
| **Brown Jayna Bowl** | Medium portions, vegetables | 10-45 portions |
| **Round Tray with Dome Lid** | Individual plated items | 2-4 portions |
| **Half Pan** | Large portions, main ingredients | 20-50 portions |
| **Full Pan** | Very large portions, bulk items | 50-100+ portions |

### Pan Conversion Logic

```javascript
// Half pans convert to full pans when possible
const totalHalfPans = (fullPans * 2) + halfPans;

// Display format:
// 9 half pans → "4 full pans + 1 half pan"
// 8 half pans → "4 full pans"
// 1 half pan → "1 half pan"
```

---

## UTENSIL COUNTING

### Utensil Types

1. **Tongs** - For serving solid items (greens, veggies, proteins, etc.)
2. **Large Serving Spoons** - For scooping salads, rice
3. **Small Spoons** - For sauces, dressings, dips

### Utensil Rules

- **1 tong per ingredient type** (not per container)
- **Large serving spoons:**
  - 2 total EACH for SALADS OF THE SAME TYPE (shared)
  - 1 per rice/grain side
  - 1 for diced tomatoes (BYO Gyros)
- **Small spoons:**
  - 1 per sauce/dressing type (not per container) - HOWEVER IF WE HAVE 3+ SAUCES OF THE SAME TYPE, INCLUDE 1 EXTRA SMALL SPOON!

---

## BYO GYRO PITAS

### Portion Tracking

```javascript
// Example: 6x Beef & Lamb + 6x Chicken + 4x Roasted Chickpeas = 16 total portions
prep.byoGyros.total = 16;
```

### Sauces (Per 15 Portions = 1 Set)

```javascript
const sets = Math.ceil(prep.byoGyros.total / 15); // Round up

// Each set includes:
// - 1x 16oz Tzatziki (no dill) - 1 small spoon
// - 1x 16oz Spicy Aioli - 1 small spoon
// - 1x 16oz Lemon Vinaigrette - 1 small spoon
// Total: sets * 3 deli containers, 3 small spoons
```

**Examples:**
- 16 portions ÷ 15 = 1.07 → **1 set** = **3 deli containers**
- 30 portions ÷ 15 = 2.0 → **2 sets** = **6 deli containers**
- 45 portions ÷ 15 = 3.0 → **3 sets** = **9 deli containers**

### Mixed Greens

```javascript
// 1 half pan per set (per 15 portions)
const sets = Math.ceil(prep.byoGyros.total / 15);
halfPans += sets; // 1 tong
```

**Examples:**
- 16 portions → 1 set → **1 half pan** mixed greens
- 30 portions → 2 sets → **1 full pan** mixed greens (2 half pans)
- 45 portions → 3 sets → **2 full pans** mixed greens (3 half pans)

### Diced Tomatoes (30 portions per half pan)

```javascript
if (portions < 10) {
  container = '16oz deli container';
}
else if (portions <= 20) {
  container = 'brown Jayna bowl'; // COORDINATED TRIGGER
  tomatoUsesBrownBowl = true;
}
else {
  halfPans = Math.ceil(portions / 30);
  container = formatPanCount(halfPans);
}
// Always: 1 large serving spoon
```

**Examples:**
- 8 portions → **16oz deli**
- 16 portions → **brown bowl** (triggers coordinated logic)
- 35 portions → **2 half pans** (35 ÷ 30 = 1.17, round up to 2)

**⚠️ COORDINATED LOGIC:** When tomatoes use brown bowl (10-20 portions), onions AND pepperoncini MUST also use brown bowls for visual consistency.

### Sliced Red Onion (50 portions per half pan)

```javascript
// COORDINATED: If tomatoes use brown bowl, onions MUST use brown bowl
if (tomatoUsesBrownBowl) {
  container = 'brown Jayna bowl';
}
else if (portions < 20) {
  container = '16oz deli container';
}
else if (portions <= 45) {
  container = 'brown Jayna bowl';
}
else {
  halfPans = Math.ceil(portions / 50);
  container = formatPanCount(halfPans);
}
// Always: 1 tong
```

**Examples:**
- 8 portions → **16oz deli** (unless coordinated)
- 16 portions → **brown bowl** (coordinated with tomatoes)
- 35 portions → **brown bowl** (independent)
- 60 portions → **2 half pans** (60 ÷ 50 = 1.2, round up to 2)

### Whole Pepperoncini (100 portions per half pan)

```javascript
// COORDINATED: If tomatoes use brown bowl, pepperoncini MUST use brown bowl
if (tomatoUsesBrownBowl) {
  container = 'brown Jayna bowl';
}
else if (portions < 10) {
  container = '16oz deli';
}
else if (portions <= 20) {
  container = '32oz deli';
}
else if (portions < 100) {
  container = '1 half pan';
}
else {
  // 100+ portions: Use FULL PANS
  fullPans = Math.floor(portions / 100);
  remainder = portions % 100;
  if (remainder > 0) {
    container = `${fullPans} full pan(s) + 1 half pan`;
  } else {
    container = `${fullPans} full pan(s)`;
  }
}
// Always: 1 tong
```

**Examples:**
- 8 portions → **16oz deli** (unless coordinated)
- 16 portions → **brown bowl** (coordinated with tomatoes)
- 35 portions → **1 half pan** (independent)
- 125 portions → **1 full pan + 1 half pan**

### Grilled Pita Bread (25 whole pitas per full pan)

```javascript
// Calculate total pitas needed:
// 1 pita per portion + 10% extra (round up)
const pitasNeeded = portions + Math.ceil(portions / 10);
const pitaFullPans = Math.ceil(pitasNeeded / 25);
fullPans += pitaFullPans;
// Always: 1 tong
```

**Examples:**
- 16 portions → 16 + 2 extra = **18 pitas** → **1 full pan**
- 50 portions → 50 + 5 extra = **55 pitas** → **3 full pans** (55 ÷ 25 = 2.2, round up to 3)

### BYO Gyros Summary - Utensils

```javascript
// Tongs: 5 total
// - 1 for mixed greens
// - 1 for diced tomatoes
// - 1 for sliced red onion
// - 1 for pepperoncini
// - 1 for grilled pita

// Small Spoons: 3 total
// - 1 for tzatziki
// - 1 for spicy aioli
// - 1 for lemon vinaigrette

// Large Serving Spoons: 1 total
// - 1 for diced tomatoes
```

---

## SALADS

### Pan Sizing

```javascript
// If order qty < 4: Use 1 half pan per salad
// If order qty >= 4: Use 2 half pans per salad (scaled up)

if (salad.qty < 4) {
  halfPans += salad.qty;
} else {
  halfPans += salad.qty * 2;
}
```

**Examples:**
- 1x House Salad → **1 half pan**
- 3x Greek Salad → **3 half pans**
- 4x Mediterranean Chopped → **8 half pans** = **4 full pans**

### Lemon Vinaigrette

```javascript
// 1x 16oz deli container per salad
deliContainers += salad.qty;
// 1 small spoon PER SALAD TYPE (not per container)
```

**Example:**
- 3x House Salad → **3x 16oz lemon vin** → **1 small spoon total**

### Salad Utensils

```javascript
// Tongs: 1 per salad TYPE (not per order quantity)
tongs += prep.salads.length;

// Small Spoons: 1 per salad TYPE for lemon vin
smallSpoons += prep.salads.length;

// Large Serving Spoons: 2 TOTAL for ALL salads (shared)
largeServingSpoons += 2;
```

**Examples:**
- 1x House Salad + 2x Greek Salad = **2 tongs, 2 small spoons, 2 large spoons**
- 5x House Salad only = **1 tong, 1 small spoon, 2 large spoons**

---

## DIPS

### Dip Container (Always 16oz Deli)

```javascript
// 1x 16oz deli container per dip order
deliContainers += dip.qty;
// 1 small spoon PER DIP TYPE (not per quantity)
smallSpoons += prep.dips.length;
```

**Example:**
- 3x Hummus → **3x 16oz deli containers** → **1 small spoon**

### Veggie Sticks (Carrots & Celery)

```javascript
// If dip has veggie modifier:
// 24 carrots + 24 celery per dip order
const veggies = dip.qty * 24; // carrots
const celery = dip.qty * 24;   // celery
brownBowls += dip.qty * 2; // 2 brown bowls per dip (1 carrots, 1 celery)
tongs += 2; // 2 tongs TOTAL for ALL dips with veggies (1 carrots, 1 celery)
```

**Example:**
- 2x Hummus w/ Veggies → **48 carrots + 48 celery** → **4 brown bowls** → **2 tongs total**

### Regular Sliced Pita (6 pitas per half pan)

```javascript
// If dip has pita modifier (not GF):
const pitasPerDip = 6;
const regularPitaHalfPans = dip.qty; // 1 half pan per dip
halfPans += regularPitaHalfPans;
tongs += 1; // 1 tong TOTAL for ALL dips with pita
```

**Example:**
- 2x Tzatziki w/ Pita → **12 pitas sliced 8 pieces** → **2 half pans** = **1 full pan** → **1 tong**

### GF Pita (ADDON - Parse from Price)

```javascript
// GF pita is ADDON ONLY - parse quantity from price
// Method 1: Check modifier.price field (in cents)
if (modifier.price) {
  gfPitaQty = Math.round(modifier.price / 200); // $2 per GF pita
}
// Method 2: Parse from name string: "+ Gluten Free Pita ($4.00)"
else if (modifier.name.match(/\$(\d+(?:\.\d{1,2})?)/)) {
  const totalPrice = parseFloat(match[1]);
  gfPitaQty = Math.round(totalPrice / 2); // $2 per GF pita
}

// Container: 6 GF pitas per half pan
const gfPitaHalfPans = Math.ceil(gfPitaQty / 6);
halfPans += gfPitaHalfPans;
tongs += 1; // 1 tong TOTAL for ALL dips with GF pita
```

**Example:**
- Hummus + GF Pita ($4.00) → **2 GF pitas** → **1 half pan** → **1 tong**

---

## GREEK FRIES BAR

### Fries Container Sizing

```javascript
// If order qty < 2: 1 half pan per order
// If order qty >= 2: 2 half pans per order
if (fries.qty < 2) {
  halfPans += fries.qty;
} else {
  halfPans += fries.qty * 2;
}
```

**Examples:**
- 1x Greek Fries Bar → **1 half pan**
- 3x Greek Fries Bar → **6 half pans** = **3 full pans**

### Toppings (Per Order)

```javascript
// Each Greek Fries Bar order includes:
// - 16oz Spicy Aioli
// - 16oz Tzatziki
// - 16oz Crumbled Feta
deliContainers += 3; // per order

// Small spoons: 3 TOTAL for ALL Greek Fries orders
smallSpoons += 3; // (not per order!)
```

**Example:**
- 2x Greek Fries Bar → **6 deli containers** (2 sets) → **3 small spoons total**

### Greek Fries Utensils

```javascript
// Tongs: 1 per Greek Fries TYPE
tongs += prep.greekFries.length;

// Small Spoons: 3 TOTAL (aioli, tzatziki, feta)
smallSpoons += 3;
```

---

## DOLMAS

### Container Logic (Based on Total Quantity)

```javascript
if (totalOrders === 1) {
  container = 'brown Jayna bowl';
  brownBowls += 1;
}
else if (totalOrders >= 2 && totalOrders <= 4) {
  container = 'round trays with dome lids';
  roundTrays += totalOrders; // 1 round tray per order
}
else { // 5+ orders
  container = 'half pan';
  halfPans += 1;
}
// Always: + lemon wedges
```

**Examples:**
- 1x Dolmas (12 pieces) → **1 brown bowl**
- 3x Dolmas (12 pieces each) → **3 round trays**
- 6x Dolmas (12 pieces each) → **1 half pan**

### Tzatziki (1 per 2 orders, round up)

```javascript
// 1x 16oz tzatziki per 2 orders (round up)
const tzatzikiCount = Math.ceil(totalOrders / 2);
deliContainers += tzatzikiCount;
// Garnish: dill stripe
```

**Examples:**
- 1 order → **1x 16oz tzatziki (dill stripe)**
- 3 orders → **2x 16oz tzatziki (dill stripe)** (3 ÷ 2 = 1.5, round up to 2)
- 6 orders → **3x 16oz tzatziki (dill stripe)**

### Dolmas Utensils

```javascript
// Tongs: 1 per dolma TYPE
tongs += prep.dolmas.length;

// Small Spoons: 1 per dolma TYPE for tzatziki
smallSpoons += prep.dolmas.length;
```

---

## SPANAKOPITA

### Tzatziki (1 per order)

```javascript
// 1x 16oz tzatziki per spanakopita order
deliContainers += span.qty;
// Garnish: dill stripe
```

**Example:**
- 4x Spanakopita → **4x 16oz tzatziki (dill stripe)**

**Note:** If order is 4+ spanakopita, customer gets 1x 16oz deli tzatziki with dill stripe garnish.

### Spanakopita Utensils

```javascript
// Tongs: 1 per spanakopita TYPE
tongs += prep.spanakopita.length;

// Small Spoons: 1 per spanakopita TYPE for tzatziki
smallSpoons += prep.spanakopita.length;
```

---

## SIDES

### Container Sizing

- Sides use default container sizing (not specified in current logic)
- Display quantity ordered

### Rice Sides (Special Utensil)

```javascript
// If side name includes "RICE":
if (side.name.toUpperCase().includes('RICE')) {
  largeServingSpoons += 1; // 1 large serving spoon
}
```

### Sides Utensils

```javascript
// Tongs: 1 per SIDE TYPE
tongs += prep.sides.length;

// Large Serving Spoons: 1 per rice/grain side
largeServingSpoons += (rice sides count);
```

---

## DESSERTS & PINWHEELS

### Container Sizing

- Desserts and pinwheels use default container sizing
- Display quantity ordered

### Utensils

```javascript
// Desserts: 1 tong per DESSERT TYPE
tongs += prep.desserts.length;

// Pinwheels: 1 tong per PINWHEEL TYPE
tongs += prep.pinwheels.length;
```

**Example:**
- 3x Walnut Baklava + 2x Pistachio Baklava = **2 tongs** (2 dessert types)

---

## HOW TO UPDATE THIS LOGIC

### ✅ NEW EASY METHOD (Recommended)

**Step 1: Edit the Configuration File**

Open `prep-list-config.json` in your editor and change the values you want:

```json
{
  "byoGyros": {
    "dicedTomatoes": {
      "portionsPerHalfPan": 30,  // ← Change this number!
      "smallContainer_maxPortions": 9,
      "brownBowl_maxPortions": 20
    }
  }
}
```

**Step 2: Tell Claude**

After saving your changes, tell me:
> "I updated prep-list-config.json, please apply these changes to the prep list code"

I'll read your config file and update the actual code to match!

**Step 3: Test & Verify**

I'll deploy the changes and you can verify at:
https://jayna-cash-counter.vercel.app/catering.html

---

### 🔧 ADVANCED METHOD (Manual Code Editing)

If you want to edit the code directly instead:

**Step 1: Edit the Logic File**

```bash
# Open the prep list generation file
/api/print-prep-list-new.js
```

**Step 2: Find the Relevant Section**

Search for the menu item category:
- BYO Gyros → Line ~247-305
- Salads → Line ~307-316
- Dips → Line ~318-346
- Greek Fries → Line ~348-356
- Dolmas → Line ~358-379
- Spanakopita → Line ~381-388
- Sides → Line ~390-399
- Desserts → Line ~401-404
- Pinwheels → Line ~406-409

**Step 3: Update the Calculation**

**Example: Change tomato portions from 30 to 40 per half pan:**

```javascript
// OLD (line ~263):
const tomatoHalfPans = Math.ceil(prep.byoGyros.total / 30);

// NEW:
const tomatoHalfPans = Math.ceil(prep.byoGyros.total / 40);
```

**Step 4: Test & Deploy**

```bash
# Commit changes
git add api/print-prep-list-new.js prep-list-config.json PREP_LIST_LOGIC.md
git commit -m "update(prep-list): [describe your change]"
git push origin main

# Vercel will auto-deploy in 1-2 minutes
```

**Step 5: Verify in Production**

1. Visit: https://jayna-cash-counter.vercel.app/catering.html
2. View prep list for an existing order
3. Verify calculations are correct
4. Download PDF to confirm formatting

---

## CHANGELOG

### October 26, 2025 (v2)
- ✅ **CHANGED:** BYO Gyros sauce sets from 10 portions to **15 portions** per set
  - Reduces sauce containers needed (fewer Tzatziki, Aioli, Lemon Vin)
  - Example: 16 portions now = 1 set (3 containers) instead of 2 sets (6 containers)
- ✅ Updated config file: `prep-list-config.json` with new ratio
- ✅ Updated code: `api/print-prep-list-new.js` lines 463 and 682

### October 26, 2025 (v1)
- ✅ Initial documentation created
- ✅ Documented all current calculation logic
- ✅ Added examples for each menu category
- ✅ Documented coordinated brown bowl logic for BYO Gyros
- ✅ Created editable config file: `prep-list-config.json`

---

## QUICK REFERENCE: PORTION THRESHOLDS

| Item | Small | Medium | Large |
|------|-------|--------|-------|
| **Diced Tomatoes** | <10: 16oz deli | 10-20: Brown bowl | 21+: Half pan (30/pan) |
| **Sliced Red Onion** | <20: 16oz deli | 20-45: Brown bowl | 46+: Half pan (50/pan) |
| **Pepperoncini** | <10: 16oz deli | 10-20: 32oz deli | 21-99: Half pan | 100+: Full pan (100/pan) |
| **Grilled Pita** | N/A | N/A | Full pan (25/pan) |
| **Mixed Greens** | N/A | N/A | 1 half pan per 10 portions |

---

**Questions or need help updating?** Ask me and I'll help you modify the logic and update this documentation!
