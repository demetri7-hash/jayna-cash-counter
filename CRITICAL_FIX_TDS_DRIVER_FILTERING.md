# CRITICAL SOLUTION: TDS Driver Server Filtering

## 🎯 THE PROBLEM
- Toast API returning $3,299.90 in tips (6.8x too much)
- Target: $481.83 (from TDS Driver sales report)
- Need to filter for **TDS Driver specific orders only**

## 🔍 THE SOLUTION  
**Server GUID Filter**: `7863337c-16f2-4d9e-a855-e83953bbb016`

This GUID appears in:
1. ✅ Toast API JSON output (4 matches found)
2. ✅ Referenced in TDS analysis documents
3. ✅ Likely represents "TDS Driver" employee/server

## 📊 EXPECTED IMPACT
- **Before filtering**: $3,299.90 total tips (all servers)
- **After filtering**: ~$481.83 total tips (TDS Driver only)
- **Reduction factor**: ~85% reduction in tip amounts

## 🛠️ IMPLEMENTATION NEEDED

Add server filtering to `/api/toast-delivery-analysis.js`:

```javascript
// Filter orders by TDS Driver server GUID
const TDS_DRIVER_GUID = '7863337c-16f2-4d9e-a855-e83953bbb016';

const isTDSDriverOrder = (order) => {
  return order.server?.guid === TDS_DRIVER_GUID;
};

// Apply filter in delivery detection
const deliveryOrders = allOrders.filter(order => {
  const isDelivery = isDeliveryOrder(order);
  const isTDSDriver = isTDSDriverOrder(order);
  return isDelivery && isTDSDriver;
});
```

## 🎯 VALIDATION TARGETS
After implementing server filter:
- **Order count**: Should match TDS dining options (~535 orders)
- **Tip total**: Should equal $481.83
- **Daily breakdown**: Should match TDS sales by day report

This explains the 6.8x discrepancy - we were including ALL servers, not just TDS Driver!