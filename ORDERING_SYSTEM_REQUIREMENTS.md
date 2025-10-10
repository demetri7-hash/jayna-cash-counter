# Integrated Ordering System - Project Requirements

## Project Goal
Build a comprehensive restaurant supply ordering system fully integrated into the existing root `index.html` file. The system must seamlessly match the existing tech stack and design patterns.

## Core Mandates & Constraints

### 1. Single-File Integration
- **DO NOT** create a new orders directory or separate HTML/CSS/JS files
- All new HTML, CSS, and JavaScript must be added directly into the root `index.html` file
- Integration must be seamless with existing functionality

### 2. Existing Tech Stack
- **DO NOT** use React, Vite, or any external framework for the UI
- Use: Vanilla JavaScript, HTML, and CSS within the single file
- Use JSDoc annotations for type-safety and code clarity
- Follow existing code patterns and conventions

### 3. UI/UX Consistency
- **EXACTLY** replicate the visual style and user flow of existing AM/PM cash count forms
- Reuse existing CSS classes:
  - `.form-section` - Main container
  - `.table-container` - Tables
  - `button`, `input` - Form controls
  - `.tabs`, `.tab-link` - Tab navigation
  - `.form-group`, `.form-input`, `.form-select` - Form elements
  - `.submit-btn` - Action buttons
  - `.grand-total`, `.amount` - Display totals

## Functional Requirements (User Stories)

### 1. Inventory & Par Level Management
- Display a master list of all inventory items fetched from the database
- Allow the user to edit the "par level" for each item directly in the list
- Changes to par levels must be immediately saved to the Supabase database
- Items grouped/filterable by vendor

### 2. Inventory Counting
- Provide an interface for the user to update current on-hand ("current stock") count for each item
- Designed for easy, frequent updates
- Quick entry interface (similar to cash counting denominations)
- Real-time calculation of order quantities as counts are updated

### 3. Automated Order Calculation
- Automatically calculate and display suggested orders for the upcoming week based on current date
- Calculation logic: **Quantity to Order = (Par Level) - (Current On-Hand Stock)**
- Negative results displayed as 0
- Orders organized by vendor and delivery date

### 4. Vendor-Specific Logic

#### Greenleaf
- **Order Days:** Daily (except Saturday for Sunday)
- **Cutoff Time:** 10:00 PM
- **Delivery:** Next morning (Daily except Sunday)
- **Special Rule:** Friday's order by 10 PM must calculate a 2-day supply for Saturday + Sunday

#### Performance
- **Order Days:** Sunday and Wednesday
- **Cutoff Time:** 3:00 PM
- **Delivery:** Next morning (Monday for Sunday orders, Thursday for Wednesday orders)
- **Notes:** Primary vendor for dry goods, frozen breads, and proteins

#### Mani Imports
- **Order Days:** Tuesday and Thursday
- **Cutoff Time:** 3:00 PM
- **Delivery:** Typically next day
- **Tuesday:** Smaller order to bridge the gap (3-day supply)
- **Thursday:** Larger order for next 5 days, covering the weekend

#### Eatopia Foods
- **Order Days:** Any day (flexible)
- **Cutoff Time:** Best to order by Wednesday
- **Delivery:** Always on Thursday (fixed delivery day)
- **Method:** Text message to rep
- **Notes:** Baklava and Turkish delights only

#### Ecolab
- **Order Days:** As needed (every 2-4 weeks)
- **Method:** Phone call to customer service
- **Notes:** Manual monitoring required - DO NOT auto-calculate
- **Display:** Reminder section only

### 5. Manual Item Entry
- Form within inventory management view to manually add new inventory items
- Required fields:
  - Item Name (text input)
  - Vendor (dropdown: Greenleaf, Performance, Mani Imports, Eatopia, Ecolab)
  - Unit (text input: CS, EA, LB, Bags, Buckets, DZ, etc.)
  - Par Level (number input)
- Initial stock count set to 0 on creation

### 6. Printing & PDF Generation
- Each calculated order display includes:
  - **Print** button (browser print dialog)
  - **Generate PDF** button (download individual order)
- Master **"Generate All PDFs"** button:
  - Downloads single PDF containing all upcoming orders for the week
  - Organized by vendor and date
  - Includes order details, cutoff times, and delivery dates

## Implementation Guide for AI Coder

### HTML Structure (within index.html)

#### Main Menu Button
```html
<!-- Add to main menu section (around line 724) -->
<button class="menu-btn" onclick="requirePasswordFor('Ordering System', startOrderingSystem)">
  Ordering System
</button>
```

#### Main Ordering System Section
```html
<!-- Add after existing form sections (after tip pool section) -->
<div id="orderingSystemForm" class="form-section" style="display: none;">
  <h2 style="margin-bottom: 20px; color: #1e3c72;">Restaurant Ordering System</h2>

  <!-- Tab Navigation -->
  <div class="tabs">
    <button class="tab-link active" onclick="openOrderTab('upcomingOrders')">
      Upcoming Orders
    </button>
    <button class="tab-link" onclick="openOrderTab('manageInventory')">
      Manage Inventory
    </button>
    <button class="tab-link" onclick="openOrderTab('updateCounts')">
      Update Counts
    </button>
  </div>

  <!-- Tab Content Containers -->
  <div id="upcomingOrders" class="tab-content active">
    <!-- Dynamically populated with calculated orders -->
  </div>

  <div id="manageInventory" class="tab-content" style="display: none;">
    <!-- Inventory list with par level editing -->
    <!-- Form for adding new items -->
  </div>

  <div id="updateCounts" class="tab-content" style="display: none;">
    <!-- Stock counting interface -->
  </div>

  <button class="submit-btn" onclick="goHome()" style="margin-top: 20px;">
    Back to Menu
  </button>
</div>
```

### JavaScript Logic (within <script> tag)

#### Data Models (JSDoc)
```javascript
/**
 * @typedef {Object} InventoryItem
 * @property {number} id - Database ID
 * @property {string} itemName - Full name with packaging
 * @property {string} vendor - Vendor name
 * @property {number} parLevel - Target stock level
 * @property {number} currentStock - Current on-hand quantity
 * @property {string} unit - Unit of measurement (CS, EA, LB, etc.)
 */

/**
 * @typedef {Object} VendorSchedule
 * @property {string} name - Vendor name
 * @property {string[]} orderDays - Days when orders can be placed
 * @property {string} cutoffTime - Order cutoff time
 * @property {string} deliveryPattern - Delivery schedule
 * @property {string} orderingMethod - How to place order
 * @property {string} notes - Special instructions
 */

/**
 * @typedef {Object} CalculatedOrder
 * @property {string} vendor - Vendor name
 * @property {Date} orderDate - When to place order
 * @property {string} cutoffTime - Order deadline
 * @property {Date} deliveryDate - Expected delivery
 * @property {OrderItem[]} items - Items to order
 * @property {string} [notes] - Special instructions
 */

/**
 * @typedef {Object} OrderItem
 * @property {string} itemName - Item name
 * @property {number} quantity - Quantity to order
 * @property {string} unit - Unit of measurement
 */
```

#### State Management
```javascript
/**
 * Global state for ordering system
 */
const orderingSystemState = {
  /** @type {InventoryItem[]} */
  items: [],
  /** @type {VendorSchedule[]} */
  vendors: [],
  /** @type {CalculatedOrder[]} */
  calculatedOrders: [],
  currentTab: 'upcomingOrders',
  lastUpdated: null
};
```

#### Core Functions

**Navigation**
```javascript
async function startOrderingSystem() {
  hideAllSections();
  document.getElementById('orderingSystemForm').style.display = 'block';
  await loadInventoryData();
  calculateUpcomingOrders();
  openOrderTab('upcomingOrders');
}

function openOrderTab(tabName) {
  // Hide all tabs
  const tabs = document.querySelectorAll('.tab-content');
  tabs.forEach(tab => tab.style.display = 'none');

  // Remove active class from all tab links
  const links = document.querySelectorAll('.tab-link');
  links.forEach(link => link.classList.remove('active'));

  // Show selected tab
  document.getElementById(tabName).style.display = 'block';

  // Update active tab link
  event.target.classList.add('active');

  orderingSystemState.currentTab = tabName;
}
```

**Database Operations**
```javascript
async function loadInventoryData() {
  if (!supabase) throw new Error('Database not connected');

  showLoading('Loading Inventory', 'Fetching items from database...');

  try {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .order('vendor', { ascending: true })
      .order('itemName', { ascending: true });

    if (error) throw error;

    orderingSystemState.items = data || [];
    orderingSystemState.lastUpdated = new Date();

    renderInventoryList();
    hideLoading();
  } catch (error) {
    hideLoading();
    showMessage(`Error loading inventory: ${error.message}`, 'error');
  }
}

async function updateParLevelInDB(itemId, newParLevel) {
  if (!supabase) throw new Error('Database not connected');

  const { error } = await supabase
    .from('inventory_items')
    .update({ parLevel: newParLevel })
    .eq('id', itemId);

  if (error) throw new Error(`Failed to update par level: ${error.message}`);

  // Update local state
  const item = orderingSystemState.items.find(i => i.id === itemId);
  if (item) item.parLevel = newParLevel;

  // Recalculate orders
  calculateUpcomingOrders();
}

async function updateStockCountInDB(itemId, newStock) {
  if (!supabase) throw new Error('Database not connected');

  const { error } = await supabase
    .from('inventory_items')
    .update({
      currentStock: newStock,
      lastCountedDate: new Date().toISOString()
    })
    .eq('id', itemId);

  if (error) throw new Error(`Failed to update stock: ${error.message}`);

  // Update local state
  const item = orderingSystemState.items.find(i => i.id === itemId);
  if (item) item.currentStock = newStock;

  // Recalculate orders
  calculateUpcomingOrders();
}

async function addNewItemToDB(itemData) {
  if (!supabase) throw new Error('Database not connected');

  const { data, error } = await supabase
    .from('inventory_items')
    .insert([{
      itemName: itemData.itemName,
      vendor: itemData.vendor,
      parLevel: itemData.parLevel,
      currentStock: 0,
      unit: itemData.unit,
      createdDate: new Date().toISOString()
    }])
    .select();

  if (error) throw new Error(`Failed to add item: ${error.message}`);

  // Add to local state
  orderingSystemState.items.push(data[0]);

  showMessage('Item added successfully!', 'success');
  await loadInventoryData();
}
```

**Order Calculation Engine**
```javascript
function calculateUpcomingOrders() {
  const now = new Date();
  const orders = [];

  // Get next 7 days
  for (let i = 0; i < 7; i++) {
    const checkDate = new Date(now);
    checkDate.setDate(checkDate.getDate() + i);

    // Check each vendor's schedule for this date
    const dayName = checkDate.toLocaleDateString('en-US', { weekday: 'long' });

    // Greenleaf - Daily orders
    if (dayName !== 'Saturday') { // No Saturday orders (Sunday delivery doesn't exist)
      const greenleafOrder = calculateGreenleafOrder(checkDate);
      if (greenleafOrder) orders.push(greenleafOrder);
    }

    // Performance - Sunday and Wednesday
    if (dayName === 'Sunday' || dayName === 'Wednesday') {
      const performanceOrder = calculatePerformanceOrder(checkDate);
      if (performanceOrder) orders.push(performanceOrder);
    }

    // Mani Imports - Tuesday and Thursday
    if (dayName === 'Tuesday' || dayName === 'Thursday') {
      const maniOrder = calculateManiOrder(checkDate, dayName);
      if (maniOrder) orders.push(maniOrder);
    }

    // Eatopia - Any Wednesday for Thursday delivery
    if (dayName === 'Wednesday') {
      const eatopiaOrder = calculateEatopiaOrder(checkDate);
      if (eatopiaOrder) orders.push(eatopiaOrder);
    }
  }

  orderingSystemState.calculatedOrders = orders;
  renderUpcomingOrders();
}

function calculateGreenleafOrder(orderDate) {
  const dayName = orderDate.toLocaleDateString('en-US', { weekday: 'long' });
  const isFriday = dayName === 'Friday';
  const multiplier = isFriday ? 2 : 1; // Friday order covers Sat + Sun

  const items = orderingSystemState.items
    .filter(item => item.vendor === 'Greenleaf')
    .map(item => ({
      itemName: item.itemName,
      quantity: Math.max(0, Math.ceil((item.parLevel - item.currentStock) * multiplier)),
      unit: item.unit
    }))
    .filter(item => item.quantity > 0);

  if (items.length === 0) return null;

  const deliveryDate = new Date(orderDate);
  deliveryDate.setDate(deliveryDate.getDate() + 1);

  return {
    vendor: 'Greenleaf',
    orderDate: orderDate,
    cutoffTime: '10:00 PM',
    deliveryDate: deliveryDate,
    items: items,
    notes: isFriday ? '2-day supply for Saturday and Sunday' : null
  };
}

// Similar functions for other vendors...
```

**UI Rendering**
```javascript
function renderUpcomingOrders() {
  const container = document.getElementById('upcomingOrders');

  if (orderingSystemState.calculatedOrders.length === 0) {
    container.innerHTML = '<p style="text-align: center; padding: 40px;">No orders needed in the next 7 days.</p>';
    return;
  }

  let html = `
    <div style="margin-bottom: 20px;">
      <button class="submit-btn" onclick="generateAllPDFs()">
        Generate All PDFs
      </button>
    </div>
  `;

  orderingSystemState.calculatedOrders.forEach((order, index) => {
    html += `
      <div class="order-card" id="order-${index}" style="
        border: 2px solid #1e3c72;
        margin-bottom: 20px;
        padding: 15px;
        border-radius: 4px;
      ">
        <h3 style="color: #1e3c72; margin-bottom: 10px;">
          ${order.vendor} - Order #${index + 1}
        </h3>
        <div class="form-group">
          <strong>Order Date:</strong> ${order.orderDate.toLocaleDateString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
          })}
        </div>
        <div class="form-group">
          <strong>Cutoff Time:</strong> ${order.cutoffTime}
        </div>
        <div class="form-group">
          <strong>Delivery Date:</strong> ${order.deliveryDate.toLocaleDateString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
          })}
        </div>
        ${order.notes ? `<div class="form-group"><strong>Notes:</strong> ${order.notes}</div>` : ''}

        <table class="table-container" style="margin-top: 15px;">
          <thead>
            <tr>
              <th>Item</th>
              <th>Quantity</th>
              <th>Unit</th>
            </tr>
          </thead>
          <tbody>
            ${order.items.map(item => `
              <tr>
                <td>${item.itemName}</td>
                <td>${item.quantity}</td>
                <td>${item.unit}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div style="margin-top: 15px;">
          <button class="submit-btn" onclick="printOrder(${index})" style="margin-right: 10px;">
            Print Order
          </button>
          <button class="submit-btn" onclick="generateOrderPDF(${index})">
            Generate PDF
          </button>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}
```

## Database Schema

### Table: `inventory_items`
```sql
CREATE TABLE inventory_items (
  id BIGSERIAL PRIMARY KEY,
  itemName TEXT NOT NULL,
  vendor TEXT NOT NULL,
  parLevel INTEGER NOT NULL DEFAULT 0,
  currentStock INTEGER NOT NULL DEFAULT 0,
  unit TEXT NOT NULL,
  createdDate TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  lastCountedDate TIMESTAMP WITH TIME ZONE,
  notes TEXT
);

-- Index for faster vendor queries
CREATE INDEX idx_inventory_vendor ON inventory_items(vendor);
```

## Next Steps
1. Create database table in Supabase
2. Seed initial data from masterItemList JSON
3. Implement all JavaScript functions
4. Test vendor-specific order calculations
5. Implement PDF generation
6. Deploy and test in production

## Notes
- Ecolab orders are manual - display reminder only, no auto-calculation
- Friday Greenleaf orders must multiply by 2 for weekend coverage
- Mani Imports Tuesday = 3-day supply, Thursday = 5-day supply
- Eatopia delivery is ALWAYS Thursday regardless of order date
