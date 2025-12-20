# 🧠 Jayna AI Brain System - Master Implementation Plan

**Status:** Research Complete → Ready for Development
**Goal:** Create a self-learning AI system that monitors all restaurant data, maps sales to ingredient usage, and privately emails predictive insights to ownership.

---

## 🎯 Executive Summary

The Jayna Brain is an autonomous AI system that:
- **Watches** all sales data (Toast POS + EZCater)
- **Learns** recipe-to-ingredient mappings from prep counts and order patterns
- **Predicts** ingredient needs based on sales forecasts
- **Detects** patterns in customer behavior, seasonality, and operational inefficiencies
- **Communicates** privately via email to demetri7@gmail.com with actionable insights
- **Improves** accuracy over time through continuous learning

**Key Principle:** Silent operation - staff never see it, only you receive insights.

---

## 📊 Data Sources (Already Available)

### 1. **Supabase Tables**
```sql
-- Inventory & Prep
inventory_items         -- 300+ items with stock levels, par levels, vendors
price_history          -- Historical ingredient costs
invoice_items          -- Actual purchase quantities and prices

-- Sales & Orders
catering_orders        -- Toast + EZCater orders with totals, customer info, timestamps
catering_order_items   -- Line-item details (menu items, quantities, prices)

-- Future: Daily Sales
toast_daily_sales      -- [TO BE CREATED] All POS transactions with item-level detail
```

### 2. **Live APIs**
- **Toast POS API**: Real-time sales, order details, customer data, timestamps
- **EZCater API**: Catering orders with delivery times, headcount, special requests

### 3. **Manual Inputs**
- Prep counts (orders-prep.html)
- Invoice check-ins (actual ingredient purchases)
- Stock counts

---

## 🧬 System Architecture

### Phase 1: Data Collection & Storage (Weeks 1-2)

**Component:** `brain-data-collector.js` (Vercel serverless cron job)

**Schedule:** Runs every 6 hours (4x daily)

**What it does:**
1. Fetch yesterday's sales from Toast POS (full order detail)
2. Fetch new catering orders (Toast + EZCater)
3. Fetch prep count updates from inventory_items
4. Fetch new invoice check-ins
5. Store everything in new tables:
   - `brain_daily_sales` (normalized sales data)
   - `brain_events_log` (all significant events with timestamps)

**Implementation:**
```javascript
// /api/brain-data-collector.js
export default async function handler(req, res) {
  // Cron job triggered by Vercel (vercel.json config)

  // 1. Fetch Toast POS sales (last 24 hours)
  const sales = await fetchToastSales();

  // 2. Fetch catering orders
  const catering = await fetchCateringOrders();

  // 3. Fetch prep counts (changed in last 24h)
  const prep = await fetchPrepCountChanges();

  // 4. Store in brain_daily_sales table
  await storeSalesData(sales, catering, prep);

  // 5. Log event
  await logEvent('DATA_COLLECTION_COMPLETE', {
    salesCount: sales.length,
    cateringCount: catering.length,
    prepUpdates: prep.length
  });

  return res.json({ success: true });
}
```

**Vercel Cron Configuration** (vercel.json):
```json
{
  "crons": [{
    "path": "/api/brain-data-collector",
    "schedule": "0 */6 * * *"
  }]
}
```

---

### Phase 2: Recipe Intelligence Engine (Weeks 3-4)

**Component:** `brain-recipe-mapper.js`

**Core Challenge:** Map menu items → ingredient portions

**Strategy: Inverse Learning from Prep Counts**

**Example Logic:**
```
OBSERVATION:
- Monday: Sold 50 Beef/Lamb Gyro Pitas
- Tuesday: Prep count shows -12 lbs of Beef/Lamb
- Tuesday: Prep count shows -8 heads of Iceberg Lettuce

INFERENCE:
- 50 gyros ≈ 12 lbs meat = 0.24 lbs/gyro
- 50 gyros ≈ 8 heads lettuce = 0.16 heads/gyro

After 30 days of observations:
CONFIDENCE: 95% that each gyro uses 0.22-0.26 lbs meat
```

**Implementation Approach:**

1. **Manual Bootstrap (Week 3)**
   - Create `brain_recipes` table with initial manual mappings
   - You provide 20-30 key menu items with ingredient estimates
   - Example:
     ```json
     {
       "menu_item": "Beef/Lamb Gyro Pita",
       "ingredients": [
         { "inventory_item_id": 123, "item_name": "Beef/Lamb Mix", "portion_size": 0.25, "unit": "lbs" },
         { "inventory_item_id": 45, "item_name": "Iceberg Lettuce", "portion_size": 0.15, "unit": "heads" },
         { "inventory_item_id": 67, "item_name": "Tzatziki Sauce", "portion_size": 2, "unit": "oz" }
       ]
     }
     ```

2. **Automated Refinement (Ongoing)**
   - Compare predicted usage vs. actual prep counts
   - Adjust portion sizes using weighted average
   - Formula: `new_portion = (old_portion * 0.7) + (observed_portion * 0.3)`
   - Gradually improve accuracy over time

3. **Pattern Detection**
   - Identify seasonal variations (summer vs. winter portions)
   - Detect waste patterns (over-portioning indicators)
   - Flag anomalies (sudden ingredient usage spikes)

---

### Phase 3: Predictive Analytics Engine (Weeks 5-6)

**Component:** `brain-predictor.js`

**Runs:** Daily at 11 PM Pacific (after business close)

**What it does:**

1. **Sales Forecasting** (Next 7 days)
   - Analyze historical sales patterns
   - Factor in:
     - Day of week (Fridays are 2.3x Mondays)
     - Seasonality (summer vs. winter)
     - Holidays/events (local calendar integration)
     - Weather (if API integrated)
     - Recent trends (last 14 days weighted)

2. **Ingredient Usage Prediction**
   - Use recipe mappings to estimate ingredient needs
   - Cross-reference with scheduled catering orders
   - Compare predicted usage vs. current stock levels
   - Flag items that will run out before next delivery

3. **Cost Analysis**
   - Track ingredient price trends from price_history
   - Identify cost increases before they hit margins
   - Suggest menu price adjustments
   - Detect waste opportunities

**ML Model Type:**
- **Time Series Forecasting**: ARIMA or Prophet (Facebook's time series library)
- **Why not neural networks?** Too data-hungry for restaurant scale (need 2+ years of data)
- **Prophet advantages:**
  - Works with daily/weekly seasonality
  - Handles holidays automatically
  - Robust to missing data
  - Can run in Node.js via Python bridge or use existing JS implementations

**Implementation Options:**

**Option A: External ML Service (Recommended for MVP)**
- Use AWS SageMaker, Google Cloud AI, or Hugging Face Inference API
- Send data via API, receive predictions
- Pros: No ML expertise required, scalable
- Cons: $50-100/month cost

**Option B: Local Time Series Library**
- Use `time-series-forecast` npm package or similar
- Simpler models (moving average, exponential smoothing)
- Pros: Free, faster, sufficient for restaurant scale
- Cons: Less sophisticated predictions

**Phase 3 MVP: Use Option B** → Upgrade to Option A after 3 months if needed

---

### Phase 4: Insight Generation & Communication (Weeks 7-8)

**Component:** `brain-insights-generator.js`

**Runs:** Daily at 11:30 PM (after predictor finishes)

**What it generates:**

#### **Daily Insights** (every night if significant findings)
- Critical inventory alerts
- Unusual sales patterns detected
- Recipe mapping improvements discovered
- Cost increase warnings

#### **Weekly Reports** (every Sunday 8 PM)
- 7-day sales forecast
- Ingredient ordering recommendations
- Top sellers & slow movers
- Profit margin analysis by menu item

#### **Monthly Deep Dives** (1st of month, 9 AM)
- Seasonal trend analysis
- Menu optimization suggestions
- Waste reduction opportunities
- Customer behavior patterns

**Email Format:**
```javascript
// Using EmailJS (existing credentials)
async function sendInsightEmail(insightType, data) {
  const emailContent = {
    to_email: 'demetri7@gmail.com',
    from_name: 'Jayna Brain 🧠',
    subject: `${insightType} - ${new Date().toLocaleDateString()}`,
    message: generateInsightHTML(data),
    reply_to: 'jaynascans@gmail.com'
  };

  await emailjs.send(
    process.env.EMAILJS_SERVICE_ID,
    'brain_insights_template', // New template
    emailContent
  );
}
```

**Email Content Examples:**

**1. Critical Alert:**
```
Subject: 🚨 CRITICAL: Beef/Lamb Mix Running Low

Hey Demetri,

The Brain detected you'll run out of Beef/Lamb Mix by Thursday evening.

Current Stock: 18 lbs
Forecasted Usage: 45 lbs (next 3 days)
Recommended Order: 50 lbs (arrives Tuesday)

Confidence: 94%

Historical Context:
- Last 7 days average: 12.3 lbs/day
- Next 3 days expected: 15 lbs/day (weekend bump)

— Jayna Brain 🧠
```

**2. Weekly Forecast:**
```
Subject: 📊 Weekly Forecast & Recommendations (Nov 11-17)

Top Insights:

1. SALES FORECAST (+12% vs last week)
   - Monday: $1,450 (↑8%)
   - Friday: $2,890 (↑18% - payday weekend)
   - Total week: $12,400

2. INGREDIENT ALERTS
   ⚠️ Tzatziki Sauce: Order 8 gallons by Wednesday
   ⚠️ Pita Bread: Order 15 bags by Thursday
   ✅ Iceberg Lettuce: Stock sufficient

3. COST INCREASES DETECTED
   - Tomatoes: +$0.45/lb (↑15% vs last month)
   - Impact: $23/day margin reduction
   - Suggestion: Consider slight portion reduction or $0.50 menu increase

4. NEW PATTERN DETECTED
   - Tuesday lunch orders up 23% (last 3 weeks)
   - Customer: Construction crew nearby (temp project)
   - Opportunity: Reach out for catering quote

Confidence: 87%

— Jayna Brain 🧠
```

**3. Recipe Learning Update:**
```
Subject: 🎓 The Brain Learned Something New

After observing 250 Greek Salad sales over 2 weeks, I refined the recipe mapping:

BEFORE:
- Feta Cheese: 2.5 oz/salad
- Cucumbers: 0.3 lbs/salad

AFTER (94% confidence):
- Feta Cheese: 3.1 oz/salad (↑24% vs initial estimate)
- Cucumbers: 0.25 lbs/salad (↓17%)

This explains why Feta was running out faster than predicted!

Updated forecasts accordingly.

— Jayna Brain 🧠
```

---

## 🗄️ Database Schema (New Tables)

### 1. `brain_daily_sales`
```sql
CREATE TABLE brain_daily_sales (
  id BIGSERIAL PRIMARY KEY,
  business_date DATE NOT NULL,
  order_source TEXT, -- 'toast_pos', 'toast_catering', 'ezcater'
  external_order_id TEXT,

  -- Menu Item Details
  menu_item_name TEXT,
  menu_item_guid TEXT,
  quantity INTEGER,
  unit_price NUMERIC(10,2),
  total_price NUMERIC(10,2),

  -- Context
  order_time TIMESTAMP WITH TIME ZONE,
  day_of_week INTEGER, -- 1=Monday, 7=Sunday
  hour_of_day INTEGER,
  is_weekend BOOLEAN,

  -- Customer (anonymized for patterns only)
  customer_type TEXT, -- 'dine_in', 'takeout', 'delivery', 'catering'
  customer_segment TEXT, -- 'regular', 'new', 'occasional' (based on order frequency)

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(business_date, external_order_id, menu_item_guid)
);

CREATE INDEX idx_brain_sales_date ON brain_daily_sales(business_date);
CREATE INDEX idx_brain_sales_item ON brain_daily_sales(menu_item_name);
```

### 2. `brain_recipes`
```sql
CREATE TABLE brain_recipes (
  id BIGSERIAL PRIMARY KEY,
  menu_item_name TEXT UNIQUE NOT NULL,
  menu_item_guid TEXT,

  -- Recipe mapping (JSONB for flexibility)
  ingredients JSONB, -- Array of {inventory_item_id, portion_size, unit, confidence}

  -- Learning metadata
  confidence_score NUMERIC(3,2), -- 0.00 to 1.00
  observation_count INTEGER DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE,

  -- Manual override flag
  is_manual_override BOOLEAN DEFAULT FALSE,
  notes TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Example `ingredients` JSONB:**
```json
[
  {
    "inventory_item_id": 123,
    "item_name": "Beef/Lamb Mix",
    "portion_size": 0.24,
    "unit": "lbs",
    "confidence": 0.94,
    "last_observed": "2025-11-06T12:00:00Z"
  },
  {
    "inventory_item_id": 45,
    "item_name": "Iceberg Lettuce",
    "portion_size": 0.16,
    "unit": "heads",
    "confidence": 0.89,
    "last_observed": "2025-11-06T12:00:00Z"
  }
]
```

### 3. `brain_predictions`
```sql
CREATE TABLE brain_predictions (
  id BIGSERIAL PRIMARY KEY,
  prediction_date DATE NOT NULL, -- Date this prediction was made
  target_date DATE NOT NULL,     -- Date being predicted

  prediction_type TEXT, -- 'sales_forecast', 'ingredient_usage', 'stock_alert'

  -- Prediction data (flexible JSONB)
  prediction_data JSONB,

  -- Accuracy tracking (filled in after target_date passes)
  actual_value NUMERIC(10,2),
  predicted_value NUMERIC(10,2),
  accuracy_percent NUMERIC(5,2),

  model_version TEXT,
  confidence_score NUMERIC(3,2),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(prediction_date, target_date, prediction_type)
);
```

### 4. `brain_insights`
```sql
CREATE TABLE brain_insights (
  id BIGSERIAL PRIMARY KEY,
  insight_type TEXT, -- 'critical_alert', 'weekly_forecast', 'pattern_detected', 'cost_warning'
  priority TEXT, -- 'critical', 'high', 'medium', 'low'

  title TEXT NOT NULL,
  summary TEXT,
  details JSONB, -- Full insight data

  -- Email tracking
  email_sent BOOLEAN DEFAULT FALSE,
  email_sent_at TIMESTAMP WITH TIME ZONE,

  -- User feedback (for future improvement)
  user_rating INTEGER, -- 1-5 stars (you can rate insights via email link)
  user_feedback TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_brain_insights_sent ON brain_insights(email_sent, created_at);
```

### 5. `brain_events_log`
```sql
CREATE TABLE brain_events_log (
  id BIGSERIAL PRIMARY KEY,
  event_type TEXT, -- 'data_collection', 'recipe_learned', 'prediction_made', 'insight_sent'
  event_data JSONB,
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  execution_time_ms INTEGER,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_brain_events_type ON brain_events_log(event_type, created_at);
```

---

## 🤖 Machine Learning Strategy

### Stage 1: Rule-Based Intelligence (Weeks 1-8)
**No ML required yet** - Use statistical methods:
- Moving averages for sales trends
- Historical comparisons (same day last week/month/year)
- Simple regression for ingredient usage correlation
- Threshold-based alerts

**Why start here?**
- Faster to implement
- Easier to debug and explain
- Sufficient for 80% of insights
- Builds training data for ML models

### Stage 2: Time Series Forecasting (Weeks 9-12)
Introduce actual ML models:
- **Prophet (Facebook)**: Best for restaurant data (handles seasonality, holidays)
- **ARIMA**: Classical time series (backup option)
- Train on 3+ months of collected data
- Predict 7-day sales forecasts

### Stage 3: Advanced Pattern Detection (Months 4-6)
- Clustering for customer segmentation
- Anomaly detection for unusual patterns
- Multi-variate models (weather + sales + events)

### Continuous Improvement Loop:
```
1. Make prediction → 2. Wait for actual result →
3. Calculate accuracy → 4. Retrain model with new data →
5. Improve prediction (repeat)
```

**Retraining Schedule:**
- Daily: Update ingredient portions (fast, simple)
- Weekly: Retrain sales forecast (moderate complexity)
- Monthly: Deep model retraining (full dataset)

---

## 🔐 Security & Privacy

### Data Access Control
- Brain system has READ-ONLY access to all tables
- Supabase Row Level Security (RLS) policies prevent accidental writes
- Separate API keys for brain vs. user operations

### Email Privacy
- Insights sent ONLY to demetri7@gmail.com
- No insights visible in any UI
- Staff cannot access brain tables (database permissions)

### Data Anonymization
- Customer names NOT stored in brain_daily_sales
- Only aggregate patterns (customer segments, not individuals)
- Compliant with privacy regulations

---

## 📅 Implementation Timeline

### **Phase 1: Foundation (Weeks 1-2)** ✅ Research Complete
- ✅ Research ML approaches
- ✅ Design system architecture
- Create database tables
- Build data collector cron job
- Test Toast API data fetching
- Verify Vercel cron execution

### **Phase 2: Recipe Intelligence (Weeks 3-4)**
- Create brain_recipes table
- Manual recipe mapping (20-30 items)
- Build recipe learning algorithm
- Test with 1 week of prep count data
- Validate accuracy vs. manual estimates

### **Phase 3: Predictions (Weeks 5-6)**
- Implement sales forecasting (rule-based)
- Ingredient usage calculator
- Stock alert system
- Test predictions vs. actuals for 1 week

### **Phase 4: Insights & Email (Weeks 7-8)**
- Build insight generation logic
- Create email templates
- Test email delivery
- Fine-tune alert thresholds
- Launch private beta (just you receiving emails)

### **Phase 5: Learning Loop (Weeks 9-12)**
- Add prediction accuracy tracking
- Implement auto-retraining
- Introduce Prophet time series model
- Optimize for high-accuracy predictions
per
### **Phase 6: Advanced Features (Months 4-6)**
- Customer behavior analysis
- Menu optimization recommendations
- Cost vs. sales margin analysis
- External data integration (weather, events)

---

## 💰 Cost Estimates

### Development Time
- **Your time:** ~4 hours/week guidance and recipe data input
- **My time (Claude Code):** ~30-40 hours total over 8 weeks

### Infrastructure Costs
- **Vercel**: Free tier supports cron jobs (no extra cost)
- **Supabase**: Current plan sufficient (5-10 MB/day new data)
- **EmailJS**: Free tier (200 emails/month - plenty for daily insights)
- **External ML API** (optional Phase 5): $50-100/month

**Total Monthly Cost: $0-100** depending on ML approach

---

## 🎯 Success Metrics

### Week 4 Goals:
- [ ] 20 menu items mapped to ingredients
- [ ] 7 days of sales data collected
- [ ] Recipe learning algorithm achieving 70%+ accuracy

### Week 8 Goals:
- [ ] Daily insight emails being received
- [ ] Sales forecasts within 15% accuracy
- [ ] Ingredient alerts preventing 1+ stockout

### Week 12 Goals:
- [ ] Sales forecasts within 10% accuracy
- [ ] 50+ menu items fully mapped
- [ ] Self-improving recipe portions (no manual adjustments needed)

### Month 6 Goals:
- [ ] Forecasts within 5% accuracy
- [ ] Prevented $1,000+ in waste through better ordering
- [ ] Identified 3+ menu optimization opportunities
- [ ] Detected 5+ operational pattern improvements

---

## 🚀 Next Steps to Begin Development

### **Immediate Actions (This Week):**

1. **Review & Approve Plan**
   - Read this document
   - Provide feedback on priorities
   - Confirm email preferences

2. **Manual Recipe Data Collection**
   - List your top 30 best-selling menu items
   - Estimate ingredient portions for each
   - I'll create a Google Sheet template to make this easy

3. **Database Setup**
   - I'll create the 5 new brain tables
   - Set up Vercel cron job
   - Test data collection pipeline

### **Week 1 Development Tasks:**
```bash
# Create tables
psql> CREATE TABLE brain_daily_sales ...
psql> CREATE TABLE brain_recipes ...
# (etc.)

# Build data collector
/api/brain-data-collector.js → Fetch Toast sales
/api/brain-data-collector.js → Store in brain_daily_sales

# Configure Vercel cron
vercel.json → Add cron schedule
Deploy → Test cron execution

# Verify data flow
Check brain_events_log for successful runs
```

---

## 🤔 Open Questions for You

1. **Manual Recipe Input**: Would you prefer:
   - A) Google Sheet you fill out → I import
   - B) Simple web form I build for you
   - C) Voice call where you tell me and I type

2. **Email Frequency**: What's your preference?
   - A) Daily insights (only if something important)
   - B) Weekly summary only
   - C) Real-time alerts for critical issues + weekly summary

3. **Initial Focus**: Which insights are MOST valuable first?
   - A) Ingredient ordering predictions
   - B) Sales forecasting
   - C) Cost increase warnings
   - D) All equally important

4. **Training Data**: Do you have historical sales data I should import?
   - Toast POS: Can we fetch last 3-6 months?
   - Catering: How far back are records available?

---

## 📚 Technical Resources Referenced

### Research Sources:
- [Strong.io: Ingredient-Level Demand Forecasting](https://www.strong.io/blog/optimizing-restaurant-inventory-using-ingredient-level-demand-forecasting)
- [Supy: AI & ML in Restaurant Inventory](https://supy.io/blog/implementing-ai-and-machine-learning-in-restaurant-inventory-management/)
- [Vercel Cron Jobs Documentation](https://vercel.com/docs/cron-jobs)
- [AWS Serverless Data Analytics Pipeline](https://aws.amazon.com/blogs/big-data/aws-serverless-data-analytics-pipeline-reference-architecture/)
- [Recipe Costing Algorithms](https://get.apicbase.com/restaurant-menu-costing/)

### Potential ML Libraries:
- **Prophet** (Facebook): Time series forecasting - https://facebook.github.io/prophet/
- **Simple Statistics (JS)**: Statistical functions - https://simplestatistics.org/
- **TensorFlow.js**: If we need neural networks later - https://www.tensorflow.org/js

---

## 🎉 The Vision

**In 6 months, the Jayna Brain will:**
- Predict sales with 95%+ accuracy
- Know your recipes better than anyone
- Prevent ingredient stockouts before they happen
- Identify menu items that are secretly losing money
- Detect customer behavior patterns you never noticed
- Send you insights that feel like magic

**And it all happens silently, behind the scenes, while you focus on running the restaurant.**

---

**Ready to build your restaurant's brain?** 🧠

Let me know your answers to the open questions, and we'll start development this week!

— Claude Code
