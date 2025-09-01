# PM Math Flow & Calculation Logic Analysis (v2.52)

## Overview
This document provides a comprehensive analysis of the PM (Post-Meridiem/Evening) cash count mathematical calculations and business logic in the Jayna Cash Counter application v2.52.

## Core Function: `calculatePMAmounts(data)`

### Input Parameters
The function receives a `data` object containing:
- `amTotal`: Morning cash count total
- `total` (pmTotal): Evening cash count total
- `toastSales`: Toast POS sales amount reported by staff
- `cashTips`: Cash tips amount reported by staff

### Step-by-Step Calculation Logic

#### 1. Basic Calculations
```javascript
const amTotal = data.amTotal;           // Morning drawer total
const pmTotal = data.total;             // Evening drawer total
const toastSales = data.toastSales;     // POS sales amount
const cashTips = data.cashTips;         // Tips amount
```

#### 2. Drawer Change Calculation
```javascript
const drawerChange = pmTotal - amTotal;
const actualCashIn = drawerChange;
```
**Purpose**: Determines how much cash actually came into the drawer during the day.

#### 3. Discrepancy Analysis
```javascript
const discrepancy = actualCashIn - toastSales;
```
**Logic**:
- `discrepancy > 0`: **OVERAGE** - More cash than expected (good situation)
- `discrepancy < 0`: **SHORTAGE** - Less cash than expected (problematic)
- `discrepancy = 0`: **PERFECT** - Exact match

#### 4. Tip Adjustment Logic (Critical Business Rule)
```javascript
let tipAdjustment = 0;
let finalCashTips = cashTips;

if (discrepancy < 0) {
    // SHORTAGE: Remove from tips to cover exact restaurant amount
    tipAdjustment = Math.abs(discrepancy);
    finalCashTips = cashTips - tipAdjustment;
}
// If overage (discrepancy > 0), tips stay the same, overage goes to cashbox
```

**Business Logic**:
- **When SHORT**: Tips are reduced to ensure restaurant gets exact sales amount
- **When OVER**: Tips remain unchanged, excess goes to cashbox
- **When PERFECT**: Tips remain unchanged

#### 5. Final Tips Processing
```javascript
const adjustedTips = Math.floor(finalCashTips);
```
**Rule**: Staff tips are ALWAYS rounded DOWN to whole dollars (no cents for tips)

#### 6. Deposit Amount Calculation
```javascript
const depositAmount = toastSales + cashTips;
```
**Important**: This uses the ORIGINAL cashTips amount (what staff reported), not the adjusted amount.

#### 7. Return Amount Calculation
```javascript
let returnAmount = amTotal;
if (discrepancy > 0) {
    // Add overage to cashbox
    returnAmount += discrepancy;
} else if (discrepancy < 0) {
    // Add any decimal remainder from tip adjustment back to cashbox
    const tipRemainder = finalCashTips - adjustedTips;
    returnAmount += tipRemainder;
}
```

**Logic**:
- Start with morning total (baseline cash to return)
- **If OVERAGE**: Add the extra cash to return amount
- **If SHORTAGE**: Add any decimal remainder from tip flooring to return amount

## PM Success Screen Display Logic

### Function: `showPMSuccess(depositAmount, returnAmount, discrepancy)`
```javascript
document.getElementById('depositAmount').textContent = `$${Math.round(depositAmount)}`;
document.getElementById('returnAmount').textContent = `$${returnAmount.toFixed(2)}`;
```

**Critical Discrepancy**: 
- The calculation returns `depositAmount = toastSales + cashTips` (exact amount)
- The display shows `Math.round(depositAmount)` (rounded to nearest dollar)
- **This creates a mismatch between calculated and displayed amounts!**

## Database Storage

### Function: `storePMData(data, calculations)`
The following calculated values are stored:
- `pm_discrepancy`: calculations.discrepancy
- `pm_adjusted_tips`: calculations.adjustedTips
- `pm_deposit_amount`: calculations.depositAmount (EXACT amount, not rounded)
- `pm_amount_to_keep`: calculations.returnAmount

## Mathematical Examples (Real Business Scenarios)

### Example 1: Shortage Day with Decimal Tips
**Manager Breakdown:**
- STARTING CASH TOTAL: $100.00
- ENDING CASH TOTAL: $204.90
- ACTUAL CASH IN: $104.90
- CASH SALES REPORTED BY TOAST: $105.80
- CASH TIPS REPORTED BY STAFF: $30.00
- DRAWERS VS TOAST DISCREPANCY: -$0.90 (SHORTAGE)

**Code Calculations:**
- drawerChange = $204.90 - $100.00 = $104.90
- actualCashIn = $104.90
- discrepancy = $104.90 - $105.80 = -$0.90 (SHORTAGE)
- tipAdjustment = $0.90 (to cover shortage)
- finalCashTips = $30.00 - $0.90 = $29.10
- adjustedTips = floor($29.10) = $29 ⭐ **FINAL CASH TIPS FOR STAFF: $29**
- depositAmount = $105.80 + $30.00 = $135.80
- tipRemainder = $29.10 - $29 = $0.10
- returnAmount = $100.00 + $0.10 = $100.10 ⭐ **RETURNED TO CASH BOX ($0.10) + AM TOTAL**

### Example 2: Overage Day with Whole Dollar Tips
**Manager Breakdown:**
- STARTING CASH TOTAL: $100.00
- ENDING CASH TOTAL: $204.90
- ACTUAL CASH IN: $104.90
- CASH SALES REPORTED BY TOAST: $102.80
- CASH TIPS REPORTED BY STAFF: $30.00
- DRAWERS VS TOAST DISCREPANCY: +$2.10 (OVERAGE)

**Code Calculations:**
- drawerChange = $204.90 - $100.00 = $104.90
- actualCashIn = $104.90
- discrepancy = $104.90 - $102.80 = +$2.10 (OVERAGE)
- tipAdjustment = 0 (no shortage)
- finalCashTips = $30.00 (unchanged)
- adjustedTips = floor($30.00) = $30 ⭐ **FINAL CASH TIPS FOR STAFF: $30**
- depositAmount = $102.80 + $30.00 = $132.80
- returnAmount = $100.00 + $2.10 = $102.10 ⭐ **RETURNED TO CASH BOX ($2.10) + AM TOTAL**

### Example 3: Shortage + Deposit Rounding Strategy
**New Business Scenario:**
- TOAST CASH SALES: $205.85
- ACTUAL CASH IN: $204.85
- CASH TIPS: $20.00
- DISCREPANCY: -$1.00 (SHORTAGE)

**Current Code Logic (Exact Deposit + Shortage Adjustment):**
- depositAmount = $205.85 + $20.00 = $225.85 (exact)
- tipAdjustment = $1.00 (for shortage)
- finalCashTips = $20.00 - $1.00 = $19.00
- adjustedTips = floor($19.00) = $19
- Staff deposits: $225.85 (with cents)
- Staff gets: $19 in tips
- Display shows: $226 (rounded) ← **INCONSISTENCY**

**Proposed Logic (Rounded Deposit + Whole Dollar Tip Adjustments):**
1. **Calculate Raw Deposit**: $205.85 + $20.00 = $225.85
2. **Round Deposit**: $225.85 → $226.00 (staff deposits whole dollars)
3. **Rounding Adjustment Needed**: $226.00 - $225.85 = $0.15
4. **Take Whole Dollar for Rounding**: Take $1.00 from tips (not $0.15)
5. **Rounding Excess to Cashbox**: $1.00 - $0.15 = $0.85
6. **Shortage Adjustment**: Take another $1.00 from tips for shortage
7. **Final Calculations**:
   - Staff deposits: $226.00 (whole dollars only)
   - Staff gets: $20.00 - $1.00 - $1.00 = $18.00 in tips
   - Cashbox gets: AM Total + $0.85 (rounding excess)
   - Restaurant gets: Exact $205.85 (shortage covered)

**Benefits of Proposed Logic:**
✅ Staff always deposits whole dollar amounts (easier handling)
✅ Staff always gets whole dollar tips (no cents)
✅ Rounding excess goes to business (cashbox)
✅ All adjustments use whole dollar amounts
✅ Display matches actual deposit amount
✅ Mathematical consistency throughout system

### Key Business Questions:
1. **Staff Impact**: Is it fair to take more from tips than necessary?
2. **Cash Handling**: Are whole dollar amounts easier to manage?
3. **Business Priority**: Should excess tip deductions benefit the business?
4. **Simplicity**: Is easier calculation worth the trade-off?

### 🤔 **Business Decision Needed: Deposit Rounding + Whole Dollar Logic**

**Core Issue**: Currently deposit amounts are displayed rounded but calculated exactly, creating mathematical inconsistency.

**Proposed Solution**: 
1. **Round deposit amounts to whole dollars** (easier for staff)
2. **Use whole dollar tip adjustments** for any needed amounts
3. **Send excess adjustments to cashbox** (business keeps the difference)

**Implementation Logic**:
```javascript
// Step 1: Calculate raw deposit
const rawDepositAmount = toastSales + cashTips;

// Step 2: Round deposit to whole dollars
const depositAmount = Math.round(rawDepositAmount);

// Step 3: Calculate rounding adjustment needed
const depositRoundingAdjustment = depositAmount - rawDepositAmount;

// Step 4: If rounding adjustment needed, take whole dollars from tips
let depositTipAdjustment = 0;
let depositExcessToCashbox = 0;
if (depositRoundingAdjustment > 0) {
    depositTipAdjustment = Math.ceil(depositRoundingAdjustment); // Take whole dollar
    depositExcessToCashbox = depositTipAdjustment - depositRoundingAdjustment;
}

// Step 5: Apply all adjustments
finalCashTips = cashTips - shortageAdjustment - depositTipAdjustment;
returnAmount = amTotal + overage + tipDecimals + depositExcessToCashbox;
```

**Benefits**:
- Staff deposits whole dollars only
- Display matches actual amounts
- Mathematical consistency
- Business keeps rounding excess
- Simpler cash handling

## Critical Issues Identified

### Issue 1: Deposit Amount Rounding Inconsistency ⚠️ **MAJOR ISSUE**
- **Calculation**: Returns exact amount (e.g., $135.80)
- **Display**: Shows rounded amount (e.g., $136) via `Math.round()`
- **Storage**: Stores exact amount (e.g., $135.80)
- **Problem**: Staff sees rounded amount on screen but system processes exact amount

### Issue 2: Missing Rounding Adjustment Logic in Current Code
The current system does NOT account for deposit rounding adjustments. The examples show that:
- **What staff should deposit**: Toast Sales + Original Tips (exact cents)
- **What staff sees on screen**: Rounded deposit amount 
- **Where rounding difference goes**: Currently NOWHERE (mathematical error)

### Issue 3: Decimal Remainder Logic Works Correctly ✅
The tip decimal remainder logic is working perfectly:
- Tips are floored to whole dollars
- Decimal remainders correctly go to cashbox
- This matches the business examples provided

### Issue 4: Report Generation Will Show Inconsistent Values
Reports may show different deposit amounts depending on whether they use:
- Stored database values ($135.80 - exact)
- Display logic ($136 - rounded)
- No current logic handles the $0.20 difference

## Recommendations

### ⭐ **RECOMMENDED: Option 2 - Implement Proper Rounding Logic**
Based on the business examples, the correct behavior should be:

1. **Modify `calculatePMAmounts()` to handle deposit rounding**:
   ```javascript
   // Current: depositAmount = toastSales + cashTips (exact)
   // Should be: 
   const rawDepositAmount = toastSales + cashTips;
   const depositAmount = Math.round(rawDepositAmount);
   const depositRoundingAdjustment = rawDepositAmount - depositAmount;
   // Add depositRoundingAdjustment to returnAmount
   ```

2. **Business Logic Alignment**:
   - Staff deposits rounded dollar amounts (easier to handle)
   - Rounding adjustments go to cashbox (maintains balance)
   - All displays show consistent rounded amounts
   - Database stores rounded amounts

### Alternative: Option 1 - Keep Exact Amounts Everywhere
- Remove `Math.round()` from PM success screen display
- Staff deposits exact cent amounts (e.g., $135.80)
- Maintain current mathematical precision
- Simpler implementation, no rounding logic needed

### Option 3: Clarify Business Rules
- Determine if the business examples represent the intended behavior
- Document whether deposits should be exact cents or rounded dollars
- Ensure all stakeholders agree on the approach

## Current State Summary

The v2.52 system has a mathematical inconsistency in deposit handling:

### ✅ **Working Correctly:**
1. Tip decimal remainder logic (floors tips, sends remainders to cashbox)
2. Shortage/overage calculations (adjusts tips for shortages, sends overages to cashbox)  
3. Basic cash flow calculations (drawer change, discrepancies)

### ❌ **Critical Issue:**
1. **Deposit Rounding Mismatch**: 
   - Calculations: Store exact amounts ($135.80)
   - Display: Shows rounded amounts ($136)
   - Missing Logic: No handling for the $0.20 difference
   - Result: Mathematical imbalance in the system

### 📊 **Impact on Reports:**
- Single-day reports may show $135.80 (stored) vs $136 (calculated with rounding)
- Multi-day reports will have inconsistent totals
- Email reports may vary depending on data source

### 🎯 **Root Cause:**
The PM success screen applies `Math.round()` to display deposit amounts, but the underlying calculation and storage systems don't account for this rounding, creating a mathematical discrepancy that propagates through the entire system.

### 💡 **Business Logic Verification:**
The provided examples confirm that the tip flooring and cashbox remainder logic is working exactly as intended. The only issue is the deposit amount rounding inconsistency between what staff sees and what the system processes.
