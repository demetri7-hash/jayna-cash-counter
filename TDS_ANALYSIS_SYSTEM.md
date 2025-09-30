# TDS Driver Sales Analysis System
## Target: $481.83 in Tips for Week 9/22-9/28 2025

### 📊 ACTUAL TDS DATA BREAKDOWN

#### **CORE METRICS** (from TDS reports)
- **Total Orders: 535**
- **Total Tips: $481.83** ⭐ TARGET
- **Total Net Sales: $17,592.20**
- **Date Range: 2025-09-22 to 2025-09-28**

#### **TIP BREAKDOWN BY PAYMENT TYPE** (Payments summary.csv)
```
Payment Type          | Count | Tips    | % of Total
---------------------|-------|---------|----------
Credit/debit (generic)| 192   | $400.26 | 83.1%
Credit/debit - AMEX   | 15    | $63.16  | 13.1%
Credit/debit - DISCOVER| 6     | $36.57  | 7.6%
Credit/debit - MASTERCARD| 27  | $43.00  | 8.9%
Credit/debit - VISA   | 144   | $257.53 | 53.5%
Other - DOORDASH      | 311   | $81.57  | 16.9%
Other - Grubhub       | 9     | $0.00   | 0.0%
Other - Uber Eats     | 22    | $0.00   | 0.0%
---------------------|-------|---------|----------
TOTAL                | 536   | $481.83 | 100%
```

**KEY INSIGHT**: Only Credit/debit cards and DoorDash payments have tips!

#### **DINING OPTIONS BREAKDOWN** (Dining options summary.csv)
```
Service Type               | Orders | Net Sales | Notes
--------------------------|--------|-----------|------------------
DoorDash - Delivery       | 268    | $9,073.50 | Main delivery service
Online Ordering - TO GO   | 186    | $5,772.60 | Takeout orders
DoorDash - Takeout        | 43     | $1,257.80 | DoorDash pickup
Uber Eats - Delivery      | 20     | $632.25   | Secondary delivery
Grubhub - Takeout         | 9      | $331.00   | Minor pickup
Toast Delivery Services   | 7      | $442.55   | Toast's own delivery
Uber Eats - Takeout       | 2      | $82.50    | Minor pickup
--------------------------|--------|-----------|------------------
TOTAL                     | 535    | $17,592.20|
```

#### **DAILY BREAKDOWN** (Sales by day.csv)
```
Date     | Day | Orders | Net Sales | Avg/Order
---------|-----|--------|-----------|----------
9/22/25  | SUN | 64     | $2,213.00 | $34.58
9/23/25  | MON | 87     | $2,658.10 | $30.55
9/24/25  | TUE | 84     | $2,647.85 | $31.52
9/25/25  | WED | 71     | $2,694.95 | $37.96
9/26/25  | THU | 88     | $2,919.45 | $33.18
9/27/25  | FRI | 85     | $2,678.30 | $31.51
9/28/25  | SAT | 56     | $1,780.55 | $31.80
---------|-----|--------|-----------|----------
TOTAL    |     | 535    | $17,592.20| $32.88
```

### 🔍 TOAST API FILTERING REQUIREMENTS

Based on TDS data, our Toast API needs to:

#### **1. ORDER FILTERING CRITERIA**
- **Date Range**: 2025-09-22 to 2025-09-28 (inclusive)
- **Service Types to Include**:
  - All delivery orders (DoorDash, Uber Eats, Toast Delivery)
  - All takeout/pickup orders (Online ordering, DoorDash pickup, etc.)
- **Expected Order Count**: ~535 orders

#### **2. TIP EXTRACTION STRATEGY**
```javascript
// Based on TDS payment breakdown:
// 1. Credit/debit card tips: $400.26 (83.1%)
// 2. DoorDash platform tips: $81.57 (16.9%)
// 3. Other platforms: $0.00 (Grubhub, Uber Eats)

const tipSources = {
  creditDebitTips: 0,    // From payment.tipAmount
  doordashTips: 0,       // From DoorDash-specific fields
  platformTips: 0,       // From other delivery platforms
  serviceCharges: 0      // From delivery fees/charges
};
```

#### **3. PAYMENT TYPE MAPPING**
```
Toast API Payment → TDS Category
----------------------------------------
CREDIT_CARD         → Credit/debit
DEBIT_CARD          → Credit/debit  
DOORDASH           → Other - DOORDASH
GRUBHUB            → Other - Grubhub
UBER_EATS          → Other - Uber Eats
```

### 🎯 VALIDATION CHECKPOINTS

#### **Order Count Validation**
- Toast API orders found: **??? vs TDS: 535**
- Delivery orders: **??? vs TDS: ~288** (DoorDash + Uber + Toast delivery)
- Takeout orders: **??? vs TDS: ~247** (Online + pickup orders)

#### **Tip Amount Validation**
- Total tips extracted: **??? vs TDS: $481.83**
- Credit/debit tips: **??? vs TDS: $400.26**
- DoorDash tips: **??? vs TDS: $81.57**
- Other platform tips: **??? vs TDS: $0.00**

#### **Sales Validation**
- Total net sales: **??? vs TDS: $17,592.20**
- Average order value: **??? vs TDS: $32.88**

### 🛠️ NEXT STEPS

1. **Update Toast API filter** to match all dining options from TDS
2. **Fix tip extraction** to separate credit card tips from platform tips
3. **Validate order counts** against TDS dining options breakdown
4. **Test daily breakdowns** to ensure consistent data across all 7 days
5. **Cross-reference payment types** to match TDS payment summary

### 📝 NOTES

- **TDS Driver** appears to be a revenue center or employee filter
- Service charges are minimal ($24.00 total) - not a major tip source
- Peak hours: 11-12pm (138 orders), 5-6pm (142 orders)
- Strongest days: Thu (88 orders), Mon (87 orders), Fri (85 orders)
- Weakest day: Sat (56 orders)

---
*Generated from TDS Driver SalesSummary 9/22-9/28 2025*