# TDS Driver Analysis - Comprehensive vs Current Implementation

## Problem Statement
- **Expected TDS Driver Tips**: $481.83 (from comprehensive analysis)
- **Current TDS Driver Tips**: $509.30 (from index.html auto-fetch)
- **Discrepancy**: $27.47 difference

## Root Cause Analysis

### Comprehensive Analysis Method (✅ WORKING - Gets $481.83)
**File**: `api/toast-comprehensive-analysis.js`
**Approach**: 
1. Fetch ALL orders for date range (not delivery-filtered)
2. Process every order and extract tips
3. Track tips by server GUID: `5ffaae6f-4238-477d-979b-3da88d45b8e2`
4. Calculate NET tips (gross - voided - refunded)
5. Return server-specific tips

**Key Logic**:
```javascript
// Get ALL orders for date range
for (const date of dateRange) {
  const ordersUrl = `${TOAST_CONFIG.baseUrl}/orders/v2/ordersBulk?businessDate=${businessDate}&page=${page}&pageSize=${pageSize}`;
  // No delivery filtering at API level
}

// Process each order
allOrders.forEach((order, index) => {
  // Calculate tips with void/refund tracking
  if (order.checks && Array.isArray(order.checks)) {
    order.checks.forEach(check => {
      if (check.payments && Array.isArray(check.payments)) {
        check.payments.forEach(payment => {
          const tipAmount = payment.tipAmount || 0;
          
          if (tipAmount > 0) {
            if (payment.refundStatus === 'FULL' || payment.refundStatus === 'PARTIAL') {
              orderData.tips.refundedTips += tipAmount;
            } else if (payment.voided || payment.paymentStatus === 'VOIDED') {
              orderData.tips.voidedTips += tipAmount;
            } else {
              orderData.tips.paymentTips += tipAmount;
            }
          }
        });
      }
    });
  }
  
  // Track by server GUID
  trackField('byServerGuid', orderData.server.guid, orderData.tips.total);
});

// Result for server GUID 5ffaae6f-4238-477d-979b-3da88d45b8e2:
// - Gross: $481.83
// - Net: $478.36 (after $3.47 voided)
```

### Current Implementation Method (❌ INCORRECT - Gets $509.30)
**File**: `api/toast-delivery-analysis.js` called from `index.html`
**Approach**:
1. Fetch orders using delivery-specific filtering
2. Filter orders by server GUID: `5ffaae6f-4238-477d-979b-3da88d45b8e2`
3. Apply additional delivery detection logic
4. Extract tips from filtered orders

**Key Issues**:
1. **Pre-filtering for delivery orders** may exclude valid TDS orders
2. **Complex delivery detection logic** may include/exclude wrong orders
3. **Different tip calculation method** from comprehensive analysis

## Solution Implementation

### Step 1: Create TDS-Specific API Endpoint
Create `api/toast-tds-driver-tips.js` that uses the EXACT comprehensive analysis method but filtered for the specific server GUID.

### Step 2: Modify Index.html Auto-Fetch
Replace the current `autoFetchTdsDriverTips()` function to call the new TDS-specific endpoint.

### Step 3: Key Differences to Address
1. **No delivery filtering** - get ALL orders like comprehensive analysis
2. **Direct server GUID filtering** - only process orders from `5ffaae6f-4238-477d-979b-3da88d45b8e2`
3. **Exact tip calculation** - use the same void/refund logic as comprehensive analysis
4. **Net tips calculation** - subtract voided and refunded tips

## Expected Results
- **Input**: Date range 2025-09-22 to 2025-09-28
- **Expected Output**: $481.83 (gross) or $478.36 (net after voids)
- **Server GUID**: `5ffaae6f-4238-477d-979b-3da88d45b8e2`
- **Order Count**: ~537 orders

## Implementation Notes
- Use the EXACT same order fetching logic as comprehensive analysis
- Use the EXACT same tip calculation logic as comprehensive analysis  
- Filter by server GUID after fetching, not before
- Return NET tips (gross - voided - refunded) for accuracy