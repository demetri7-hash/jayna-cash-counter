# Toast API Tip Pool Automation - Testing Guide

**Date**: October 6, 2025
**Status**: ✅ Implementation Complete - Ready for Testing

---

## What Was Built

### 1. Two New API Endpoints

**`/api/toast-sales-summary.js`**
- Fetches payment data from Toast for date range
- Extracts: Net Sales, Credit Tips, Cash Sales
- Processes all business dates in range
- Skips voided payments

**`/api/toast-labor-summary.js`**
- Fetches time entries from Toast Labor API
- Fetches employee names from Toast
- Calculates hours (regular + overtime)
- Calculates pay (OT at 1.5x rate)
- Returns data matching PayrollExport CSV format

### 2. Frontend "Fetch from API" Button
- Located in Tip Pool Calculator section
- Blue button below file upload fields
- Fetches both labor and sales data automatically
- Shows success message with data summary

---

## How to Test

### Step 1: Navigate to Tip Pool Calculator
1. Go to https://jayna-cash-counter.vercel.app
2. Click "Tip Pool Calculator" button

### Step 2: Select Date Range
1. **Start Date**: 2025-09-29
2. **End Date**: 2025-10-05
3. This is the test period we have validation data for

### Step 3: Click "Fetch Data from Toast API"
1. Click the blue button that says "FETCH DATA FROM TOAST API"
2. Wait for loading message
3. Should see success message with:
   - Number of employees
   - Total labor cost
   - Credit tips amount
   - Cash sales amount
   - Net sales amount

### Step 4: Verify Fetched Data
Compare API results with your validation files:

**Expected Labor Data** (from PayrollExport CSV):
- Should show 19 employees
- Total labor cost should match CSV total

**Expected Sales Data** (from SalesSummary ZIP):
- Credit tips: ~$2,675.93
- Cash sales: ~$2,257.92
- Net sales: Check against "Net sales summary.csv"

### Step 5: Complete Calculation
1. Enter **EZCater Tips**: $80.86 (from your test data)
2. Enter **Real Envelope Deposit**: $2,471.00 (from your test data)
3. Enter **Calculated By Name**: Your name
4. Click **"Calculate Tip Pool"**

### Step 6: Verify Results
1. Should see tip pool distribution table
2. All 19 employees should be listed
3. Total tips should match expected value
4. Hourly rate should calculate correctly
5. Labor percentage should show in report

---

## Expected Results

### API-Fetched Data Should Match:
✅ **Labor (19 employees)**:
- Ahmet Guler
- Aidan Reddy
- Aykut Kirac
- Bryan Cox
- Christian Ahkiong
- Demetri Gregorakis
- Demetri Papamichalis
- Dilan Uzum
- Dimas Hernandez
- Emilio Morales
- Erin Best
- Evan Inouye
- Gemma Pierce-Pique
- Humberto Maldonado Galllardo
- Huseyin Dokcu
- Kayla McCullough
- Laurence Lee
- Uriel Reyes-Sanchez
- Zilan Avci

✅ **Sales Data**:
- Credit Tips: $2,675.93
- Cash Sales: $2,257.92
- Net Sales: (from Toast)

✅ **Final Calculation**:
- Should match exactly with file upload method
- Labor percentage calculation should work
- Combined Weekly Report PDF should generate

---

## Troubleshooting

### If API Fetch Fails:

**Check Console Logs:**
- Open browser console (F12)
- Look for error messages
- Check network tab for API calls

**Common Issues:**

1. **"Labor API failed"** or **"Sales API failed"**
   - Check Toast API token is valid
   - Verify you have `labor:read` and `labor.employees:read` scopes
   - Check date format (YYYY-MM-DD)

2. **"Toast API access token not available"**
   - Make sure you're logged into Toast
   - Refresh the page
   - Check accessToken in localStorage

3. **No employees returned**
   - Check date range is correct
   - Verify employees worked during that period
   - Check Toast Labor API permissions

4. **Wrong amounts**
   - Compare with uploaded file results
   - Check for voided/refunded payments
   - Verify date range matches exactly

### Fallback to Files:
If API doesn't work, you can still:
1. Upload PayrollExport CSV manually
2. Upload SalesSummary ZIP manually
3. Calculate tip pool as before

---

## Success Criteria

✅ **API fetch completes without errors**
✅ **19 employees returned with hours and pay**
✅ **Sales data matches uploaded file data**
✅ **Tip pool calculation works identically**
✅ **Labor percentage shows correctly**
✅ **Combined Weekly Report PDF generates**
✅ **All employee names appear in PDF**

---

## What to Report Back

### ✅ If It Works:
- "API fetch successful!"
- Confirm employee count
- Confirm sales amounts match
- Confirm tip pool calculation matches file upload method

### ❌ If It Fails:
- Screenshot of error message
- Console log errors
- Which endpoint failed (labor or sales)
- Any network errors in browser DevTools

---

## Next Steps After Testing

### If Successful:
1. Use API method going forward (no more file uploads!)
2. Monitor for any discrepancies
3. Report any calculation differences

### If Issues Found:
1. Report errors with details
2. Fall back to file upload method
3. I'll fix API endpoints based on feedback

---

## Notes

- **Required Toast Scopes**: `labor:read`, `labor.employees:read`, `orders:read`, `payments:read`
- **Date Range Limit**: 30 days (Toast Labor API limit)
- **Tip Pool Limit**: 7 days (existing business logic)
- **File Upload**: Still available as fallback
- **TDS Driver Tips**: Already automated, continues to work

---

**Ready to test!** 🚀

Let me know how it goes!
