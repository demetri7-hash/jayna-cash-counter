# EZCATER API CAPABILITIES

**Official Documentation:** https://api.ezcater.io/
**Date:** October 21, 2025
**Status:** ✅ VERIFIED AGAINST OFFICIAL DOCS

---

## 🎯 WHAT WE CAN DO WITH THE API

Based on the official EZCater Public API documentation, here are all the capabilities available to us:

---

## 1️⃣ ORDER MANAGEMENT

### Query Orders
```graphql
query GetOrder($orderId: ID!) {
  order(id: $orderId) {
    uuid
    orderNumber
    orderCustomer { firstName, lastName, fullName }
    event {
      timestamp
      catererHandoffFoodTime
      headcount
      address { street, city, state, zip, deliveryInstructions }
      contact { name, phone }
      timeZoneIdentifier
    }
    totals { customerTotalDue, tip, salesTax, subTotal }
    catererCart {
      orderItems {
        uuid, name, quantity, totalInSubunits
        specialInstructions
        menuItemSizeName
        customizations { name, quantity }
      }
      totals { catererTotalDue }
    }
    lifecycle { orderIsCurrently }
    isTaxExempt
    deliveryId
  }
}
```

**What We Get:**
- Full order details including items, customizations, pricing
- Customer contact info (name, phone)
- Delivery address and instructions
- Event details (time, headcount, timezone)
- Tax and tip breakdown
- Order lifecycle status

---

### Accept Orders Programmatically

```graphql
mutation AcceptOrder($orderId: ID!, $acceptModification: Boolean = false) {
  acceptOrder(orderId: $orderId, acceptModification: $acceptModification) {
    order {
      uuid
      orderNumber
      lifecycle { orderIsCurrently }
    }
  }
}
```

**Use Cases:**
- Auto-accept orders based on criteria
- Bulk accept multiple orders
- Accept order modifications

**Error Handling:**
- `404 Couldn't find Order` - Invalid order ID
- `403 Unauthorized` - No permission for this location
- `feature_not_enabled` - Not enabled for your brand
- `invalid_state_transition` - Order already accepted/rejected/cancelled

---

### Reject Orders Programmatically

```graphql
mutation RejectOrder($orderId: ID!, $input: RejectOrderInput!) {
  rejectOrder(orderId: $orderId, input: $input) {
    order {
      uuid
      orderNumber
      lifecycle { orderIsCurrently }
    }
  }
}
```

**Input:**
```json
{
  "orderId": "order-uuid-here",
  "input": {
    "reason": "AT_HOURLY_CAPACITY",
    "explanation": "We're at capacity for this hour. Please try a later time."
  }
}
```

**Rejection Reasons:**
- `AT_DAILY_CAPACITY` - Reached max orders for the day
- `AT_HOURLY_CAPACITY` - Reached max orders for the hour
- `COMMISSION_OR_FEES_TOO_HIGH` - Fees too high
- `DISTANCE_TOO_FAR` - Delivery distance beyond range
- `LEAD_TIME_TOO_SHORT_TO_PREPARE` - Not enough prep time
- `LEAD_TIME_TOO_SHORT_TO_DELIVER` - Not enough delivery time
- `LACK_OF_INVENTORY` - Insufficient ingredients
- `NO_DRIVERS_AVAILABLE` - No drivers available
- `STAFF_SHORTAGE` - Not enough staff
- `TEMPORARILY_CLOSED` - Closed temporarily
- `WEATHER` - Adverse weather conditions
- `WRONG_HOURS` - Outside operational hours
- `REASON_NOT_LISTED` - Other reason (provide explanation)

---

## 2️⃣ EVENT SUBSCRIPTIONS (WEBHOOKS)

### Create Event Subscriptions

```graphql
mutation CreateOrderSubscription($input: CreateEventNotificationSubscriptionInput!) {
  createEventNotificationSubscription(input: $input) {
    eventNotificationSubscription {
      id
      url
      eventEntity
      eventKey
      parentId
      parentEntity
      createdAt
    }
    errors
  }
}
```

**Input:**
```json
{
  "input": {
    "url": "https://jayna-cash-counter.vercel.app/api/ezcater-webhook",
    "eventEntity": "Order",
    "eventKey": "submitted",
    "parentId": "YOUR_CATERER_ID",
    "parentEntity": "Caterer"
  }
}
```

**Event Types:**
- `submitted` - New order received
- `accepted` - Order accepted (by you or via API)
- `rejected` - Order rejected
- `cancelled` - Order cancelled by customer
- `uncancelled` - Cancelled order reinstated

**What Happens:**
1. EZCater sends POST to your webhook URL
2. Payload contains: `{ orderId: "uuid", eventType: "submitted" }`
3. Your webhook fetches full order details using `order(id)` query
4. Save to database for date range queries

---

## 3️⃣ DELIVERY TRACKING

### Assign Courier

```graphql
mutation CourierAssign($input: CourierAssignInput!) {
  courierAssign(input: $input) {
    delivery {
      id
    }
    userErrors {
      message
      path
    }
  }
}
```

**Input:**
```json
{
  "input": {
    "deliveryId": "delivery-uuid-from-order",
    "deliveryServiceProvider": "IN_HOUSE",
    "courier": {
      "id": "courier-123",
      "firstName": "John",
      "lastName": "Doe",
      "phone": "+16175551234",
      "vehicle": {
        "make": "Toyota",
        "model": "Camry",
        "color": "Blue"
      }
    }
  }
}
```

### Track Delivery Events

```graphql
mutation CourierEventCreate($input: CourierEventCreateInput!) {
  courierEventCreate(input: $input) {
    delivery { id }
    userErrors { message }
  }
}
```

**Event Types:**
- `EN_ROUTE_TO_PICKUP` - Courier heading to pickup
- `ARRIVED_AT_PICKUP` - Courier arrived at restaurant
- `PICKED_UP` - Order picked up
- `EN_ROUTE_TO_DROPOFF` - Courier heading to customer
- `ARRIVED_AT_DROPOFF` - Courier arrived at delivery location
- `DROPPED_OFF` - Order delivered

**Use Case:** Real-time delivery tracking for customers

---

## 4️⃣ MENU MANAGEMENT

### Create/Update Menus

```graphql
mutation MenuCreate($input: MenuInput!) {
  menuCreate(input: $input) {
    menuCreationRequestId
    success
    errors {
      message
      details
    }
  }
}
```

**Structure:**
- Categories (sections)
- Items (menu items)
- Options (customizations)
- Choices (customization options)

**Features:**
- Dietary tags (VEGAN, VEGETARIAN, GLUTEN_FREE, etc.)
- Packaging tags (INDIVIDUALLY_WRAPPED)
- Item type tags (DESSERT, DRINKS, UTENSILS)
- Tax categories
- Pricing per size/selection
- Lead times

---

## 🚀 FUTURE ENHANCEMENTS WE CAN BUILD

### Phase 2: Order Details Modal ✅ API Ready
**Capability:** Full order details query available
**Implementation:**
- Click order card → fetch from `order_data` JSONB column
- Display items, customizations, customer contact
- Show delivery instructions
- Print order ticket button

### Phase 3: Accept/Reject Orders ✅ API Ready
**Capability:** `acceptOrder` and `rejectOrder` mutations available
**Implementation:**
- Add "✓ ACCEPT" and "✕ REJECT" buttons to order cards
- Modal for rejection with reason dropdown
- Confirmation before accepting
- Update status in database after mutation
- Show success/error feedback

### Phase 4: Delivery Tracking ✅ API Ready
**Capability:** Full courier assignment and event tracking
**Implementation:**
- Assign in-house drivers to orders
- Send delivery status updates
- Customer tracking page
- Driver mobile app integration

### Phase 5: Menu Sync ✅ API Ready
**Capability:** Full menu CRUD via API
**Implementation:**
- Sync menu from POS system
- Update prices and availability
- Manage seasonal items
- Bulk menu updates

---

## 📊 CURRENT IMPLEMENTATION STATUS

### ✅ Implemented
- [x] Event subscriptions (submitted, accepted, rejected, cancelled)
- [x] Order details query (webhook fetches full order)
- [x] Database caching (fast date range queries)
- [x] Frontend display (upcoming orders)
- [x] Correct GraphQL schema (October 2025 fix)

### 🔜 Ready to Implement (API Available)
- [ ] Accept orders programmatically
- [ ] Reject orders with reasons
- [ ] Order details modal with full item list
- [ ] Delivery courier assignment
- [ ] Delivery event tracking
- [ ] Menu creation/updates

---

## 🔐 AUTHENTICATION

**Headers Required:**
```javascript
{
  'Content-Type': 'application/json',
  'Authorization': process.env.EZCATER_API_TOKEN,  // NO "Bearer" prefix!
  'Apollographql-client-name': 'jayna-catering-system',
  'Apollographql-client-version': '1.0.0'
}
```

**Endpoint:**
```
POST https://api.ezcater.com/graphql
```

---

## 📖 OFFICIAL DOCUMENTATION SECTIONS

1. **Using GraphQL** - Authentication, request format, introspection
2. **Order Details** - Query order information
3. **Order Accept** - Accept orders programmatically
4. **Order Reject** - Reject orders with reasons
5. **Order Schema Reference** - Complete field documentation
6. **Event Subscriptions** - Webhook setup
7. **Delivery API** - Courier tracking
8. **Courier Schema Reference** - Delivery tracking fields
9. **Menus API** - Menu management
10. **Menu Schema Reference** - Menu structure documentation

---

## 🎯 RECOMMENDED NEXT STEPS

### Immediate (After Initial Setup)
1. Test subscription setup with real order
2. Verify order data saves correctly to database
3. Confirm frontend displays orders properly

### Short-term (1-2 weeks)
1. Build order details modal
2. Add accept/reject buttons
3. Implement rejection reason selector
4. Test with real order workflow

### Medium-term (1 month)
1. Add delivery tracking for in-house drivers
2. Build driver assignment interface
3. Customer tracking page

### Long-term (2-3 months)
1. Menu sync from POS system
2. Automated order acceptance based on capacity
3. Analytics dashboard (revenue, popular items)
4. Integration with tip pool system

---

**Last Updated:** October 21, 2025
**Documentation Source:** https://api.ezcater.io/
