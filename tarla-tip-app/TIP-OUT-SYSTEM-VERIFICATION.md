# TipShare - Tip-Out System Verification

## 📋 System Overview

This document explains the tip-out calculation system implemented in the TipShare application based on analysis of the June23.29.xlsx Excel file (NOV 6-12 shift data).

---

## 💰 Current Implementation

### **3-Role System:**

1. **SERVERS**
   - Tip out a percentage of Net Sales → goes to SUPPORT POOL
   - Formula: `Final Payout = CC Tips - (Net Sales × Server %)`
   - Default: 6% (customizable per shift)

2. **BARTENDERS**
   - Tip out a percentage of Net Sales → goes to SUPPORT POOL
   - Formula: `Final Payout = CC Tips - (Net Sales × Bartender %)`
   - Default: 4% (customizable per shift)
   - **Bartenders do NOT receive tips from servers** (based on Excel analysis)

3. **SUPPORT STAFF** (Hosts, Bussers, Food Runners)
   - Receive equal share of SUPPORT POOL
   - Formula: `Final Payout = Support Pool ÷ Number of Support Staff`
   - No tip-out

---

## 📊 Excel Verification (NOV 6-12 Data)

### **Example: Tuesday PM Shift**

**SANTIAGO (Server):**
- Net Sales: **$2,714.00**
- CC Tips: **$510.06**
- Tip Out: **$161.64** (5.96% ≈ 6%)
- Final Earning: **$348.42**
- ✓ Math Check: $510.06 - $161.64 = **$348.42** ✓

**BRITTANY (Server):**
- Net Sales: **$1,299.00**
- CC Tips: **$242.18**
- Tip Out: **$51.96** (4.00%)
- Final Earning: **$190.22**
- ✓ Math Check: $242.18 - $51.96 = **$190.22** ✓

### **Example: Tuesday AM Shift**

**IAN (Bartender):**
- Net Sales: **$791.00**
- CC Tips: **$130.22**
- Tip Out: **$31.64** (4.00%)
- Final Earning: **$98.58**
- ✓ Math Check: $130.22 - $31.64 = **$98.58** ✓

**Key Observation:** Ian's final earning is ONLY his CC tips minus his tip-out. He does NOT receive any additional money from servers, which confirms bartenders do not get a separate cut from servers.

---

## 🔍 Support Pool Calculation

### **Formula:**
```
Support Pool = Σ(Server Net Sales × Server %) + Σ(Bartender Net Sales × Bartender %)
```

### **Distribution:**
```
Each Support Staff Member = Support Pool ÷ Number of Support Staff Working
```

### **Weekly Totals (NOV 6-12):**
- **Total Support Staff Earnings:** $387.40
  - NATHEN (Hostess): $110.44
  - ALEXA (Food Runner): $91.34
  - MAIDE (Busser): $70.08
  - ANA (Hostess): $115.54

This represents the combined tip-outs from all servers and bartenders for the week, divided equally among the 4 support staff who worked.

---

## ❓ Question: Do Bartenders Receive from Servers?

### **Analysis:**

**SCENARIO 1: Bartenders DO receive from servers**
If true, Ian would receive 2% of Santiago's $2,714 = $54.28
His final would be: $130.22 - $31.64 + $54.28 = **$152.86**
**But Excel shows:** $98.58 ❌

**SCENARIO 2: Bartenders do NOT receive from servers** ✓
Ian's final: $130.22 - $31.64 = **$98.58**
**Excel shows:** $98.58 ✓

### **Conclusion:**
Based on Ian's actual earnings in the Excel file, **bartenders do NOT receive a separate cut from servers**. All tip-outs (from both servers and bartenders) go into ONE support pool that is divided only among support staff.

---

## 🎯 Implementation Features

✅ **Customizable Percentages** - Server % and Bartender % can be set per shift
✅ **Role-Based Calculations** - Automatic calculation based on employee role
✅ **Support Pool Tracking** - Shows total pool on every report
✅ **Historical Data** - All shifts saved to database with full detail
✅ **Print-Optimized Reports** - Compact layout fits all 7 columns on one page
✅ **Employee Management** - Add, edit, archive employees with assigned roles

---

## 📝 Notes & Observations

- **Percentage Variability:** The Excel shows some servers tipping 6% and others 4% (Brittany). The app handles this with editable % fields per shift.
- **Support Staff Only Receive:** Based on the data, only Hosts, Bussers, and Food Runners receive from the pool.
- **Bartenders Are Independent:** Bartenders keep most of their tips (minus their 4% tip-out to support).

---

## 🚀 Next Steps

1. **Verify with Management:** Confirm this matches Tarla Grill's intended tip-out policy
2. **Test with Real Data:** Run a shift and compare output to manual Excel calculation
3. **Adjust if Needed:** If bartenders SHOULD receive from servers, the system can be modified

---

**Application:** https://jayna-cash-counter.vercel.app/tarla-tip-app/
**Documentation Date:** November 10, 2025
**Excel File Analyzed:** June23.29.xlsx (NOV 6-12 sheet)
