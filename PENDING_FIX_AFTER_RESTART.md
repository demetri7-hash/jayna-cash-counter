# PENDING FIX AFTER VS CODE RESTART
**Date**: October 15, 2025
**Issue**: VS Code buffer changes not saving to disk

## PROBLEM
The bottled/to-go section in the PDF is using a custom blue table that spans multiple pages incorrectly. It should use the SAME format as other sections (HIGH PRIORITY, LINE COOKS PREP, etc.) - simple table format via `renderPrepPDFSection`.

## WHAT'S CURRENTLY WRONG
- Line 16559: Calls `buildBottledSauceSummary(recommendations)` which returns `{label, quantity, lastCounted}`
- Line 16561: Calls `renderSauceSummaryTable()` which DOESN'T EXIST (function not found)
- The blue section spans multiple pages with custom formatting
- Should be ONE simple section like all other priority sections

## WHAT WAS ALREADY COMMITTED (WORKING)
✅ Added 4th checkbox in PREP tab: "📋 SHOW IN BOTTLE COUNT" (line 14105-14117)
✅ Created `toggleBottleCount()` function (line 14982)
✅ Checkbox auto-saves to database with visual feedback
✅ `buildBottledSauceSummary()` function exists and works

## WHAT NEEDS TO BE FIXED (NOT SAVED YET)
The bottled section should use `renderPrepPDFSection()` instead of custom rendering.

### LOCATION 1: generatePrepSheetPDF() function
**File**: index.html  
**Lines**: 16558-16564 (approximately)

**FIND THIS CODE:**
```javascript
      // Bottled sauce summary
      const sauceSummary = buildBottledSauceSummary(recommendations);
      if (sauceSummary.length > 0) {
        yPos = renderSauceSummaryTable(doc, sauceSummary, yPos);
      }

      // Group by priority
      const makeFirst = recommendations.filter(r => r.urgent === true)
```

**REPLACE WITH:**
```javascript
      // Bottled & To-Go items section (before main priority sections)
      const bottledItems = recommendations.filter(r => {
        const nameMatch = isBottledOrToGoItem(r.itemName);
        const checkboxMatch = r.showInBottleCount === true;
        return nameMatch || checkboxMatch;
      });

      if (bottledItems.length > 0) {
        yPos = renderPrepPDFSection(doc, 'BOTTLED & TO-GO PREP CHECK', bottledItems, yPos, [33, 150, 243]);
      }

      // Filter out bottled/to-go items from main prep sections
      const prepItems = recommendations.filter(r => {
        const nameMatch = isBottledOrToGoItem(r.itemName);
        const checkboxMatch = r.showInBottleCount === true;
        return !nameMatch && !checkboxMatch;
      });

      // Group by priority
      const makeFirst = prepItems.filter(r => r.urgent === true)
```

**KEY CHANGES:**
1. Stop calling `buildBottledSauceSummary()` - it formats data wrong for tables
2. Filter `bottledItems` directly from `recommendations` (full item objects)
3. Call `renderPrepPDFSection()` with blue color `[33, 150, 243]`
4. Filter `prepItems` to EXCLUDE bottled items (so they don't appear twice)
5. Change all other filters from `recommendations` to `prepItems`

### LOCATION 2: emailPrepSheetToPrinter() function
**File**: index.html  
**Lines**: ~16696-16702 (approximately)

**SAME FIX** - Find the same pattern and replace with same code as above.

### LOCATION 3: Update remaining filter references
After the fixes above, you need to update ALL the priority filters to use `prepItems` instead of `recommendations`:

**FIND:**
```javascript
      const lineCooksPrep = recommendations.filter(r => r.lineCooksPrep === true && r.urgent !== true)
      const urgent = recommendations.filter(r => r.priority === 'urgent' && r.urgent !== true && r.lineCooksPrep !== true);
      const high = recommendations.filter(r => r.priority === 'high' && r.urgent !== true && r.lineCooksPrep !== true);
      const medium = recommendations.filter(r => r.priority === 'medium' && r.urgent !== true && r.lineCooksPrep !== true);
      const low = recommendations.filter(r => r.priority === 'low' && r.urgent !== true && r.lineCooksPrep !== true);
```

**REPLACE WITH:**
```javascript
      const lineCooksPrep = prepItems.filter(r => r.lineCooksPrep === true && r.urgent !== true)
      const urgent = prepItems.filter(r => r.priority === 'urgent' && r.urgent !== true && r.lineCooksPrep !== true);
      const high = prepItems.filter(r => r.priority === 'high' && r.urgent !== true && r.lineCooksPrep !== true);
      const medium = prepItems.filter(r => r.priority === 'medium' && r.urgent !== true && r.lineCooksPrep !== true);
      const low = prepItems.filter(r => r.priority === 'low' && r.urgent !== true && r.lineCooksPrep !== true);
```

## OPTIONAL: DELETE OLD UNUSED FUNCTIONS
These functions are NO LONGER NEEDED after the fix:

1. **`buildBottledSauceSummary()`** at line ~17040 (was building wrong data format)
2. **`renderSauceSummaryCard()`** at line ~17095 (custom blue card rendering)

You can delete them or leave them - they won't be called anymore.

## HOW TO APPLY AFTER RESTART
1. **Restart VS Code** - ensures clean buffer state
2. **Open index.html**
3. **Search for** `renderSauceSummaryTable` (will find the broken calls)
4. **Apply Fix Location 1** in `generatePrepSheetPDF()` function
5. **Apply Fix Location 2** in `emailPrepSheetToPrinter()` function  
6. **Apply Fix Location 3** - change remaining filters from `recommendations` to `prepItems`
7. **Save file** (Cmd+S)
8. **Test in browser** - generate PDF and verify bottled section looks like other sections
9. **Commit and push**:
   ```bash
   git add index.html
   git commit -m "fix(prep-pdf): use standard table format for bottled section"
   git push origin main
   ```

## EXPECTED RESULT
- Bottled section will look identical to HIGH PRIORITY, LINE COOKS PREP sections
- Blue header bar with "BOTTLED & TO-GO PREP CHECK (X items)"
- Standard 6-column table: ITEM | LAST COUNTED | CURRENT | PAR | MAKE | REASON
- No multi-page blue card rendering
- Works on single page or spans multiple pages cleanly like other sections

## DATABASE REMINDER
Don't forget to run this in Supabase SQL Editor (if not done yet):
```sql
ALTER TABLE inventory_items 
ADD COLUMN IF NOT EXISTS show_in_bottle_count BOOLEAN DEFAULT FALSE;
```

## VERIFICATION CHECKLIST
After applying fixes:
- [ ] No more blue multi-page cards
- [ ] Bottled section uses same table format as other sections
- [ ] Items with "BOTTLED" in name appear in bottled section
- [ ] Items with "TO GO" or "TO-GO" in name appear in bottled section
- [ ] Items with checkbox checked appear in bottled section
- [ ] Items in bottled section do NOT appear in other sections
- [ ] Blue header color [33, 150, 243] is used
- [ ] PDF generates without errors
