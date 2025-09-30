# 🚀 Toast API Integration - Quick Start Guide

## 🎯 TDS Driver Configuration

### Critical Settings
```javascript
// Server GUID for TDS Driver identification
const TDS_DRIVER_GUID = '5ffaae6f-4238-477d-979b-3da88d45b8e2';

// Expected order characteristics
const EXPECTED_PATTERNS = {
    ordersPerWeek: 535-540,
    grossTipsWeekly: 480-485,
    voidAdjustment: 3-4
};
```

### Net Tip Calculation
```javascript
function calculateNetTips(orders) {
    let grossTips = 0;
    let voidedTips = 0;
    let refundedTips = 0;
    
    orders.forEach(order => {
        order.payments?.forEach(payment => {
            const tipAmount = parseFloat(payment.tipAmount || 0);
            grossTips += tipAmount;
            
            // Track voids and refunds
            if (payment.paymentStatus === 'VOIDED') {
                voidedTips += tipAmount;
            }
            if (payment.refundStatus === 'REFUNDED') {
                refundedTips += tipAmount;
            }
        });
    });
    
    return {
        grossTips,
        netTips: grossTips - voidedTips - refundedTips,
        voidedTips,
        refundedTips
    };
}
```

## 🔧 Essential API Endpoints

### 1. Main Cash Sales API
**File**: `api/toast-payments.js`
**URL**: `https://your-app.vercel.app/api/toast-payments`
**Purpose**: Primary endpoint for cash counter integration

### 2. Delivery Analysis API
**File**: `api/toast-delivery-analysis.js`  
**URL**: `https://your-app.vercel.app/api/toast-delivery-analysis`
**Purpose**: Detailed delivery order analysis

### 3. Comprehensive Analysis Tool
**File**: `comprehensive-analysis.html`
**URL**: `https://your-app.vercel.app/comprehensive-analysis.html`
**Purpose**: Troubleshooting and pattern identification

## 🏗️ Environment Setup

### Required Environment Variables
```bash
TOAST_CLIENT_ID=your_toast_client_id
TOAST_CLIENT_SECRET=your_toast_client_secret
TOAST_BASE_URL=https://api.toasttab.com
```

### Vercel Configuration (`vercel.json`)
```json
{
  "functions": {
    "api/*.js": {
      "maxDuration": 30
    }
  }
}
```

## 🧪 Testing Checklist

- [ ] Authentication working with Toast API
- [ ] Orders retrieving for correct date range
- [ ] TDS Driver server GUID filtering correctly
- [ ] Tip amounts matching TDS reports (within $5)
- [ ] Void/refund tracking explaining discrepancies
- [ ] Cash counter integration functioning
- [ ] Error handling for API failures

## 🔍 Troubleshooting Quick Fixes

### Tip Amount Mismatch
1. Check gross vs net calculation
2. Verify TDS Driver server GUID
3. Confirm date range matches exactly
4. Review void/refund adjustments

### Authentication Issues
1. Verify environment variables
2. Check token expiration
3. Test OAuth 2.0 flow manually

### Missing Orders
1. Implement complete pagination
2. Verify date format (YYYY-MM-DD)
3. Check API parameter structure

## 📊 Success Metrics

### Expected Results (Weekly)
- **Orders**: ~537 for TDS Driver
- **Gross Tips**: ~$481.83
- **Net Tips**: ~$478.36 (after $3.47 voided)
- **Accuracy**: 100% match to TDS reports

### Performance Targets
- **Response Time**: < 5 seconds
- **Error Rate**: < 1%
- **Uptime**: 99.9%

---

*For complete documentation, see: `TOAST_API_INTEGRATION_GUIDE.md`*