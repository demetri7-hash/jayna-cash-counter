# BUTTON AUDIT MAP - Complete Inventory

**Purpose:** Systematically replace all EDIT buttons with universal pen icon pattern and standardize CLOSE buttons.

**Created:** October 27, 2025

**Universal Pattern Reference:**
- **EDIT Icon:** Pen SVG icon in upper right corner of modals (black/white only)
- **CLOSE Button:** × symbol button in upper right corner

---

## Summary Statistics

### EDIT Buttons by File
- **amex-receipts.html:** 2 EDIT buttons (✅ **ALREADY UPDATED WITH PEN ICON**)
- **index.html:** 11 EDIT buttons/links
- **boh.html:** 7 EDIT buttons
- **foh-checklists.html:** 7 EDIT buttons
- **catering.html:** 4 EDIT buttons
- **catering-test.html:** 4 EDIT buttons
- **cogs.html:** 1 EDIT button
- **managerlogs.html:** 0 EDIT buttons

**Total:** 36 EDIT buttons (2 already updated, 34 remaining)

### CLOSE Buttons by File
- **amex-receipts.html:** 5 close buttons (4 × symbols, 1 CLOSE text)
- **index.html:** 2 × symbols
- **managerlogs.html:** 1 CLOSE text button
- **catering.html:** 1 CLOSE text button
- **catering-test.html:** 1 CLOSE text button
- **foh-checklists.html:** 1 CLOSE LIST text button

**Total:** 11 close buttons

---

## DETAILED AUDIT BY FILE

---

## 1. amex-receipts.html ✅ REFERENCE IMPLEMENTATION

**Status:** ✅ **ALREADY UPDATED - USE AS REFERENCE PATTERN**

### EDIT Buttons

#### Line 665: ✅ Modal Edit Icon (NEW PATTERN)
```html
<button class="modal-edit-icon" id="modalEditBtn" onclick="enableEditing()" title="Edit Receipt">
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
  </svg>
</button>
```
**Pattern:** Upper right corner of modal header, next to × close button, hides when editing mode active

#### Line 678: ❌ OLD PATTERN - REMOVE THIS
```html
<button class="btn btn-primary" onclick="enableEditing()">EDIT</button>
```
**Action:** Should be removed (redundant with pen icon)

### CLOSE Buttons

#### Line 670: × Close Button (Modal Header)
```html
<button class="modal-close" onclick="closeDetailModal()">&times;</button>
```
**Pattern:** Upper right corner of modal header

#### Line 677: CLOSE Text Button (Bottom Action)
```html
<button class="btn btn-secondary" onclick="closeDetailModal()">CLOSE</button>
```
**Pattern:** Bottom action button area

#### Line 688: × Close Button (Password Modal)
```html
<button class="modal-close" onclick="closePasswordModal()">&times;</button>
```

#### Line 708: × Close Button (Confirm Modal)
```html
<button class="modal-close" onclick="closeConfirmModal()">&times;</button>
```

#### Line 727: × Close Button (Accept Clear Modal)
```html
<button class="modal-close" onclick="closeAcceptClearModal()">&times;</button>
```

---

## 2. index.html 🔴 HIGHEST PRIORITY

**Status:** 🔴 NEEDS UPDATE (11 EDIT buttons to replace)

**Note:** User wants this file done LAST for dynamic header implementation, but EDIT buttons can be updated now.

### EDIT Buttons

#### Line 1451: Tab Button
```html
">EDIT</button>
```
**Context:** Tab navigation button
**Action:** Replace text "EDIT" with pen icon, keep tab styling

#### Line 11742: Edit Order Button Class Assignment
```javascript
editLink.className = 'edit-order-btn';
```
**Context:** Dynamic table row creation
**Action:** Replace with pen icon button

#### Line 11765: Console log reference
```javascript
console.log(`✅ Row ${index + 1} appended with EDIT and DELETE buttons`);
```
**Action:** Update console message after implementing icon

#### Line 11779: Event listener for edit button
```javascript
const editLink = event.target.closest('.edit-order-btn');
```
**Action:** Update class name if needed after implementing icon

#### Line 11783: Console log
```javascript
console.log('🖱️ EDIT clicked for order ID:', orderId);
```
**Action:** No change needed (logging only)

#### Line 11848: Modal header text
```javascript
header.textContent = `EDIT ORDER: ${order.vendor}`;
```
**Action:** Modal title - keep as text, not a button

#### Line 11934: Save button onclick
```javascript
saveBtn.onclick = () => saveOrderEdits(orderId, order);
```
**Action:** No change needed (different button)

#### Line 14055: Bulk Edit Modal Title
```javascript
title.textContent = `BULK EDIT - ${selectedItems.length} ITEMS SELECTED`;
```
**Action:** Modal title text - keep as is

#### Line 14594: Toggle Bulk Edit Mode Button
```javascript
onclick="toggleBulkEditMode()"
```
**Action:** Button needs icon replacement

#### Line 14608: Bulk Edit Button Text
```javascript
${bulkEditMode ? 'EXIT BULK EDIT' : 'BULK EDIT'}
```
**Action:** Replace with icon when in BULK EDIT mode

#### Line 14612: Open Bulk Edit Modal Button
```javascript
onclick="openBulkEditModal()"
```
**Action:** Button needs icon replacement

#### Line 14626: Bulk Edit Selected Count
```javascript
EDIT ${selectedItemsForBulkEdit.size} SELECTED
```
**Action:** Replace "EDIT" text with icon

#### Line 14631: Select Items Text
```javascript
SELECT ITEMS TO BULK EDIT
```
**Action:** Text only - keep as is

#### Line 14719: Edit Item Modal Link
```javascript
onclick="openEditItemModal(${item.id}); return false;"
```
**Action:** Link needs icon replacement

#### Line 15830: Edit Item Modal Link (duplicate)
```javascript
onclick="openEditItemModal(${item.id}); return false;"
```
**Action:** Link needs icon replacement

#### Line 18231: Edit Item Header Title
```javascript
headerTitle.textContent = 'EDIT ITEM';
```
**Action:** Modal title text - keep as is

---

## 3. boh.html 🔴 HIGH PRIORITY

**Status:** 🔴 NEEDS UPDATE (7 EDIT buttons to replace)

### EDIT Buttons

#### Line 516-529: Tab Button
```html
<button class="tab-link" onclick="openFOHManagerEdit(event)" style="...">EDIT</button>
```
**Context:** Tab navigation
**Action:** Replace "EDIT" text with pen icon

#### Line 4587: Checklist Editor Modal Title
```html
⚙️ CHECKLIST EDITOR
```
**Action:** Modal title - keep as is (not a button)

#### Line 4636: Edit Checklist Function Call
```javascript
onclick="editChecklist('${type}')"
```
**Action:** Button needs icon replacement

#### Line 4671: Edit Button
```html
>✏️ EDIT</button>
```
**Context:** Checklist edit button
**Action:** Replace emoji + text with clean SVG icon

#### Line 4752: Editing Modal Title
```html
✏️ EDITING: ${checklist.title}
```
**Action:** Modal title - keep as is

#### Line 4774: Load Manager Editor Button
```javascript
onclick="loadManagerEditor()"
```
**Action:** Button needs icon replacement

#### Line 5063: Load Manager Editor Button (duplicate)
```javascript
onclick="loadManagerEditor()"
```
**Action:** Button needs icon replacement

#### Line 7256: Edit Password Function
```javascript
onclick="editPassword('${pwd.id}')"
```
**Action:** Button needs icon replacement

#### Line 7272: Edit Password Button
```html
>✏️ EDIT</button>
```
**Context:** Password edit button
**Action:** Replace emoji + text with clean SVG icon

---

## 4. foh-checklists.html 🔴 HIGH PRIORITY

**Status:** 🔴 NEEDS UPDATE (7 EDIT buttons to replace)

### EDIT Buttons

#### Line 516-529: Tab Button
```html
<button class="tab-link" onclick="openFOHManagerEdit(event)" style="...">EDIT</button>
```
**Context:** Tab navigation
**Action:** Replace "EDIT" text with pen icon

#### Line 4852: Checklist Editor Modal Title
```html
⚙️ CHECKLIST EDITOR
```
**Action:** Modal title - keep as is (not a button)

#### Line 4901: Edit Checklist Function Call
```javascript
onclick="editChecklist('${type}')"
```
**Action:** Button needs icon replacement

#### Line 4936: Edit Button
```html
>✏️ EDIT</button>
```
**Context:** Checklist edit button
**Action:** Replace emoji + text with clean SVG icon

#### Line 5017: Editing Modal Title
```html
✏️ EDITING: ${checklist.title}
```
**Action:** Modal title - keep as is

#### Line 5039: Load Manager Editor Button
```javascript
onclick="loadManagerEditor()"
```
**Action:** Button needs icon replacement

#### Line 5306: Load Manager Editor Button (duplicate)
```javascript
onclick="loadManagerEditor()"
```
**Action:** Button needs icon replacement

#### Line 7636: Edit Password Function
```javascript
onclick="editPassword('${pwd.id}')"
```
**Action:** Button needs icon replacement

#### Line 7652: Edit Password Button
```html
>✏️ EDIT</button>
```
**Context:** Password edit button
**Action:** Replace emoji + text with clean SVG icon

### CLOSE Buttons

#### Line 3491: Close List Button
```html
>CLOSE LIST</button>
```
**Context:** Checklist close button
**Action:** Consider replacing with × icon or keep as descriptive text

---

## 5. catering.html 🟡 MEDIUM PRIORITY

**Status:** 🟡 NEEDS UPDATE (4 EDIT buttons to replace)

### EDIT Buttons

#### Line 758: Edit Button Link
```html
<a id="editBtn" href="javascript:void(0)" onclick="promptEditMode()" style="...">
```
**Context:** Edit mode toggle link
**Action:** Replace text content with pen icon

#### Line 849: Save Edit Mode Button
```html
<button id="saveBtn" onclick="saveEditMode()" class="refresh-btn" style="...">
```
**Context:** Save button (different from EDIT)
**Action:** No change needed

#### Line 3941: Edit Mode Modal Title
```html
✏️ EDIT MODE
```
**Context:** Modal title
**Action:** Keep as is (title, not button)

#### Line 3948: Close Edit Mode Modal Button
```javascript
onclick="closeEditModeModal()"
```
**Action:** CLOSE button - standardize with × icon

#### Line 3951: Activate Edit Mode Button
```javascript
onclick="activateEditMode()"
```
**Action:** Button needs icon replacement

#### Line 3992: Comment reference
```javascript
// Show SAVE button, update EDIT button text
```
**Action:** Update comment after implementing icon

### CLOSE Buttons

#### Line 2055: Close Button
```html
CLOSE
```
**Context:** Modal close button
**Action:** Replace with × icon for consistency

---

## 6. catering-test.html 🟡 LOW PRIORITY (Test File)

**Status:** 🟡 NEEDS UPDATE (4 EDIT buttons - same as catering.html)

### EDIT Buttons

Same pattern as catering.html (lines 753, 844, 3521, 3528, 3531, 3572)

### CLOSE Buttons

#### Line 2019: Close Button
```html
CLOSE
```

---

## 7. cogs.html 🟢 LOW PRIORITY

**Status:** 🟢 NEEDS UPDATE (1 EDIT button to replace)

### EDIT Buttons

#### Line 2411: Edit Item Button
```html
<button class="btn-small btn-edit" onclick="editItem(${item.id})">Edit</button>
```
**Context:** Small edit button in item list
**Action:** Replace "Edit" text with pen icon, keep btn-small styling

---

## 8. managerlogs.html ✅ NO EDIT BUTTONS

**Status:** ✅ No EDIT buttons found

### CLOSE Buttons

#### Line 567: Close Modal Button
```html
<button class="modal-close" onclick="closeModal()">CLOSE</button>
```
**Context:** Modal close button
**Action:** Consider replacing with × icon for consistency

---

## IMPLEMENTATION PLAN

### Phase 1: Reference Pattern (✅ COMPLETE)
- [x] amex-receipts.html - **DONE** (use as reference)

### Phase 2: High Traffic Pages (DO FIRST)
- [ ] **boh.html** - 7 EDIT buttons
- [ ] **foh-checklists.html** - 7 EDIT buttons
- [ ] **manager.html** - No EDIT buttons (only CLOSE standardization)

### Phase 3: Core Functionality (DO SECOND)
- [ ] **index.html** - 11 EDIT buttons
  - **NOTE:** User wants dynamic header done LAST on this file, but EDIT buttons can be updated now

### Phase 4: Specialized Pages (DO THIRD)
- [ ] **catering.html** - 4 EDIT buttons
- [ ] **cogs.html** - 1 EDIT button

### Phase 5: Test/Low Priority (DO LAST)
- [ ] **catering-test.html** - 4 EDIT buttons (mirror catering.html)

---

## CSS PATTERN TO REUSE

```css
.modal-edit-icon {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.modal-edit-icon:hover {
  background: var(--gray-200);
}

.modal-edit-icon svg {
  width: 18px;
  height: 18px;
  fill: var(--gray-700);
}
```

## SVG ICON TO REUSE

```html
<button class="modal-edit-icon" onclick="functionName()" title="Edit">
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
  </svg>
</button>
```

---

## NOTES

1. **Modal Headers:** Place edit icon in upper right of modal header, next to × close button
2. **Hide When Editing:** Add logic to hide edit icon when in edit mode (like amex-receipts.html)
3. **Remove Redundant Buttons:** If there's both an icon and text "EDIT" button, remove the text button
4. **Tab Buttons:** For tab navigation, replace text "EDIT" with icon but keep tab styling
5. **Console Logs:** Update console log messages after implementing icons
6. **Titles vs Buttons:** Don't replace text in modal titles (e.g., "EDIT ORDER") - only replace actual buttons

---

**Next Step:** Start with Phase 2 (boh.html and foh-checklists.html) to make biggest impact on daily-use pages.
