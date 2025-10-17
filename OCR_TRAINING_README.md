# OCR Training System - User Guide

**Created:** October 17, 2025
**Purpose:** Train the invoice/order OCR system to recognize items more accurately over time

---

## 🎯 What This System Does

The OCR Training System allows you to:
- Upload invoices and orders for OCR processing
- Manually correct OCR mistakes
- Teach the system to recognize vendor-specific patterns
- Build a database of "learned knowledge" that improves future scans

**The more you train, the smarter it gets!**

---

## 🚀 Getting Started

### Step 1: Run Database Migration

Before using the training system, you must create the database tables:

1. Open **Supabase Dashboard**: https://supabase.com/dashboard
2. Navigate to **SQL Editor**
3. Open the file: `database/migrations/ocr-learning-system.sql`
4. Copy the ENTIRE contents
5. Paste into Supabase SQL Editor
6. Click **Run**
7. Verify you see: "Migration Complete" and 4 new tables created

**New Tables Created:**
- `ocr_training_sessions` - Tracks each training upload
- `ocr_training_corrections` - Stores your corrections
- `ocr_learned_patterns` - Extracted knowledge (aliases, patterns)
- `ocr_vendor_templates` - Vendor-specific layout patterns

---

### Step 2: Access Training Page

**Local Development:**
```bash
python3 -m http.server 8000
```
Then visit: `http://localhost:8000/ocr-training.html`

**Production (after deploying):**
```
https://jayna-cash-counter.vercel.app/ocr-training.html
```

---

## 📖 How to Use

### Training Workflow

#### 1. Upload an Invoice/Order
- Click the upload zone or drag & drop an image
- Supports: JPG, PNG, PDF
- Best results with:
  - High resolution (300 DPI+)
  - Good lighting
  - Flat/straight (not tilted)
  - Clear text (not blurry)

#### 2. Configure Document Details
- **Vendor** (optional): Auto-detects from matched items
- **Document Type**: Invoice or Order
- **Date** (optional): For tracking purposes

#### 3. Process with OCR
- Click "Process with OCR"
- Wait for Tesseract.js to extract text (15-30 seconds)
- System will show:
  - Image preview
  - Raw OCR text
  - Extracted items with confidence scores

#### 4. Review & Correct Items

**Confidence Badges:**
- 🟢 **Green (70%+)**: High confidence - likely correct
- 🟡 **Yellow (50-69%)**: Medium - needs review
- 🔴 **Red (<50%)**: Low confidence - manual review required

**For each item, you can:**

1. **Edit Fields Directly:**
   - Name
   - Quantity
   - Unit (CS, EA, LB, etc.)
   - Price

2. **Accept Auto-Match:**
   - If system found a match, click "Accept" to confirm

3. **Manual Match:**
   - Select from dropdown of inventory items
   - This teaches the system: "When you see X, it means Y"

4. **Leave Unmatched:**
   - If it's not in inventory, leave it
   - You can add new items later

#### 5. Save Training Data
- Click "Save Training Data"
- System will:
  - Store all corrections
  - Extract patterns
  - Learn item aliases
  - Update vendor templates
  - Improve future accuracy

---

## 🧠 What the System Learns

### 1. Item Name Aliases
When you match OCR text to inventory items, it learns:

```
"Arugula 4#" → "Wild Arugula 4# Case"
"Tom Roma" → "Roma Tomatoes 25# Box"
"Basil Bunch" → "Fresh Basil Bunch"
```

**Next time** it sees "Arugula 4#", it will automatically suggest "Wild Arugula 4# Case" with high confidence!

### 2. Vendor-Specific Patterns
Each vendor has different invoice formats:

- **Vendor A**: `QTY | NAME | UNIT | PRICE`
- **Vendor B**: `NAME | QTY | PRICE` (no unit)
- **Vendor C**: Multi-line items with SKU codes

The system learns these patterns and applies them when it detects the vendor.

### 3. Unit Location Patterns
Learns where units typically appear:
- After item name: "Tomatoes **CS**"
- Before price: "Basil **EA** 8.99"
- Separate column

### 4. Quantity Formats
Recognizes different quantity formats:
- Whole numbers: `12`
- Decimals: `2.5`
- Fractions: `1/2` (future)

### 5. Price Patterns
Learns where prices appear and their format:
- Always at end of line
- Always 2 decimals
- Sometimes with $ symbol, sometimes without

---

## 📊 Statistics Dashboard

The top bar shows real-time learning progress:

- **Training Sessions**: How many times you've trained
- **Corrections Made**: Total corrections across all sessions
- **Patterns Learned**: Unique patterns extracted
- **Vendor Templates**: Number of vendors with learned layouts

---

## 🎓 Best Practices

### For Best Training Results:

1. **Train with Clean Images**
   - High resolution
   - Good lighting
   - Straight/flat scan

2. **Be Consistent**
   - Always match "Tomatoes" to the same inventory item
   - Use consistent unit formats (CS, not Case)

3. **Train Multiple Invoices from Same Vendor**
   - 3-5 invoices = good template
   - 10+ invoices = excellent accuracy

4. **Review Low-Confidence Items Carefully**
   - Red badges need the most attention
   - These are the most valuable learning opportunities

5. **Use Actual Invoices**
   - Real-world data trains better than test data
   - Include problem invoices (blurry, tilted, etc.)

---

## 🔄 How Training Improves Production

When you use the **RECEIVE tab** in `index.html`:

1. OCR extracts text from invoice
2. **System queries learned patterns** for the vendor
3. **Applies aliases**: "Arugula 4#" auto-matches to learned item
4. **Uses vendor template**: Knows where to look for qty/price/unit
5. **Boosts confidence**: Items matching learned patterns get higher scores
6. **Shows suggestions**: "Based on training data..."

**Result:** Less manual work, faster check-ins, fewer errors!

---

## 📈 Tracking Progress

### View Training Data in Supabase

**Recent Training Sessions:**
```sql
SELECT * FROM ocr_training_sessions
ORDER BY created_at DESC
LIMIT 10;
```

**Most Common Corrections:**
```sql
SELECT
  correction_type,
  COUNT(*) as count
FROM ocr_training_corrections
GROUP BY correction_type
ORDER BY count DESC;
```

**Learned Patterns by Vendor:**
```sql
SELECT
  vendor,
  COUNT(*) as patterns,
  AVG(confidence_score) as avg_confidence
FROM ocr_learned_patterns
WHERE is_active = TRUE
GROUP BY vendor
ORDER BY patterns DESC;
```

**Top Learned Aliases:**
```sql
SELECT
  vendor,
  ocr_variation,
  canonical_name,
  times_seen,
  confidence_score
FROM ocr_learned_patterns
WHERE pattern_type = 'item_alias'
  AND is_active = TRUE
ORDER BY times_seen DESC
LIMIT 20;
```

---

## 🛠️ Troubleshooting

### OCR Not Detecting Items

**Possible causes:**
- Image quality too low
- Text too small
- Invoice format very unusual
- Multiple columns confusing OCR

**Solutions:**
- Re-scan at higher resolution
- Crop to just the line items section
- Manually add items one by one
- Train with 2-3 similar invoices to build pattern

### Auto-Match Not Working

**Possible causes:**
- Item name very different from inventory
- First time seeing this vendor
- Typo in OCR text

**Solutions:**
- Manually match the first time
- System will learn the alias for next time
- Train with 3-5 invoices from same vendor

### Stats Not Updating

**Refresh the page** - Stats load on page load

---

## 🔮 Future Enhancements

Planned features:
- [ ] Multi-page invoice merging
- [ ] PDF text extraction (bypass OCR when possible)
- [ ] Handwriting recognition
- [ ] Auto-vendor detection from header/logo
- [ ] Pattern confidence visualization
- [ ] Export/import learned patterns
- [ ] Bulk training from folder of images

---

## 📞 Support

If you encounter issues:

1. Check browser console for errors (F12 → Console)
2. Verify database migration ran successfully
3. Check Supabase connection (should see 4 tables)
4. Review `database/migrations/ocr-learning-system.sql` for verification queries

---

## 📝 Technical Details

### Architecture

**Frontend:**
- Standalone HTML file (`ocr-training.html`)
- Tesseract.js v4 for OCR
- Supabase JS client for database

**Backend:**
- Supabase PostgreSQL database
- 4 tables with relational structure
- Computed confidence scores
- Helper functions for pattern retrieval

**Learning Algorithm:**
1. User uploads invoice
2. OCR extracts text
3. Fuzzy matching attempts auto-match
4. User corrects mistakes
5. System extracts patterns from corrections
6. Patterns stored with statistical confidence
7. Future OCRs query patterns first
8. Confidence scores improve with more training

### Pattern Confidence Formula

```
confidence = times_successful / times_seen
```

- Starts at 1.0 for new patterns
- Decreases if pattern fails to match
- Only patterns with confidence >= 0.5 used in production

### Database Indexes

Optimized for fast pattern lookups:
- Vendor index (most common query)
- Pattern type index
- Confidence score index (DESC)
- OCR variation index (for alias lookup)

---

**Happy Training! The more you teach it, the smarter it gets! 🚀**
