# EZCATER API - SCHEMA DISCOVERY GUIDE

**Created:** October 21, 2025
**Status:** Authentication Fixed - Schema Discovery Ready

---

## ⚠️ WHAT I DID WRONG (AND HOW I FIXED IT)

### The Mistake

I **guessed** the EZCater GraphQL schema structure instead of using their official introspection method. This caused HTTP 400 errors because the query structure was wrong.

### The Fix

1. **Fixed Authentication Header** - EZCater uses direct token, NOT `Bearer <token>`
2. **Added Required Headers** - Added Apollo client identification headers
3. **Added Schema Discovery Tool** - Built-in introspection query to discover the REAL schema

---

## ✅ CORRECT AUTHENTICATION FORMAT

### What EZCater Documentation Says:

From https://api.ezcater.io/using-graphql:

```
Headers:
- Content-Type: application/json
- Authorization: <Your API Token>         // DIRECT TOKEN, NO "Bearer" PREFIX!
- Apollographql-client-name: <Your Org>
- Apollographql-client-version: <Version>
```

### What I Implemented (CORRECT):

```javascript
headers: {
  'Content-Type': 'application/json',
  'Authorization': apiToken,  // Direct token
  'Apollographql-client-name': 'jayna-catering-system',
  'Apollographql-client-version': '1.0.0'
}
```

### What I Did Wrong (INCORRECT):

```javascript
// ❌ WRONG - Do NOT use "Bearer" prefix
headers: {
  'Authorization': `Bearer ${apiToken}`  // INCORRECT!
}
```

---

## 🔍 HOW TO DISCOVER THE REAL SCHEMA

### Method 1: Use the Built-In Discovery Button (EASIEST)

1. **Visit:** https://jayna-cash-counter.vercel.app/catering.html
2. **Ensure API token is configured** in Vercel environment variables
3. **Click:** "🔍 DISCOVER SCHEMA (DEBUG)" button
4. **Open Browser Console:** Press F12 → Console tab
5. **View Schema:** Look for `📊 EZCATER API SCHEMA:` in console
6. **Find Orders Query:** Search the output for queries named "order" or "orders"

### Method 2: Manual Introspection Query

Run this query directly through `/api/ezcater-proxy`:

```javascript
const response = await fetch('/api/ezcater-proxy', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: `
      query IntrospectionQuery {
        __schema {
          queryType {
            fields {
              name
              description
              args {
                name
                type { name kind }
              }
            }
          }
        }
      }
    `
  })
});

const data = await response.json();
console.log(JSON.stringify(data, null, 2));
```

### Method 3: Use GraphiQL (RECOMMENDED BY EZCATER)

EZCater recommends using **GraphiQL** for exploring their schema:

1. Install GraphiQL (standalone app or browser extension)
2. Configure endpoint: `https://api.ezcater.com/graphql`
3. Add headers:
   ```
   Authorization: YOUR_API_TOKEN
   Apollographql-client-name: jayna-catering-system
   Apollographql-client-version: 1.0.0
   ```
4. Use built-in schema explorer

---

## 📋 WHAT TO LOOK FOR IN THE SCHEMA

When you run introspection, you'll get a JSON response. Look for queries related to orders:

### Example Schema Output (Hypothetical):

```json
{
  "data": {
    "__schema": {
      "queryType": {
        "fields": [
          {
            "name": "orderById",
            "description": "Get order by ID",
            "args": [
              {
                "name": "id",
                "type": { "name": "ID", "kind": "SCALAR" }
              }
            ]
          },
          {
            "name": "orders",
            "description": "Get list of orders",
            "args": [
              {
                "name": "first",
                "type": { "name": "Int", "kind": "SCALAR" }
              },
              {
                "name": "after",
                "type": { "name": "String", "kind": "SCALAR" }
              }
            ]
          }
        ]
      }
    }
  }
}
```

**Key Things to Find:**
1. **Query Name** - Is it `orders`, `getOrders`, `ordersList`, etc.?
2. **Arguments** - What parameters does it accept? (date filters, pagination, etc.)
3. **Return Type** - What fields can you request?
4. **Field Names** - Are they `deliveryDate` or `delivery_date`? `customerName` or `customer_name`?

---

## 🔧 HOW TO UPDATE THE CODE WITH REAL SCHEMA

Once you discover the real schema:

### Step 1: Find the Correct Query Format

Look for queries that accept date filters. Common patterns:

**Pattern 1: Direct date range arguments**
```graphql
query GetOrders($startDate: Date!, $endDate: Date!) {
  orders(startDate: $startDate, endDate: $endDate) {
    id
    orderNumber
    ...
  }
}
```

**Pattern 2: Filter object**
```graphql
query GetOrders($filter: OrderFilter!) {
  orders(filter: $filter) {
    nodes {
      id
      orderNumber
      ...
    }
  }
}
```

**Pattern 3: Pagination with cursor**
```graphql
query GetOrders($first: Int!, $after: String) {
  orders(first: $first, after: $after) {
    edges {
      node {
        id
        orderNumber
        ...
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
```

### Step 2: Update catering.html

Replace the guessed query in `fetchUpcomingOrders()` (line ~443) with the real format:

```javascript
// EXAMPLE - Replace with REAL format from schema
body: JSON.stringify({
  query: `
    query GetOrders {
      orders(first: 100) {  // Use actual query name and args from schema
        edges {
          node {
            id
            orderNumber  // Use actual field names from schema
            customer {
              name
            }
            deliveryDate
            deliveryTime
            headCount
            total
            status
          }
        }
      }
    }
  `
})
```

### Step 3: Update Data Processing

Update `displayUpcomingOrders()` to match the response structure:

```javascript
// If response is edges/nodes format:
const orders = data.data?.orders?.edges?.map(edge => edge.node) || [];

// If response is direct array:
const orders = data.data?.orders || [];

// If response has pagination:
const orders = data.data?.orders?.nodes || [];
```

---

## 🧪 TESTING WORKFLOW

1. **Set API Token** in Vercel environment variables
2. **Deploy** the updated code
3. **Visit catering.html**
4. **Click** "DISCOVER SCHEMA"
5. **Check Console** - look for the schema output
6. **Identify** the correct query format
7. **Update** `fetchUpcomingOrders()` with real query
8. **Click** "REFRESH ORDERS"
9. **Verify** orders display correctly

---

## 📞 IF SCHEMA DISCOVERY FAILS

### Common Issues:

**1. "EZCater API not configured"**
- API token missing from Vercel
- Solution: Add EZCATER_API_TOKEN to environment variables

**2. "Unauthorized" or 401 Error**
- Invalid or expired API token
- Solution: Generate new token in ezManage

**3. "Forbidden" or 403 Error**
- Token doesn't have introspection permissions
- Solution: Contact api_support@ezcater.com to enable introspection

**4. "Bad Request" or 400 Error**
- Introspection query syntax error
- Solution: Check browser console for details

### Contact EZCater Support:

If you can't get introspection working:
- Email: **api_support@ezcater.com**
- Ask for:
  - Complete GraphQL schema documentation
  - Example queries for fetching orders by date range
  - Field names for order details
  - Pagination format

---

## 📚 REFERENCE LINKS

- **EZCater API Docs:** https://api.ezcater.io/
- **Using GraphQL:** https://api.ezcater.io/using-graphql
- **Orders API:** https://api.ezcater.io/orders-api
- **GraphQL Introspection:** https://graphql.org/learn/introspection/

---

## ✅ SUMMARY

**What I Fixed:**
- ✅ Authentication header format (removed "Bearer" prefix)
- ✅ Added Apollo client headers
- ✅ Built schema discovery tool

**Next Steps:**
1. Run "DISCOVER SCHEMA" button
2. Find real query format in console output
3. Update fetchUpcomingOrders() with correct query
4. Test with real orders

**Key Lesson:**
Always use **introspection** to discover GraphQL schemas instead of guessing. EZCater's documentation explicitly says to use this method.

---

**End of Schema Discovery Guide**
