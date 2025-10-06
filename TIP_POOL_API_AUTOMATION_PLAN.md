# TIP POOL CALCULATOR - API AUTOMATION PLAN

**Date**: October 6, 2025
**Goal**: Replace manual file uploads with Toast/Homebase API calls to fully automate tip pool calculation

---

## CURRENT DATA FLOW ANALYSIS

### 1. PayrollExport CSV (Homebase) - Currently Manual Upload
**What it provides:**
- Employee names (format: "Last, First")
- Regular Hours per employee
- Overtime Hours per employee
- Total Pay per employee
- **Total Labor Cost** (sum of all Total Pay values)

**Example data structure:**
```
Employee,Regular Hours,Overtime Hours,Total Pay
"Cox, Bryan",25.3,0,450.75
"Uzum, Dilan",61.7,0,1234.56
...
```

**Used for:**
- Calculating each employee's total hours (Regular + Overtime)
- Computing tip pool distribution based on weighted hours
- Calculating **baseLaborCost** for labor percentage analysis

---

### 2. SalesSummary ZIP (Toast POS) - Currently Manual Upload
**Contains 2 CSV files:**

#### A. "Net sales summary.csv"
- **Net sales** total for the week

#### B. "Payments summary.csv"
- **Credit tips** (Credit/debit payment types with subtypes)
- **Cash sales** (Cash payment type amounts)

**Example Payments summary structure:**
```
Payment type,Payment sub type,Amount,Tips
Credit/debit,Visa,125.50,15.00
Credit/debit,Mastercard,89.30,10.50
Cash,,45.00,0
```

**Used for:**
- **creditTips**: Sum of all credit/debit tips
- **cashSales**: Sum of all cash payment amounts
- **netSales**: Total revenue for labor % calculation

---

### 3. User Manual Inputs (Still Required)
- **EZCater Tips**: External catering tips (not in Toast)
- **Real Envelope Deposit**: Physical cash deposit amount
- **Date Range**: Start and end dates for calculation
- **Calculated By Name**: Who ran the report

---

### 4. Already Automated via Toast API ✅
- **TDS Driver Tips**: Uses `toast-comprehensive-analysis.js` endpoint
  - Server GUID filtering: `5ffaae6f-4238-477d-979b-3da88d45b8e2`
  - Fetches ALL orders for date range
  - Filters by server
  - Calculates net tips (Gross - Voided - Refunded)
  - Expected accuracy: $481.83 weekly

---

## AUTOMATION PLAN

### PHASE 1: Toast API Integration (Sales Data)

#### Endpoint: `/api/toast-sales-summary` (NEW - TO CREATE)
**Purpose**: Replace SalesSummary ZIP upload

**What it should fetch:**
1. **Net Sales** for date range
   - Use existing Toast orders endpoint
   - Sum all `totalAmount` or use `/reports` endpoint

2. **Credit Tips** for date range
   - Use existing `toast-payments.js` logic
   - Filter for `type === 'CREDIT'` or `'CARD'`
   - Sum all `tipAmount` where `paymentStatus !== 'VOIDED'`

3. **Cash Sales** for date range
   - Use existing `toast-payments.js` endpoint
   - Already implemented: fetches all payments, filters CASH type
   - Sum all `amount` where `type === 'CASH'` and status not voided

**Implementation approach:**
```javascript
// New endpoint: /api/toast-sales-summary.js
export default async function handler(req, res) {
  const { startDate, endDate, token } = req.query;

  // Call existing toast-comprehensive-analysis for orders data
  // Extract net sales (sum of all order totalAmount values)

  // Call toast-payments for each business date in range
  // Aggregate credit tips and cash sales

  return res.json({
    netSales: totalNetSales,
    creditTips: totalCreditTips,
    cashSales: totalCashSales,
    dateRange: { start: startDate, end: endDate }
  });
}
```

---

### PHASE 2: Toast API Integration (Labor Data) - NO HOMEBASE NEEDED! ✅

#### Endpoint: `/api/toast-labor-summary` (NEW - TO CREATE)
**Purpose**: Replace PayrollExport CSV upload with Toast Labor API

**Toast Labor API Discovery:**
- ✅ Toast HAS labor/employee data in their API!
- Endpoint: `/labor/v1/timeEntries`
- Required scope: `labor:read` (should be in your 13 scopes)
- Additional scope for employee names: `labor.employees:read`

**What it should fetch:**

1. **Time Entries endpoint**: `GET /labor/v1/timeEntries`
   - Query params: `startDate`, `endDate` (up to 30 days range)
   - Optional: `includeMissedBreaks=true`
   - Returns: Time entry records for ALL employees

2. **Employees endpoint**: `GET /labor/v1/employees`
   - Returns: Employee names, IDs, job information

**TimeEntry Response Structure:**
```javascript
{
  guid: "employee-guid",
  inDate: "2025-09-29T10:00:00Z",
  outDate: "2025-09-29T18:00:00Z",
  regularHours: 7.5,         // Regular hours worked
  overtimeHours: 0.5,        // Overtime hours worked
  hourlyWage: 18.00,         // Employee hourly rate
  employeeReference: {
    guid: "employee-guid",
    entityType: "Employee"
  },
  jobReference: {
    guid: "job-guid",
    entityType: "Job"
  },
  breaks: [...]
}
```

**Data to extract:**
```javascript
{
  employees: [
    {
      employee: "Cox, Bryan",  // Format: "Last, First"
      first: "Bryan",
      last: "Cox",
      hours: 25.3,             // Sum of (regularHours + overtimeHours)
      totalPay: 450.75         // Sum of (regularHours * hourlyWage + overtimeHours * overtimeWage)
    },
    // ... more employees
  ],
  totalLaborCost: 8543.21  // Sum of all totalPay values
}
```

**Implementation approach:**
```javascript
// New endpoint: /api/toast-labor-summary.js
export default async function handler(req, res) {
  const { startDate, endDate, token } = req.query;

  // Step 1: Fetch all employees
  const employeesResponse = await fetch(
    `${toastApiUrl}/labor/v1/employees`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Toast-Restaurant-External-ID': restaurantId
      }
    }
  );
  const employees = await employeesResponse.json();

  // Step 2: Fetch time entries for date range
  const timeEntriesResponse = await fetch(
    `${toastApiUrl}/labor/v1/timeEntries?startDate=${startDate}&endDate=${endDate}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Toast-Restaurant-External-ID': restaurantId
      }
    }
  );
  const timeEntries = await timeEntriesResponse.json();

  // Step 3: Aggregate by employee
  const laborMap = {};

  timeEntries.forEach(entry => {
    const empGuid = entry.employeeReference.guid;
    const regHours = entry.regularHours || 0;
    const otHours = entry.overtimeHours || 0;
    const wage = entry.hourlyWage || 0;

    if (!laborMap[empGuid]) {
      laborMap[empGuid] = {
        hours: 0,
        totalPay: 0
      };
    }

    laborMap[empGuid].hours += regHours + otHours;
    // Calculate pay (overtime typically 1.5x)
    laborMap[empGuid].totalPay += (regHours * wage) + (otHours * wage * 1.5);
  });

  // Step 4: Match with employee names
  const result = [];
  let totalLaborCost = 0;

  employees.forEach(emp => {
    const labor = laborMap[emp.guid];
    if (labor) {
      result.push({
        employee: `${emp.lastName}, ${emp.firstName}`,
        first: emp.firstName,
        last: emp.lastName,
        hours: labor.hours,
        totalPay: labor.totalPay
      });
      totalLaborCost += labor.totalPay;
    }
  });

  result.totalLaborCost = totalLaborCost;

  return res.json(result);
}
```

**Toast API Authentication:**
- Uses same OAuth token as other Toast endpoints
- Already handled in frontend with `accessToken`
- Same `Toast-Restaurant-External-ID` header

---

## IMPLEMENTATION STRATEGY

### Step 1: Create Toast Sales Summary Endpoint
**File**: `/api/toast-sales-summary.js`

**Test with**:
- Start date: 2025-09-29
- End date: 2025-10-05
- Expected results from PDF:
  - Net sales: Should match "Net sales summary.csv" value
  - Credit tips: $2,675.93
  - Cash sales: $2,257.92

### Step 2: Create Toast Labor Summary Endpoint
**File**: `/api/toast-labor-summary.js`

**Test with**:
- Start date: 2025-09-29
- End date: 2025-10-05
- Expected results: 19 employees with hours and pay matching PayrollExport CSV
- **Required Toast API scopes**: `labor:read`, `labor.employees:read`

### Step 3: Update Frontend Tip Pool Calculator
**File**: `index.html` - `calculateTipPool()` function

**Changes needed:**
1. Add "Fetch from API" button next to file uploads
2. When clicked, call both new endpoints
3. Populate form with API data
4. Keep existing file upload as fallback
5. Show loading state while fetching

**Pseudo-code:**
```javascript
async function autoFetchTipPoolData() {
  showLoading('Fetching data from Toast and Homebase APIs...');

  const startDate = document.getElementById('tipPoolStartDate').value;
  const endDate = document.getElementById('tipPoolEndDate').value;

  // Fetch sales data from Toast
  const salesData = await fetch(`/api/toast-sales-summary?startDate=${startDate}&endDate=${endDate}&token=${accessToken}`);

  // Fetch labor data from Toast
  const laborData = await fetch(`/api/toast-labor-summary?startDate=${startDate}&endDate=${endDate}&token=${accessToken}`);

  // Populate form with fetched data
  // Store in same format as parsePayrollCSV() and parseSalesZip()

  // Enable calculation button
  hideLoading();
}
```

### Step 4: Testing Protocol
1. **Use real data from uploaded files as validation baseline**
   - PayrollExport_2025_09_29-2025_10_05.csv
   - SalesSummary_2025-09-29_2025-10-05.zip

2. **Compare API results vs file upload results**
   - Employee hours must match exactly
   - Labor cost must match exactly
   - Credit tips must match exactly
   - Cash sales must match exactly
   - Net sales must match exactly

3. **Test with both methods side by side**
   - Keep file upload functional
   - Add API fetch as alternative option
   - Allow users to verify API data before calculating

---

## USER EXPERIENCE FLOW (PROPOSED)

### Current Flow (Manual):
1. Select labor CSV file
2. Select sales ZIP file
3. Enter EZCater tips
4. Enter Real Envelope Deposit
5. Select date range
6. Click "Calculate Tip Pool"

### New Automated Flow:
1. Select date range
2. Click "Fetch Data from APIs" ← NEW BUTTON
3. System auto-fills:
   - Employee hours/pay (from Homebase)
   - Credit tips (from Toast)
   - Cash sales (from Toast)
   - Net sales (from Toast)
   - TDS Driver tips (already automated)
4. User manually enters ONLY:
   - EZCater tips
   - Real Envelope Deposit
5. Click "Calculate Tip Pool"

### Fallback Option:
- Keep file upload fields visible
- User can choose: "Fetch from API" OR "Upload Files"
- If API fails, user can still upload files manually

---

## SECURITY CONSIDERATIONS

### API Keys & Secrets:
- ✅ Toast access token already handled in frontend (expires regularly)
- ✅ Homebase API key stored in `HOMEBASE_API_KEY` environment variable
- ✅ Homebase location UUID stored in `HOMEBASE_LOCATION_UUID` environment variable
- ✅ homebase-proxy.js already injects UUID securely (no hardcoding)

### Rate Limiting:
- Toast payments endpoint adds 100ms delay every 10 requests
- Consider implementing similar for sales summary endpoint
- Homebase API rate limits unknown - test carefully

### Error Handling:
- Show clear error messages if API fails
- Allow fallback to manual file upload
- Don't break existing functionality

---

## SUCCESS CRITERIA

✅ **No manual file uploads required**
✅ **User only enters: EZCater tips + Real Envelope Deposit**
✅ **API data matches uploaded file data exactly**
✅ **Tip pool calculation works identically to current system**
✅ **Labor percentage calculation works with API data**
✅ **All 19 employees appear in results**
✅ **Combined Weekly Report PDF generates correctly**
✅ **Fallback to manual upload still available**

---

## NEXT STEPS

1. **Create `/api/toast-sales-summary.js` endpoint**
   - Aggregate net sales, credit tips, cash sales for date range
   - Test with real data from 9/29-10/5

2. **Create `/api/homebase-labor-summary.js` endpoint**
   - Fetch timesheets and employee data
   - Format output to match parsePayrollCSV() structure

3. **Update frontend with "Fetch from API" button**
   - Call both endpoints when clicked
   - Populate form with data
   - Keep file upload as fallback

4. **Testing with real data**
   - Compare API results vs uploaded file results
   - Verify tip pool calculation matches exactly
   - Verify labor % calculation matches exactly

5. **Deploy and monitor**
   - Test in production with multiple weeks of data
   - Monitor API performance and errors
   - Gather user feedback

---

**STATUS**: Ready to implement
**PRIORITY**: High - will save significant manual work
**ESTIMATED TIME**: 4-6 hours for full implementation + testing

