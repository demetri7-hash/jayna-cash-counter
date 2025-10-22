# EZCATER INTEGRATION DOCUMENTATION

**Created:** October 21, 2025
**Purpose:** Track EZCater catering orders and manage catering operations
**Status:** In Development

---

## Overview

This integration connects Jayna Cash Counter to the EZCater API to fetch, display, and manage catering orders.

### Features Implemented
- ✅ Catering management page (`catering.html`)
- ✅ UPCOMING tab - displays orders for today + next 14 days
- ⏳ Backend API proxy for secure EZCater access
- ⏳ Order details display and management

---

## EZCater API Information

### Official Documentation
- **API Portal:** https://api.ezcater.io/
- **Orders API:** https://api.ezcater.io/orders-api
- **Public API:** https://api.ezcater.io/public-api-for-catering-partners
- **Support:** api_support@ezcater.com

### API Type
- **Protocol:** GraphQL
- **Authentication:** API Token (Bearer token in Authorization header)
- **Webhook Support:** Yes (for real-time order notifications)

### Key API Capabilities
1. **Order Management**
   - Query orders by ID
   - Accept/reject orders
   - Get order modifications
   - Track delivery status

2. **Event Notifications**
   - New order submitted
   - Order modified
   - Order cancelled
   - Delivery updates

3. **Menu Management** (Menu API - separate integration)
   - Sync menu items
   - Update pricing
   - Manage availability

---

## Authentication

### API Token Setup
1. Create API user in **ezManage** (EZCater's management portal)
2. Generate API token
3. Add token to Vercel environment variables:
   ```
   EZCATER_API_TOKEN=your_token_here
   EZCATER_API_URL=https://api.ezcater.com/graphql (or appropriate endpoint)
   ```

### Security
- **CRITICAL:** API token is stored in Vercel environment variables only
- **NEVER** hardcode API token in frontend or commit to GitHub
- All API calls go through `/api/ezcater-proxy.js` backend proxy
- Frontend cannot access token directly

---

## GraphQL Queries

### Fetch Orders (Example Structure)

Based on EZCater documentation, queries likely follow this pattern:

```graphql
query GetOrders($startDate: String!, $endDate: String!) {
  orders(
    filter: {
      deliveryDate: {
        gte: $startDate
        lte: $endDate
      }
    }
  ) {
    id
    orderNumber
    customerName
    customerEmail
    customerPhone
    deliveryDate
    deliveryTime
    headcount
    subtotal
    tax
    tip
    total
    status
    specialInstructions
    items {
      id
      name
      quantity
      price
    }
    deliveryAddress {
      street
      city
      state
      zip
    }
  }
}
```

**Variables:**
```json
{
  "startDate": "2025-10-21",
  "endDate": "2025-11-04"
}
```

### Query Order by ID

```graphql
query GetOrderById($orderId: ID!) {
  orderById(id: $orderId) {
    id
    orderNumber
    customerName
    deliveryDate
    deliveryTime
    status
    total
    # ... additional fields
  }
}
```

---

## Backend API Proxy

### File: `/api/ezcater-proxy.js`

**Purpose:** Secure proxy to EZCater GraphQL API

**Endpoints:**
- `POST /api/ezcater-proxy` - Execute GraphQL queries

**Request Format:**
```javascript
{
  "query": "query GetOrders($startDate: String!) { ... }",
  "variables": {
    "startDate": "2025-10-21"
  }
}
```

**Response Format:**
```javascript
{
  "data": {
    "orders": [...]
  },
  "errors": []  // if any
}
```

**Security:**
- Validates request origin
- Rate limiting (if needed)
- Error sanitization (don't expose internal errors to frontend)

---

## Frontend Implementation

### File: `catering.html`

**Structure:**
1. **Header** - Matches index.html style
2. **Navigation Tabs:**
   - UPCOMING (today + 14 days)
   - PAST (future implementation)
   - ANALYTICS (future implementation)
3. **Order Display:**
   - Cards for each order
   - Date grouping
   - Color-coded by status
   - Click to expand details

**Data Flow:**
```
User loads page
  ↓
JavaScript calls fetchUpcomingOrders()
  ↓
POST to /api/ezcater-proxy with GraphQL query
  ↓
Backend proxy forwards to EZCater API
  ↓
Response returned to frontend
  ↓
Orders displayed in UPCOMING tab
```

---

## Order Display Format

### Upcoming Orders View

**Group by Date:**
```
TODAY - October 21, 2025
  [Order Card 1]
  [Order Card 2]

TOMORROW - October 22, 2025
  [Order Card 3]

Wednesday, October 23, 2025
  [Order Card 4]
```

**Order Card Fields:**
- Order Number (clickable)
- Customer Name
- Delivery Time
- Headcount
- Total Amount
- Status Badge
- Special Instructions (if any)

**Status Colors:**
- 🟢 Confirmed (green)
- 🟡 Pending (yellow)
- 🔴 Cancelled (red)
- 🔵 Delivered (blue)

---

## Database Integration (Future)

### Table: `ezcater_orders`

```sql
CREATE TABLE IF NOT EXISTS ezcater_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ezcater_order_id TEXT UNIQUE NOT NULL,
  order_number TEXT,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  delivery_date DATE,
  delivery_time TIME,
  headcount INTEGER,
  subtotal DECIMAL(10,2),
  tax DECIMAL(10,2),
  tip DECIMAL(10,2),
  total DECIMAL(10,2),
  status TEXT,
  special_instructions TEXT,
  order_data JSONB,  -- Full order object
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Purpose:**
- Cache orders locally
- Reduce API calls
- Enable offline viewing
- Historical analytics

---

## Rate Limiting & Best Practices

### API Call Limits
- EZCater likely has rate limits (TBD - need to test)
- Implement caching to minimize calls
- Use webhooks for real-time updates instead of polling

### Caching Strategy
1. Fetch orders on page load
2. Cache in localStorage (expire after 5 minutes)
3. Refresh button to force re-fetch
4. Auto-refresh every 10 minutes if page is active

### Error Handling
- Network errors: Show "Unable to connect" message
- API errors: Display user-friendly message
- Empty results: Show "No upcoming orders"
- Token expired: Redirect to login (if needed)

---

## Webhooks (Future Implementation)

### Webhook Endpoint: `/api/ezcater-webhook`

**Events to Listen For:**
- `order.created` - New order submitted
- `order.modified` - Order details changed
- `order.cancelled` - Order cancelled
- `order.delivered` - Order marked delivered

**Webhook Handler:**
1. Validate webhook signature (EZCater provides)
2. Parse event data
3. Update database
4. Send notification (email/SMS) if critical
5. Broadcast to frontend via WebSocket (optional)

---

## Testing

### Manual Testing Steps
1. ✅ Load catering.html
2. ✅ Verify header/navigation matches index.html
3. ✅ UPCOMING tab loads
4. ✅ Orders display for today + 14 days
5. ⏳ Click order to view details
6. ⏳ Test with no orders (empty state)
7. ⏳ Test with API error (invalid token)
8. ⏳ Test with network error (offline)

### Test Data
- Use EZCater sandbox/test environment if available
- Contact api_support@ezcater.com for test credentials

---

## Deployment Checklist

- [ ] Environment variables set in Vercel:
  - `EZCATER_API_TOKEN`
  - `EZCATER_API_URL`
- [ ] `/api/ezcater-proxy.js` deployed
- [ ] `catering.html` deployed
- [ ] Link added to index.html navigation (if needed)
- [ ] Test in production environment
- [ ] Monitor API usage/errors in Vercel logs

---

## Troubleshooting

### Common Issues

**1. "Unauthorized" Error**
- Check API token is correct
- Verify token hasn't expired
- Ensure token has proper permissions

**2. "No Orders Found"**
- Verify date range is correct
- Check if restaurant has any catering orders
- Ensure GraphQL query syntax is correct

**3. Orders Not Updating**
- Clear localStorage cache
- Force refresh
- Check if webhooks are set up

**4. CORS Errors**
- Should not happen (backend proxy handles this)
- If occurs, check proxy configuration

---

## Future Enhancements

### Phase 2 Features
- [ ] PAST tab - view historical orders
- [ ] Order details modal
- [ ] Print order tickets
- [ ] Staff assignments
- [ ] Prep checklists per order
- [ ] Customer communication

### Phase 3 Features
- [ ] ANALYTICS tab - order trends
- [ ] Revenue reporting
- [ ] Popular items analysis
- [ ] Customer insights
- [ ] Integration with tip pool (link EZCater tips to orders)

---

## Contact & Support

**EZCater API Support:**
- Email: api_support@ezcater.com
- Documentation: https://api.ezcater.io/

**Internal Documentation:**
- Project Lead: Demetri Gregorakis
- Last Updated: October 21, 2025

---

## Notes from API Research (October 21, 2025)

- EZCater uses GraphQL API (not REST)
- Authentication via Bearer token in `Authorization` header
- Public API documentation is high-level (lacks detailed schema)
- May need to contact api_support@ezcater.com for:
  - Complete GraphQL schema
  - Example queries for date-filtered orders
  - Webhook signature validation details
  - Rate limit specifics
  - Sandbox/test environment access
- Menu API is separate from Orders API
- ezDispatch (third-party delivery) status available in order query

---

**End of Documentation**
