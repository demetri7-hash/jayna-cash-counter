# Automated Ordering System - Complete Specification

## Overview

Intelligent automated ordering system that runs daily at 4:00 AM PST, analyzes inventory, calculates optimal order quantities using historical data and predictive algorithms, and emails vendor-specific order sheets via EmailJS.

---

## Architecture

### Technology Stack
- **Vercel Cron Jobs** - Serverless scheduled tasks
- **Vercel Edge Functions** - Low-latency serverless compute
- **Supabase** - Database for inventory tracking and historical data
- **EmailJS** - Email delivery service
- **Algorithms** - Machine learning-lite predictive ordering

### System Flow

```
4:00 AM PST Daily
      ↓
Vercel Cron Job Triggers
      ↓
Edge Function: /api/daily-ordering
      ↓
┌─────────────────────────────────────┐
│ 1. Load Current Inventory           │
│ 2. Load Historical Consumption      │
│ 3. Check Vendor Schedules           │
│ 4. Calculate Smart Order Quantities │
│ 5. Generate Order Sheets (HTML)     │
│ 6. Send via EmailJS                 │
│ 7. Log Results to Database          │
└─────────────────────────────────────┘
      ↓
Email Sent to: demetri7@gmail.com
      ↓
Order PDFs Generated & Attached
      ↓
Confirmation Logged in Database
```

---

## Smart Algorithms

### 1. **Consumption Rate Analysis**

```javascript
// Calculate average daily consumption for each item
const avgDailyConsumption = (historicalData) => {
  const last7Days = historicalData.slice(-7);
  const totalUsed = last7Days.reduce((sum, day) => {
    return sum + (day.previousStock - day.currentStock + day.received);
  }, 0);
  return totalUsed / 7;
};
```

**Inputs:**
- Stock count changes over past 7, 14, 30 days
- Delivery receipts (qty received)
- Waste/spoilage records (future enhancement)

**Outputs:**
- Average daily usage
- Usage trend (increasing/decreasing)
- Variability (consistent vs. sporadic)

---

### 2. **Predictive Ordering Algorithm**

```javascript
const calculateOptimalOrder = (item, historicalData, nextDeliveryDays) => {
  const avgDaily = avgDailyConsumption(historicalData);
  const trend = calculateTrend(historicalData); // +/- 10%
  const variability = calculateVariability(historicalData); // std dev

  // Base calculation: days until next delivery × daily usage
  const baseQty = Math.ceil(avgDaily * nextDeliveryDays);

  // Safety buffer based on variability (higher variability = more buffer)
  const safetyBuffer = Math.ceil(variability * 1.5);

  // Trend adjustment (if usage increasing, add 10%)
  const trendAdjustment = trend > 0 ? baseQty * 0.1 : 0;

  // Final quantity
  const predictedNeed = baseQty + safetyBuffer + trendAdjustment;

  // Current stock
  const onHand = item.currentStock;

  // Order quantity = predicted need - on hand
  const orderQty = Math.max(0, predictedNeed - onHand);

  return {
    orderQty,
    reasoning: {
      avgDaily,
      nextDeliveryDays,
      baseQty,
      safetyBuffer,
      trendAdjustment,
      predictedNeed,
      onHand
    }
  };
};
```

**Factors Considered:**
1. **Historical consumption** (7-day, 14-day, 30-day weighted average)
2. **Trend analysis** (is usage increasing or decreasing?)
3. **Variability** (consistent usage = less buffer, sporadic = more buffer)
4. **Days until next delivery** (critical for Friday Greenleaf orders)
5. **Current on-hand stock**
6. **Par level validation** (never order below par)
7. **Minimum order quantities** (vendor-specific)

---

### 3. **Vendor Schedule Intelligence**

```javascript
const shouldOrderToday = (vendor, currentDate) => {
  const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' });
  const tomorrow = new Date(currentDate);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowDay = tomorrow.toLocaleDateString('en-US', { weekday: 'long' });

  const schedules = {
    'Greenleaf': {
      orderDays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      cutoffTime: '22:00', // 10 PM
      deliveryNextDay: true,
      specialRules: {
        // Friday order covers Saturday + Sunday (2 days)
        'Friday': { coversDays: 2 }
      }
    },
    'Performance': {
      orderDays: ['Sunday', 'Wednesday'],
      cutoffTime: '15:00', // 3 PM
      deliveryNextDay: true
    },
    'Mani Imports': {
      orderDays: ['Tuesday', 'Thursday'],
      cutoffTime: '15:00',
      deliveryNextDay: true,
      specialRules: {
        // Thursday order covers 5 days (Fri-Tue)
        'Thursday': { coversDays: 5 }
      }
    },
    'Eatopia Foods': {
      orderDays: ['Wednesday'],
      cutoffTime: '17:00',
      deliveryDay: 'Thursday', // Always Thursday delivery
      coversDays: 7
    },
    'Alsco': {
      orderDays: [], // On-demand only
      minDaysBetweenOrders: 7
    }
  };

  const schedule = schedules[vendor];
  if (!schedule) return false;

  // Check if today is an order day for this vendor
  return schedule.orderDays.includes(dayName);
};
```

---

### 4. **Adaptive Par Level Learning**

```javascript
const suggestParLevelAdjustment = (item, historicalData) => {
  const last30Days = historicalData.slice(-30);

  // Count stockouts (times stock hit zero)
  const stockouts = last30Days.filter(d => d.currentStock === 0).length;

  // Count over-stock (times stock > par * 1.5)
  const overstock = last30Days.filter(d => d.currentStock > item.parLevel * 1.5).length;

  // Calculate actual peak usage
  const peakUsage = Math.max(...last30Days.map(d => d.dailyConsumption));

  let suggestion = null;

  if (stockouts > 2) {
    // Frequent stockouts → increase par
    const newPar = Math.ceil(item.parLevel * 1.2);
    suggestion = {
      action: 'INCREASE',
      currentPar: item.parLevel,
      suggestedPar: newPar,
      reason: `${stockouts} stockouts in last 30 days`
    };
  } else if (overstock > 15 && stockouts === 0) {
    // Consistently overstocked → decrease par
    const newPar = Math.floor(item.parLevel * 0.8);
    suggestion = {
      action: 'DECREASE',
      currentPar: item.parLevel,
      suggestedPar: newPar,
      reason: `Overstocked ${overstock} days, no stockouts`
    };
  }

  return suggestion;
};
```

---

### 5. **Cost Optimization**

```javascript
const optimizeOrderCost = (items, vendor) => {
  // Vendor-specific minimum order requirements
  const minimums = {
    'Greenleaf': { amount: 50, unit: 'USD' },
    'Performance': { amount: 100, unit: 'USD' },
    'Mani Imports': { amount: 75, unit: 'USD' }
  };

  const minimum = minimums[vendor];
  if (!minimum) return items;

  // Calculate total order value (requires pricing data)
  const totalValue = items.reduce((sum, item) => {
    return sum + (item.orderQty * (item.unitPrice || 0));
  }, 0);

  // If below minimum, suggest adding items close to running out
  if (totalValue < minimum.amount) {
    const nearDepletionItems = items.filter(i => {
      const daysRemaining = i.currentStock / i.avgDailyConsumption;
      return daysRemaining < 7 && i.orderQty === 0;
    });

    // Add these items to reach minimum
    // ... logic to add items
  }

  return items;
};
```

---

### 6. **Inventory Health Monitoring**

```javascript
const analyzeInventoryHealth = (allItems, historicalData) => {
  const alerts = [];

  for (const item of allItems) {
    const itemHistory = historicalData.filter(d => d.itemId === item.id);

    // ALERT: Never counted (missing data)
    const neverCounted = itemHistory.length === 0;
    if (neverCounted) {
      alerts.push({
        type: 'NEVER_COUNTED',
        severity: 'HIGH',
        item: item.itemName,
        message: 'Item has never been counted - data needed for ordering'
      });
    }

    // ALERT: Always zero (not being used)
    const always Zero = itemHistory.every(d => d.currentStock === 0);
    if (alwaysZero && itemHistory.length > 7) {
      alerts.push({
        type: 'UNUSED',
        severity: 'MEDIUM',
        item: item.itemName,
        message: 'Item consistently at zero - consider removing from inventory'
      });
    }

    // ALERT: Frequent stockouts
    const stockouts = itemHistory.filter(d => d.currentStock === 0).length;
    const stockoutRate = stockouts / itemHistory.length;
    if (stockoutRate > 0.1) { // 10% stockout rate
      alerts.push({
        type: 'FREQUENT_STOCKOUT',
        severity: 'HIGH',
        item: item.itemName,
        message: `Item stocks out ${Math.round(stockoutRate * 100)}% of the time`
      });
    }

    // ALERT: High variability (difficult to predict)
    const variability = calculateVariability(itemHistory);
    if (variability > item.avgDailyConsumption) {
      alerts.push({
        type: 'HIGH_VARIABILITY',
        severity: 'LOW',
        item: item.itemName,
        message: 'Usage is highly variable - consider manual review'
      });
    }
  }

  return alerts;
};
```

---

## Additional Smart Features

### 7. **Day-of-Week Patterns**
- Track usage by day of week (weekends vs. weekdays)
- Adjust predictions for high-traffic days (Friday/Saturday)

### 8. **Seasonal Adjustments**
- Detect seasonal trends (summer produce usage vs. winter)
- Auto-adjust for holidays (July 4th, Thanksgiving, etc.)

### 9. **Waste Tracking** (Future)
- Log spoilage/waste
- Adjust orders to minimize waste
- Alert on high-waste items

### 10. **Vendor Performance Tracking**
- Track delivery accuracy (ordered vs. received)
- Track delivery timeliness
- Flag unreliable vendors

### 11. **Emergency Order Detection**
- Detect critical stockouts
- Send immediate alerts (not just 4am)
- Suggest emergency delivery requests

### 12. **Order Confirmation Tracking**
- Log which orders were sent
- Track vendor confirmations
- Alert on missing confirmations by cutoff time

---

## Database Schema Enhancements

### New Tables Needed

#### 1. `inventory_history`
Tracks all stock count changes for consumption analysis.

```sql
CREATE TABLE inventory_history (
  id BIGSERIAL PRIMARY KEY,
  item_id BIGINT REFERENCES inventory_items(id),
  date DATE NOT NULL,
  opening_stock INTEGER NOT NULL,
  closing_stock INTEGER NOT NULL,
  received INTEGER DEFAULT 0,
  waste INTEGER DEFAULT 0,
  consumption_calculated INTEGER GENERATED ALWAYS AS (opening_stock + received - waste - closing_stock) STORED,
  counted_by TEXT,
  counted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT
);

CREATE INDEX idx_history_item_date ON inventory_history(item_id, date DESC);
```

#### 2. `order_log`
Tracks all automated orders sent.

```sql
CREATE TABLE order_log (
  id BIGSERIAL PRIMARY KEY,
  order_date DATE NOT NULL,
  vendor TEXT NOT NULL,
  order_items JSONB NOT NULL, -- Array of {itemId, itemName, qty, reasoning}
  email_sent_at TIMESTAMP WITH TIME ZONE,
  email_status TEXT, -- 'sent', 'failed', 'bounced'
  confirmed_by_vendor BOOLEAN DEFAULT FALSE,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  delivery_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_order_log_date ON order_log(order_date DESC);
CREATE INDEX idx_order_log_vendor ON order_log(vendor, order_date DESC);
```

#### 3. `par_level_adjustments`
Tracks suggested and approved par level changes.

```sql
CREATE TABLE par_level_adjustments (
  id BIGSERIAL PRIMARY KEY,
  item_id BIGINT REFERENCES inventory_items(id),
  suggested_date DATE NOT NULL,
  current_par INTEGER NOT NULL,
  suggested_par INTEGER NOT NULL,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  reviewed_by TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 4. `inventory_alerts`
Tracks all system alerts for review.

```sql
CREATE TABLE inventory_alerts (
  id BIGSERIAL PRIMARY KEY,
  alert_type TEXT NOT NULL, -- 'STOCKOUT', 'UNUSED', 'HIGH_VARIABILITY', etc.
  severity TEXT NOT NULL, -- 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
  item_id BIGINT REFERENCES inventory_items(id),
  message TEXT NOT NULL,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_by TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_alerts_unresolved ON inventory_alerts(resolved, severity, created_at DESC);
```

---

## Implementation Priority

### Phase 1: Core Automation (Week 1)
1. ✅ Vercel cron job setup
2. ✅ Basic order calculation (par - stock)
3. ✅ EmailJS template
4. ✅ Email sending logic
5. ✅ Order log database

### Phase 2: Smart Algorithms (Week 2)
1. ⏳ Historical consumption tracking
2. ⏳ Predictive ordering algorithm
3. ⏳ Vendor schedule intelligence
4. ⏳ Multi-day order calculations

### Phase 3: Adaptive Learning (Week 3)
1. ⏳ Par level suggestions
2. ⏳ Inventory health monitoring
3. ⏳ Alert system
4. ⏳ Dashboard for reviewing suggestions

### Phase 4: Advanced Features (Week 4)
1. ⏳ Day-of-week patterns
2. ⏳ Cost optimization
3. ⏳ Vendor performance tracking
4. ⏳ Emergency order detection

---

## EmailJS Template

See `EMAILJS_ORDER_TEMPLATE.html` for complete template design.

---

## Vercel Cron Configuration

See `vercel.json` for cron job setup.

---

## Cost Estimate

**Vercel:**
- Free tier: 100 cron job invocations/month
- Pro tier ($20/mo): Unlimited cron jobs
- **Estimated cost:** $0/month (well within free tier)

**EmailJS:**
- Free tier: 200 emails/month
- Personal tier ($10/mo): 1,000 emails/month
- **Estimated cost:** $0/month (4-5 vendors × 30 days = ~120 emails/month)

**Supabase:**
- Free tier: 500 MB database, unlimited API requests
- **Estimated cost:** $0/month

**Total:** $0/month (all within free tiers)

---

## Next Steps

1. Create EmailJS template
2. Set up database tables
3. Build `/api/daily-ordering` edge function
4. Configure Vercel cron job
5. Test with dry-run mode (emails to test address)
6. Enable production mode

Ready to implement?
