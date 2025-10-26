# Toast BEO Implementation Guide

**Created:** October 26, 2025
**Purpose:** Complete implementation of Toast BEO (Banquet Event Order) fields in catering system

---

## 🎯 Problem Statement

The custom catering system was missing critical fields shown on Toast BEO sheets:

### Missing Fields:
- ❌ **Sequential Order Number** - Showing `T-2777EAC2` (GUID) instead of `000098` (sequential)
- ❌ **Check Number** - Not displayed
- ❌ **Payment Status** - Missing "Paid" indicator
- ❌ **Utensils** - Yes/No field not shown
- ❌ **Financial Breakdown**:
  - Subtotal ($960.25)
  - Tip ($60.00)
  - Tax ($81.39)
  - Delivery Fee ($30.00)
- ❌ **Created Timestamp** - Order creation date/time
- ❌ **Guest Count** - Shown as headcount, not formatted like BEO

---

## 🔍 Toast API Research Findings

### ✅ Available in Toast Orders API:
- `order.numberOfGuests` - Guest count
- `check.displayNumber` - Check number
- `check.paymentStatus` - "OPEN", "PAID", or "CLOSED"
- `check.paidDate` - Payment timestamp
- `check.amount` - **Subtotal** (before tax)
- `check.taxAmount` - **Tax**
- `check.totalAmount` - **Grand total**
- `payment.tipAmount` - **Tip** (in payments array)
- `order.createdDate` - Order creation timestamp

### ❌ NOT Available in Toast API:
- **Sequential BEO Order Number** (000098) - Toast internal only, not exposed via API
- **Utensils field** - Not in Toast schema
- **Delivery fee** as separate field - Must extract from selections

### 💡 Solution:
1. Generate our own sequential order numbers (000001, 000002, etc.)
2. Extract all financial data from checks/payments arrays
3. Parse delivery fees from line items
4. Default utensils to `true` for all catering orders

---

## 📦 Implementation Steps

### Step 1: Database Schema Update

**File:** `sql/add_beo_fields_to_catering_orders.sql`

**New columns added:**
```sql
- sequential_order_number INTEGER (auto-incrementing)
- check_number VARCHAR(50)
- payment_status VARCHAR(20)
- paid_date TIMESTAMP WITH TIME ZONE
- subtotal DECIMAL(10, 2)
- tax DECIMAL(10, 2)
- tip DECIMAL(10, 2)
- delivery_fee DECIMAL(10, 2)
- utensils_required BOOLEAN DEFAULT false
- created_in_toast_at TIMESTAMP WITH TIME ZONE
```

**Auto-numbering system:**
- Created sequence: `catering_order_sequential_seq`
- Trigger: `assign_sequential_order_number()` - Runs on INSERT
- Backfill: Assigns sequential numbers to existing orders by `created_at` date

**Run this SQL in Supabase:**
1. Go to SQL Editor in Supabase dashboard
2. Copy contents of `sql/add_beo_fields_to_catering_orders.sql`
3. Run the migration
4. Verify success messages

---

### Step 2: Toast API Extraction Update

**File:** `api/toast-catering-orders.js`

**Changes made:**

1. **Financial Breakdown Extraction** (lines 270-314):
```javascript
// Extract from checks array:
- subtotal (check.amount)
- tax (check.taxAmount)
- total (check.totalAmount)
- checkNumber (check.displayNumber)
- paymentStatus (check.paymentStatus)
- paidDate (check.paidDate or payment.paidDate)

// Extract from payments array:
- tip (payment.tipAmount)

// Extract from selections array:
- deliveryFee (search for "delivery" or "in house delivery" items)
```

2. **BEO Fields Added to Response** (lines 341-350):
```javascript
check_number: checkNumber,
payment_status: paymentStatus,
paid_date: paidDate,
subtotal: subtotal,
tax: tax,
tip: tip,
delivery_fee: deliveryFee,
utensils_required: true, // Default for catering
created_in_toast_at: order.createdDate || order.openedDate
```

3. **Database Save Updated** (lines 386-395):
All new BEO fields now saved to database on sync.

---

### Step 3: UI Updates (catering.html)

**TODO - Next Steps:**

#### Order Header Section:
```javascript
// BEFORE:
Order #T-2777EAC2

// AFTER:
Order #000098 • Check #1 • CONFIRMED • PAID
```

#### Customer Info Section:
```javascript
// ADD:
Guest count: 50
Utensils: Yes
```

#### Financial Breakdown Section (NEW):
```html
<div class="financial-breakdown">
  <div class="breakdown-row">
    <span>Subtotal:</span>
    <span>$960.25</span>
  </div>
  <div class="breakdown-row">
    <span>Delivery Fee:</span>
    <span>$30.00</span>
  </div>
  <div class="breakdown-row">
    <span>Tax:</span>
    <span>$81.39</span>
  </div>
  <div class="breakdown-row">
    <span>Tip:</span>
    <span>$60.00</span>
  </div>
  <div class="breakdown-row total">
    <span>TOTAL:</span>
    <span>$1,101.64</span>
  </div>
</div>
```

#### Order Footer:
```javascript
// ADD:
Created: 10/26/25, 10:42 AM PST
```

---

### Step 4: PDF Prep List Update

**File:** `catering.html` (prep list PDF generation)

**Changes needed:**

```javascript
// BEFORE:
ORDER #T-2777EAC2

// AFTER:
ORDER #000098
Check #1
Katie Dryden
DELIVERY: Wed, Oct 29 at 11:30 AM
HEADCOUNT: 50 guests • UTENSILS: Yes
```

**Look for:**
- `generatePrepListPDF()` function
- `order.order_number` references
- Update to use `sequential_order_number`

---

### Step 5: Email Template Update

**File:** Email sending functions in `catering.html`

**Add BEO fields to email body:**
```javascript
Order #${order.sequential_order_number}
Check #${order.check_number}
Status: ${order.payment_status}
Guest Count: ${order.headcount}
Utensils: ${order.utensils_required ? 'Yes' : 'No'}

Financial Breakdown:
- Subtotal: $${order.subtotal.toFixed(2)}
- Delivery Fee: $${order.delivery_fee.toFixed(2)}
- Tax: $${order.tax.toFixed(2)}
- Tip: $${order.tip.toFixed(2)}
- TOTAL: $${order.total_amount.toFixed(2)}

Created: ${formatDate(order.created_in_toast_at)}
```

---

## 🚀 Deployment Steps

### 1. Run SQL Migration
```sql
-- In Supabase SQL Editor:
-- Copy/paste contents of sql/add_beo_fields_to_catering_orders.sql
-- Execute and verify success messages
```

### 2. Deploy Backend Changes
```bash
git add api/toast-catering-orders.js sql/add_beo_fields_to_catering_orders.sql
git commit -m "feat(catering): Extract complete BEO financial breakdown from Toast API

- Add 10 new database fields: sequential_order_number, check_number, payment_status, paid_date, subtotal, tax, tip, delivery_fee, utensils_required, created_in_toast_at
- Implement auto-incrementing sequential order numbers (000001, 000002...)
- Extract financial breakdown from Toast checks/payments arrays
- Parse delivery fees from selections
- Backfill existing orders with sequential numbers"

git push origin main
```

Wait 1-2 minutes for Vercel deployment.

### 3. Re-sync Toast Orders

After deployment:
1. Go to https://jayna-cash-counter.vercel.app/catering.html
2. Click **Sync Toast Orders**
3. Verify new fields populate correctly
4. Check sequential order numbers start at 000001

---

## 🧪 Testing Checklist

### Database Verification:
- [ ] Sequential order numbers assigned (000001, 000002, ...)
- [ ] Check numbers populated
- [ ] Payment status shows "PAID" or "OPEN"
- [ ] Subtotal, tax, tip, delivery fee all non-zero
- [ ] Utensils required defaults to `true`
- [ ] Created timestamp populated

### UI Verification (after UI updates):
- [ ] Order header shows: "Order #000098 • Check #1 • PAID"
- [ ] Guest count displayed in header
- [ ] Financial breakdown section visible
- [ ] Subtotal + delivery + tax + tip = total
- [ ] All amounts formatted with $ and 2 decimals
- [ ] Created timestamp shown in footer

### PDF Verification:
- [ ] Prep list shows "ORDER #000098" (not GUID)
- [ ] Check number displayed
- [ ] All BEO fields present

### Email Verification:
- [ ] Email includes all BEO fields
- [ ] Financial breakdown formatted correctly
- [ ] Sequential order number used (not GUID)

---

## 📊 Field Mapping Reference

| BEO Sheet Field | Toast API Field | Database Column | Notes |
|-----------------|-----------------|-----------------|-------|
| Order #000098 | *N/A* | `sequential_order_number` | Auto-generated sequence |
| Check #1 | `check.displayNumber` | `check_number` | From first check |
| PAID status | `check.paymentStatus` | `payment_status` | "OPEN", "PAID", "CLOSED" |
| Guest count | `order.numberOfGuests` | `headcount` | Already exists |
| Utensils | *N/A* | `utensils_required` | Default `true` |
| Subtotal | `check.amount` | `subtotal` | Before tax |
| In House Delivery | `selection.price` | `delivery_fee` | Parsed from items |
| Tax | `check.taxAmount` | `tax` | Tax total |
| Tip | `payment.tipAmount` | `tip` | From payments array |
| Total | `check.totalAmount` | `total_amount` | Grand total |
| Created date | `order.createdDate` | `created_in_toast_at` | Order creation |

---

## 🔧 Troubleshooting

### Sequential Numbers Not Incrementing:
```sql
-- Check sequence value:
SELECT last_value FROM catering_order_sequential_seq;

-- Reset sequence (if needed):
SELECT setval('catering_order_sequential_seq',
  (SELECT COALESCE(MAX(sequential_order_number), 0) + 1 FROM catering_orders));
```

### Missing Financial Data:
- Check Toast API logs in Vercel for extraction errors
- Verify checks array has `amount`, `taxAmount`, `totalAmount`
- Verify payments array has `tipAmount`

### Delivery Fee Not Extracting:
- Check selection item names contain "delivery" (case-insensitive)
- Add additional keywords if needed: "service fee", "in house"

---

## 📝 Next Steps

1. **Run SQL migration** in Supabase
2. **Deploy backend changes** via git push
3. **Update UI** to display all BEO fields (catering.html)
4. **Update PDF** generation to use sequential numbers
5. **Update email** templates with BEO fields
6. **Test end-to-end** with real Toast order

---

## 🎉 Expected Result

**BEFORE:**
```
ORDER T-2777EAC2
Katie Dryden
DELIVERY - CONFIRMED
```

**AFTER:**
```
ORDER #000098 • CHECK #1 • CONFIRMED • PAID
Katie Dryden
DELIVERY: Wednesday, October 29, 2025 @ 11:30 AM
GUEST COUNT: 50 • UTENSILS: Yes

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FINANCIAL BREAKDOWN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Subtotal.................. $960.25
In House Delivery......... $30.00
Tax....................... $81.39
Tip....................... $60.00
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOTAL..................... $1,101.64

Created: 10/26/25, 10:42 AM PST
```

---

**End of Implementation Guide**
