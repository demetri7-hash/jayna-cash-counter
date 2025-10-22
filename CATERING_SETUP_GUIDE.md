# EZCATER CATERING SYSTEM - SETUP GUIDE

**Created:** October 21, 2025
**Status:** ✅ Built & Deployed (Pending API Credentials)

---

## 🎉 What We Built

### 1. **Catering Management Page** (`catering.html`)
- **URL:** https://jayna-cash-counter.vercel.app/catering.html
- **Design:** Matches index.html exactly (header, colors, typography, buttons)
- **Features:**
  - ✅ UPCOMING tab - displays orders for today + next 14 days
  - ✅ Order cards with date grouping (TODAY, TOMORROW, future dates)
  - ✅ Status badges (Confirmed, Pending, Cancelled, Delivered)
  - ✅ Customer name, headcount, delivery time, total amount
  - ✅ Mobile-responsive grid layout
  - ✅ Loading spinner & empty state
  - ✅ Error handling with user-friendly messages
  - ⏳ PAST tab (placeholder - future implementation)
  - ⏳ ANALYTICS tab (placeholder - future implementation)

### 2. **Backend API Proxy** (`/api/ezcater-proxy.js`)
- **Purpose:** Secure GraphQL proxy to EZCater API
- **Security:** API token never exposed to frontend
- **Features:**
  - ✅ Accepts GraphQL queries from frontend
  - ✅ Forwards to EZCater API with Bearer token
  - ✅ Error sanitization
  - ✅ Logging for debugging
  - ✅ Returns structured JSON responses

### 3. **Documentation** (`EZCATER_INTEGRATION.md`)
- Complete API research and findings
- Authentication setup instructions
- GraphQL query examples
- Database schema (future caching)
- Rate limiting best practices
- Webhook setup guidance (future)
- Troubleshooting guide

---

## ⚙️ TO ACTIVATE THE SYSTEM

### Step 1: Get EZCater API Credentials

You need to obtain an API token from EZCater:

1. **Login to ezManage** (EZCater's management portal)
   - URL: https://manage.ezcater.com/ (or similar - check with EZCater)

2. **Create API User**
   - Navigate to Settings → API or Integrations
   - Create a new API user
   - Generate API token

3. **Save the API Token** (you'll need it for Step 2)

**If you don't have API access yet:**
- Contact EZCater API Support: api_support@ezcater.com
- Request API access for "Public API for Catering Partners"
- Mention you need GraphQL access for order management
- Ask for:
  - API token
  - GraphQL endpoint URL (if different from default)
  - Complete GraphQL schema documentation
  - Sandbox/test environment credentials (if available)

---

### Step 2: Add API Token to Vercel

Once you have the API token:

1. **Go to Vercel Dashboard**
   - https://vercel.com/

2. **Select your project:** `jayna-cash-counter`

3. **Go to:** Settings → Environment Variables

4. **Add new variable:**
   - **Name:** `EZCATER_API_TOKEN`
   - **Value:** (paste your API token from Step 1)
   - **Environment:** Production, Preview, Development (select all)
   - Click "Save"

5. **Optional - Add API URL** (if EZCater gave you a custom endpoint):
   - **Name:** `EZCATER_API_URL`
   - **Value:** (e.g., `https://api.ezcater.com/graphql` or custom URL)
   - **Environment:** Production, Preview, Development (select all)
   - Click "Save"

6. **Redeploy the site:**
   - Go to Deployments tab
   - Click "..." menu on latest deployment
   - Click "Redeploy"
   - This picks up the new environment variables

---

### Step 3: Test the Catering Page

1. **Visit:** https://jayna-cash-counter.vercel.app/catering.html

2. **Expected Behavior:**
   - Loading spinner appears
   - If API token is valid: Orders display (or "No upcoming orders" if none exist)
   - If API token is missing: Error message "EZCater API not configured"
   - If API token is invalid: Error message "EZCater API error"

3. **Check Browser Console** (F12 → Console tab):
   - Look for logs starting with `📦 EZCater API Proxy`
   - Check for errors

4. **Check Vercel Logs:**
   - Go to Vercel Dashboard → Deployments → Latest → Functions
   - Click on `/api/ezcater-proxy`
   - View logs for debugging

---

## 🔗 Navigation Setup (Optional)

### Add Link from Index Page

If you want to link to catering.html from the main page:

**Option 1: Add to Secondary Links**

Edit `index.html`, find the secondary links section (around line 82) and add:

```html
<div class="secondary-links">
  <a href="manager.html">Manager Analytics</a>
  <a href="foh-checklists.html">FOH Checklists</a>
  <a href="catering.html">🍽️ Catering</a>  <!-- ADD THIS -->
</div>
```

**Option 2: Add as Main Menu Button**

Edit `index.html`, find the main menu section and add a new button:

```html
<div class="main-menu">
  <!-- Existing buttons... -->
  <button class="menu-btn" onclick="window.location.href='catering.html'">🍽️ CATERING</button>
</div>
```

---

## 🧪 Testing & Troubleshooting

### If You Get "No Upcoming Orders"

This is NORMAL if:
- Your restaurant has no catering orders in the next 14 days
- You're using a test/sandbox account with no data

**To test with data:**
- Create a test order in ezManage
- Or use EZCater sandbox environment (ask api_support@ezcater.com)

### If You Get "Error loading orders"

**Check:**
1. ✅ EZCATER_API_TOKEN is set in Vercel
2. ✅ Token is valid (not expired)
3. ✅ Token has proper permissions
4. ✅ API URL is correct (if custom)
5. ✅ GraphQL query syntax matches EZCater's schema

**Debug Steps:**
1. Check Vercel Function Logs (see Step 3 above)
2. Check browser console for frontend errors
3. Verify API token in ezManage
4. Test API token manually with curl:

```bash
curl -X POST https://api.ezcater.com/graphql \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { __schema { queryType { name } } }"
  }'
```

If this returns an error, your token/URL is incorrect.

### Common Error Messages

| Error Message | Cause | Solution |
|--------------|-------|----------|
| "EZCater API not configured" | Missing EZCATER_API_TOKEN | Add token to Vercel env vars |
| "Unauthorized" | Invalid/expired token | Get new token from ezManage |
| "Bad request" | Invalid GraphQL syntax | Contact api_support@ezcater.com for schema |
| "Network error" | API URL incorrect | Check EZCATER_API_URL |

---

## 📊 Next Steps (Future Enhancements)

### Phase 2 - Order Details
- [ ] Click order card → opens modal with full details
- [ ] View order items/menu
- [ ] Print order ticket
- [ ] Customer contact information
- [ ] Delivery address

### Phase 3 - Order Management
- [ ] Accept/Reject orders
- [ ] Update order status
- [ ] Assign staff to orders
- [ ] Add prep notes
- [ ] Send customer notifications

### Phase 4 - Past Orders & Analytics
- [ ] PAST tab - view historical orders
- [ ] Filter by date range
- [ ] Search orders
- [ ] ANALYTICS tab - revenue trends, popular items
- [ ] Link EZCater tips to tip pool system

### Phase 5 - Webhooks & Real-Time
- [ ] Set up EZCater webhooks
- [ ] Real-time order notifications
- [ ] Auto-refresh when new orders arrive
- [ ] SMS/email alerts for new catering orders

---

## 📞 Support & Resources

**EZCater API Support:**
- Email: api_support@ezcater.com
- Documentation: https://api.ezcater.io/

**Internal Contact:**
- Project Lead: Demetri Gregorakis
- Built: October 21, 2025

**Files to Reference:**
- `EZCATER_INTEGRATION.md` - Complete technical documentation
- `catering.html` - Frontend catering page
- `api/ezcater-proxy.js` - Backend API proxy

---

## ✅ Summary

**What's Done:**
- ✅ Catering management page built
- ✅ Backend API proxy secure and ready
- ✅ Documentation complete
- ✅ Deployed to Vercel

**What's Needed:**
- ⏳ Get EZCater API token from ezManage
- ⏳ Add EZCATER_API_TOKEN to Vercel environment variables
- ⏳ Test with real orders

**Time to Complete Setup:** ~10 minutes (once you have API token)

---

**End of Setup Guide**
