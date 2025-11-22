# JAYNA GYRO iOS APP - MASTER DEVELOPMENT PROMPT
## Complete Conversion from Web App to Native iOS Application

**Target:** Convert the existing Jayna Gyro web application into a native iOS app for iPhone
**Current Web App URL:** https://jayna-cash-counter.vercel.app
**Development Tool:** Claude Code in VS Code
**Language:** Swift with SwiftUI
**Minimum iOS Version:** iOS 16.0+

---

## 🎯 PROJECT OVERVIEW

You are tasked with rebuilding the complete Jayna Gyro restaurant management web application as a native iOS app. This is NOT a simple WebView wrapper - this must be a fully native Swift/SwiftUI application that replicates all functionality, business logic, API integrations, and user experiences from the web version.

The web app is a comprehensive restaurant operations platform with 12 integrated modules. Your iOS app must maintain feature parity while leveraging native iOS capabilities for improved performance, offline functionality, and user experience.

---

## 📱 APPLICATION ARCHITECTURE

### **Tech Stack Requirements**
- **Language:** Swift 5.9+
- **UI Framework:** SwiftUI (primary) with UIKit integration where needed
- **Architecture:** MVVM (Model-View-ViewModel)
- **Networking:** URLSession with async/await
- **Database:** 
  - Remote: Supabase (PostgreSQL) - maintain existing backend
  - Local: Core Data or Realm for offline caching
- **Authentication:** Supabase Auth
- **File Storage:** Supabase Storage for photos/documents
- **API Integrations:** Toast POS, ezCater, Homebase, Google Calendar

### **Project Structure**
```
JaynaGyro/
├── App/
│   ├── JaynaGyroApp.swift (App entry point)
│   └── AppDelegate.swift (if needed for background tasks)
├── Models/
│   ├── CashCount.swift
│   ├── CateringOrder.swift
│   ├── Employee.swift
│   ├── PrepItem.swift
│   ├── TipPool.swift
│   └── ... (one model per entity)
├── ViewModels/
│   ├── CashCountViewModel.swift
│   ├── CateringViewModel.swift
│   └── ... (one per major feature)
├── Views/
│   ├── Cash/
│   │   ├── AMCountView.swift
│   │   ├── PMCountView.swift
│   │   └── CashHistoryView.swift
│   ├── Catering/
│   │   ├── CateringListView.swift
│   │   ├── CateringDetailView.swift
│   │   ├── CateringFormView.swift
│   │   └── PhotoGalleryView.swift
│   ├── TipPool/
│   │   ├── TipPoolCalculatorView.swift
│   │   ├── TDSDriverFetchView.swift
│   │   └── TipDistributionView.swift
│   ├── Prep/
│   │   ├── PrepListView.swift
│   │   ├── PrepItemDetailView.swift
│   │   └── BOHChecklistView.swift
│   └── ... (organized by module)
├── Services/
│   ├── SupabaseService.swift
│   ├── ToastAPIService.swift
│   ├── EzCaterService.swift
│   ├── HomebaseService.swift
│   ├── GoogleCalendarService.swift
│   └── PrintService.swift
├── Utilities/
│   ├── Constants.swift
│   ├── Extensions.swift
│   ├── Formatters.swift
│   └── DateHelpers.swift
└── Resources/
    ├── Assets.xcassets
    └── Info.plist
```

---

## 🗄️ DATABASE SCHEMA (SUPABASE)

### **Critical: Use EXISTING Supabase Database**
Do NOT create a new database. Connect to the existing Supabase instance that the web app uses.

**Connection Details (from .env):**
```swift
let SUPABASE_URL = "https://your-project.supabase.co"
let SUPABASE_ANON_KEY = "your_anon_key"
```

### **Primary Tables & Models**

#### **1. cash_counts Table**
```swift
struct CashCount: Codable, Identifiable {
    let id: UUID
    let date: Date
    
    // AM Operations
    var amCounter: String
    var amTimestamp: Date?
    var amTotal: Decimal
    var amDrawer1Total: Decimal
    var amDrawer1Skip: Bool
    var amDrawer1SkipReason: String?
    var amDrawer1Data: DenominationData?
    var amDrawer2Total: Decimal
    var amDrawer2Skip: Bool
    var amDrawer2SkipReason: String?
    var amDrawer2Data: DenominationData?
    var amNotes: String?
    
    // PM Operations
    var pmCounter: String?
    var pmTimestamp: Date?
    var pmTotal: Decimal
    var pmCashTips: Decimal
    var pmToastSales: Decimal
    var pmDrawer1Total: Decimal
    var pmDrawer1Skip: Bool
    var pmDrawer1SkipReason: String?
    var pmDrawer1Data: DenominationData?
    var pmDrawer2Total: Decimal
    var pmDrawer2Skip: Bool
    var pmDrawer2SkipReason: String?
    var pmDrawer2Data: DenominationData?
    var pmNotes: String?
    
    // Calculated Fields (V2.84 Enhanced)
    var pmDiscrepancy: Decimal
    var pmAdjustedTips: Decimal
    var pmDrawerOverAmount: Decimal
    var pmDepositAmount: Decimal
    var pmAmountToKeep: Decimal
}

struct DenominationData: Codable {
    var hundreds: Int
    var fifties: Int
    var twenties: Int
    var tens: Int
    var fives: Int
    var ones: Int
    var quarters: Int
    var dimes: Int
    var nickels: Int
    var pennies: Int
    
    func calculateTotal() -> Decimal {
        return Decimal(hundreds * 100 +
                      fifties * 50 +
                      twenties * 20 +
                      tens * 10 +
                      fives * 5 +
                      ones * 1) +
               Decimal(quarters) * 0.25 +
               Decimal(dimes) * 0.10 +
               Decimal(nickels) * 0.05 +
               Decimal(pennies) * 0.01
    }
}
```

#### **2. catering_orders Table**
```swift
struct CateringOrder: Codable, Identifiable {
    let id: UUID
    var orderNumber: String?
    var customerName: String
    var customerEmail: String?
    var customerPhone: String?
    var customerCompany: String?
    
    var eventDate: Date
    var eventTime: String
    var setupTime: String?
    var eventLocation: String
    var eventType: String?
    
    var guestCount: Int?
    var quotedPrice: Decimal?
    var finalPrice: Decimal?
    var deposit: Decimal?
    var balanceDue: Decimal?
    
    var status: OrderStatus // enum: quoted, confirmed, in_progress, completed
    var source: OrderSource // enum: manual, ezcater, toast
    
    var menuItems: String? // JSON or separate table
    var specialInstructions: String?
    var dietaryRestrictions: String?
    
    // BEO Fields
    var beoDeliveryMethod: String?
    var beoServiceStyle: String?
    var beoEquipmentNeeded: [String]?
    var beoStaffingNeeds: String?
    
    // Integration IDs
    var ezcaterOrderId: String?
    var ezcaterOrderUuid: String?
    var toastGuid: String?
    var googleCalendarEventId: String?
    
    // Metadata
    var createdAt: Date
    var updatedAt: Date
    var createdBy: String?
    
    // Photos
    var hasPhotos: Bool
    var photoCount: Int
    
    // Emoji/Label
    var emoji: String?
}

enum OrderStatus: String, Codable {
    case quoted, confirmed, inProgress = "in_progress", completed, cancelled
}

enum OrderSource: String, Codable {
    case manual, ezcater, toast
}
```

#### **3. catering_photos Table**
```swift
struct CateringPhoto: Codable, Identifiable {
    let id: UUID
    var orderId: UUID // FK to catering_orders
    var imageUrl: String // Supabase Storage URL
    var thumbnailUrl: String?
    var caption: String?
    var displayOrder: Int
    var uploadedAt: Date
    var uploadedBy: String?
    
    // Metadata
    var actualOrderNumber: String? // Matched to order
    var customerName: String?
    var isArchived: Bool
}
```

#### **4. foh_checklists Table**
```swift
struct FOHChecklist: Codable, Identifiable {
    let id: UUID
    var taskId: String // Unique task identifier
    var title: String
    var description: String?
    var category: String // opening, closing, transition
    var department: String // FOH
    var displayOrder: Int
    
    var isCompleted: Bool
    var completedBy: String?
    var completedAt: Date?
    var notes: String?
    
    var date: Date
    var shiftType: String // AM, PM
}
```

#### **5. prep_locations Table**
```swift
struct PrepLocation: Codable, Identifiable {
    let id: UUID
    var name: String
    var zoneNumber: Int?
    var description: String?
    var displayOrder: Int
}
```

#### **6. prep_count_log Table**
```swift
struct PrepCountLog: Codable, Identifiable {
    let id: UUID
    var itemName: String
    var prepLocation: String
    var countedAmount: Int
    var expectedAmount: Int?
    var countedBy: String
    var countedAt: Date
    var notes: String?
}
```

---

## 💰 MODULE 1: CASH MANAGEMENT SYSTEM

### **Critical Business Logic - DO NOT SKIP**

#### **AM Count Workflow**

**Purpose:** Establish starting cash baseline for the day

**UI Flow:**
1. **Name Selection Screen**
   - Dropdown/Picker with staff names
   - Required field (cannot proceed without selection)
   - Names stored in UserDefaults for quick access
   
2. **Date Selection**
   - Defaults to TODAY (Pacific timezone)
   - Password-protected for historical dates (password: "JaynaGyro2025!")
   - Show banner if editing historical date
   
3. **Drawer 1 Count**
   - Numeric input fields for each denomination:
     * Bills: $100, $50, $20, $10, $5, $1
     * Coins: Quarters, Dimes, Nickels, Pennies
   - Real-time total calculation display
   - **Skip Option:**
     * Toggle "Skip Drawer 1"
     * If toggled, show required text field: "Reason for skipping"
     * Cannot submit without reason
   
4. **Drawer 2 Count** (same as Drawer 1)

5. **Notes for PM Shift**
   - Multi-line text field
   - Optional
   - Placeholder: "Any notes for the PM counter..."
   
6. **Submit**
   - Calculate total: drawer1 + drawer2
   - Save to Supabase
   - Show success confirmation
   - Navigate to home

**Validation Rules:**
- Name is required
- Date is required
- If drawer NOT skipped: at least one denomination must be > 0
- If drawer IS skipped: reason is required (min 3 characters)

**SwiftUI Implementation Pattern:**
```swift
struct AMCountView: View {
    @StateObject private var viewModel = CashCountViewModel()
    @State private var selectedName: String = ""
    @State private var selectedDate: Date = Date()
    @State private var showPasswordAlert = false
    
    // Drawer 1
    @State private var d1Hundreds: String = "0"
    @State private var d1Fifties: String = "0"
    // ... all denominations
    @State private var d1Skip: Bool = false
    @State private var d1SkipReason: String = ""
    
    // Drawer 2
    @State private var d2Hundreds: String = "0"
    // ... all denominations
    @State private var d2Skip: Bool = false
    @State private var d2SkipReason: String = ""
    
    @State private var notes: String = ""
    
    var drawer1Total: Decimal {
        // Calculate from denomination values
    }
    
    var drawer2Total: Decimal {
        // Calculate from denomination values
    }
    
    var grandTotal: Decimal {
        drawer1Total + drawer2Total
    }
    
    var body: some View {
        Form {
            // Name selection section
            Section("Who's counting?") {
                Picker("Counter Name", selection: $selectedName) {
                    ForEach(viewModel.staffNames, id: \.self) { name in
                        Text(name)
                    }
                }
            }
            
            // Date section
            Section("Date") {
                DatePicker("Count Date", selection: $selectedDate, displayedComponents: .date)
                    .onChange(of: selectedDate) { newDate in
                        if !Calendar.current.isDateInToday(newDate) {
                            showPasswordAlert = true
                        }
                    }
            }
            
            // Drawer 1 section
            Section("Drawer 1") {
                Toggle("Skip Drawer 1", isOn: $d1Skip)
                
                if d1Skip {
                    TextField("Reason for skipping", text: $d1SkipReason)
                } else {
                    // Denomination inputs
                    DenominationInputGroup(
                        hundreds: $d1Hundreds,
                        fifties: $d1Fifties,
                        // ... all fields
                    )
                }
                
                Text("Drawer 1 Total: \(drawer1Total, format: .currency(code: "USD"))")
                    .bold()
            }
            
            // Drawer 2 section (similar to Drawer 1)
            
            // Notes section
            Section("Notes for PM Shift") {
                TextEditor(text: $notes)
                    .frame(minHeight: 80)
            }
            
            // Total display
            Section {
                HStack {
                    Text("TOTAL CASH")
                        .font(.headline)
                    Spacer()
                    Text(grandTotal, format: .currency(code: "USD"))
                        .font(.title2)
                        .bold()
                        .foregroundColor(.blue)
                }
            }
            
            // Submit button
            Section {
                Button("Submit AM Count") {
                    Task {
                        await viewModel.submitAMCount(
                            date: selectedDate,
                            counter: selectedName,
                            drawer1: getDenominationData(from: d1),
                            drawer1Skip: d1Skip,
                            drawer1SkipReason: d1SkipReason,
                            drawer2: getDenominationData(from: d2),
                            drawer2Skip: d2Skip,
                            drawer2SkipReason: d2SkipReason,
                            notes: notes
                        )
                    }
                }
                .disabled(!isValid)
            }
        }
    }
}
```

#### **PM Count Workflow**

**Purpose:** Calculate deposit, reconcile cash, distribute tips

**Complex Calculation Logic (V2.84 Enhanced):**

```swift
struct PMCalculationResult {
    let drawerChange: Decimal
    let expectedCashIn: Decimal
    let discrepancy: Decimal
    let depositAmount: Decimal // Rounded to whole dollars
    let adjustedTips: Decimal // After absorbing rounding
    let returnAmount: Decimal // Back to cashbox
    let depositRoundingAdjustment: Decimal
    let depositTipAdjustment: Decimal
    let depositExcessToCashbox: Decimal
    let shortageTipAdjustment: Decimal
}

func calculatePMAmounts(
    amTotal: Decimal,
    pmTotal: Decimal,
    toastSales: Decimal,
    cashTips: Decimal
) -> PMCalculationResult {
    
    // Step 1: Basic calculations
    let drawerChange = pmTotal - amTotal
    let expectedCashIn = toastSales + cashTips
    let discrepancy = drawerChange - expectedCashIn
    
    // Step 2: Round deposit to whole dollars
    let rawDepositAmount = toastSales + cashTips
    let depositAmount = rawDepositAmount.rounded(.toNearestOrEven) // Banker's rounding
    let depositRoundingAdjustment = rawDepositAmount - depositAmount
    
    // Step 3: Handle rounding with tip adjustments
    var depositTipAdjustment: Decimal = 0
    var depositExcessToCashbox: Decimal = 0
    
    if depositRoundingAdjustment > 0 {
        // Rounded up - take whole dollars from tips
        depositTipAdjustment = depositRoundingAdjustment.rounded(.up)
        depositExcessToCashbox = depositTipAdjustment - depositRoundingAdjustment
    } else if depositRoundingAdjustment < 0 {
        // Rounded down - staff keeps benefit
        depositExcessToCashbox = abs(depositRoundingAdjustment)
    }
    
    // Step 4: Handle shortages
    var shortageTipAdjustment: Decimal = 0
    if discrepancy < 0 {
        let shortageAmount = abs(discrepancy)
        shortageTipAdjustment = shortageAmount.rounded(.up)
    }
    
    // Step 5: Final calculations
    let finalCashTips = max(0, cashTips - depositTipAdjustment - shortageTipAdjustment)
    let adjustedTips = finalCashTips.rounded(.down) // Floor to whole dollars
    let returnAmount = amTotal + max(0, discrepancy) + depositExcessToCashbox
    
    return PMCalculationResult(
        drawerChange: drawerChange,
        expectedCashIn: expectedCashIn,
        discrepancy: discrepancy,
        depositAmount: depositAmount,
        adjustedTips: adjustedTips,
        returnAmount: returnAmount.rounded(2), // 2 decimal places
        depositRoundingAdjustment: depositRoundingAdjustment,
        depositTipAdjustment: depositTipAdjustment,
        depositExcessToCashbox: depositExcessToCashbox,
        shortageTipAdjustment: shortageTipAdjustment
    )
}
```

**PM UI Flow:**

1. **Load AM Data**
   - Automatically fetch AM count for selected date
   - Display AM total at top for reference
   - If no AM count exists, show error and prevent PM count

2. **PM Count Inputs**
   - Same denomination entry as AM (Drawer 1 & 2)
   - Same skip functionality
   
3. **Toast Sales & Tips**
   - Text field: "Toast POS Cash Sales" (required)   - Text field: "Cash Tips Collected" (required)
   - Both fields: numeric keyboard, currency formatting

4. **Real-time Calculations Display**
   - Show calculations as user types
   - Clear visual breakdown:
     ```
     AM Total:              $500.00
     PM Total:              $723.45
     ────────────────────────────────
     Drawer Change:         $223.45
     
     Toast Cash Sales:      $215.00
     Cash Tips:             $12.00
     Expected Cash In:      $227.00
     ────────────────────────────────
     Discrepancy:           -$3.55 (SHORT)
     
     DEPOSIT CALCULATION:
     Raw Deposit:           $227.00
     Rounded Deposit:       $227.00
     Rounding Adjustment:   $0.00
     
     TIP ADJUSTMENTS:
     Original Tips:         $12.00
     Shortage Adjustment:   -$4.00
     Final Tips to Staff:   $8.00
     
     RETURN TO CASHBOX:     $500.00
     ```

5. **Submit**
   - Save to Supabase
   - **Automatically send email report to management**
   - Show success screen with summary

**Email Report Generation (Critical Feature):**

Use EmailJS or native iOS email compose:

```swift
struct EmailReport {
    let date: String
    let amCounter: String
    let pmCounter: String
    let amTotal: Decimal
    let pmTotal: Decimal
    let drawerChange: Decimal
    let toastSales: Decimal
    let cashTips: Decimal
    let discrepancy: Decimal
    let depositAmount: Decimal
    let adjustedTips: Decimal
    let returnAmount: Decimal
    let amDrawer1Data: DenominationData?
    let amDrawer2Data: DenominationData?
    let pmDrawer1Data: DenominationData?
    let pmDrawer2Data: DenominationData?
    let amNotes: String?
    let pmNotes: String?
}

func generateEmailBody(from report: EmailReport) -> String {
    """
    JAYNA GYRO - DAILY CASH REPORT
    Date: \(report.date)
    
    ═══════════════════════════════════
    MORNING COUNT (AM)
    ═══════════════════════════════════
    Counter: \(report.amCounter)
    
    Drawer 1:
    \(formatDenominationBreakdown(report.amDrawer1Data))
    Total: \(report.amDrawer1Data?.calculateTotal() ?? 0, format: .currency)
    
    Drawer 2:
    \(formatDenominationBreakdown(report.amDrawer2Data))
    Total: \(report.amDrawer2Data?.calculateTotal() ?? 0, format: .currency)
    
    AM TOTAL: \(report.amTotal, format: .currency)
    
    \(report.amNotes.map { "Notes: \($0)" } ?? "")
    
    ═══════════════════════════════════
    EVENING CLOSE (PM)
    ═══════════════════════════════════
    Counter: \(report.pmCounter)
    
    [Same format as AM]
    
    PM TOTAL: \(report.pmTotal, format: .currency)
    
    ═══════════════════════════════════
    RECONCILIATION
    ═══════════════════════════════════
    Drawer Change: \(report.drawerChange, format: .currency)
    Toast Cash Sales: \(report.toastSales, format: .currency)
    Cash Tips Collected: \(report.cashTips, format: .currency)
    Expected Cash In: \(report.toastSales + report.cashTips, format: .currency)
    
    DISCREPANCY: \(report.discrepancy, format: .currency) \(report.discrepancy < 0 ? "⚠️ SHORT" : "✅ OVER")
    
    ═══════════════════════════════════
    FINAL AMOUNTS
    ═══════════════════════════════════
    💰 DEPOSIT AMOUNT: \(report.depositAmount, format: .currency)
    💵 ADJUSTED TIPS: \(report.adjustedTips, format: .currency)
    🏦 RETURN TO CASHBOX: \(report.returnAmount, format: .currency)
    
    ───────────────────────────────────
    Report generated by Jayna Gyro iOS App
    """
}

func sendEmailReport(report: EmailReport) async throws {
    let recipients = ["demetri@jaynagyro.com", "yusuf@jaynagyro.com"]
    let subject = "Cash Report - \(report.date)"
    let body = generateEmailBody(from: report)
    
    // Option 1: Use EmailJS API
    try await EmailJSService.shared.send(
        to: recipients,
        subject: subject,
        body: body
    )
    
    // Option 2: Use native MFMailComposeViewController
    // (requires import MessageUI)
}
```

**Validation Rules for PM:**
- AM count must exist for selected date
- Toast sales required (must be > 0)
- Cash tips required (can be 0)
- If drawer NOT skipped: at least one denomination must be > 0
- If drawer IS skipped: reason required

---

## 🎉 MODULE 2: CATERING MANAGEMENT SYSTEM

### **ezCater API Integration (Critical)**

**API Credentials:**
```swift
struct EzCaterConfig {
    static let baseURL = "https://api.ezcater.com/v1"
    static let apiKey = ProcessInfo.processInfo.environment["EZCATER_API_KEY"]!
    static let catererID = "your_caterer_id" // From ezCater dashboard
}
```

**Key Endpoints:**

1. **Webhook Subscription (for real-time orders):**
```swift
// POST /webhooks/subscriptions
struct WebhookSubscription: Codable {
    let url: String // Your server endpoint
    let events: [String] // ["order.created", "order.updated"]
}
```

2. **Fetch Orders:**
```swift
// GET /orders?caterer_id={id}&start_date={date}&end_date={date}
struct EzCaterOrder: Codable {
    let uuid: String
    let orderNumber: String
    let customer: EzCaterCustomer
    let eventTime: String
    let location: EzCaterLocation
    let headcount: Int?
    let price: EzCaterPrice
    let items: [EzCaterItem]
    let specialInstructions: String?
    let status: String
}

struct EzCaterCustomer: Codable {
    let name: String
    let email: String?
    let phone: String?
    let company: String?
}

struct EzCaterLocation: Codable {
    let address: String
    let city: String
    let state: String
    let zipCode: String
}

struct EzCaterPrice: Codable {
    let subtotal: Decimal
    let tax: Decimal
    let tip: Decimal
    let deliveryFee: Decimal
    let total: Decimal
}
```

**Import Flow:**

```swift
class EzCaterService {
    func importOrder(orderNumber: String) async throws -> CateringOrder {
        // 1. Find order UUID from order number
        let uuid = try await findOrderUUID(orderNumber: orderNumber)
        
        // 2. Fetch full order details
        let ezOrder = try await fetchOrder(uuid: uuid)
        
        // 3. Convert to internal CateringOrder model
        let cateringOrder = CateringOrder(
            id: UUID(),
            orderNumber: ezOrder.orderNumber,
            customerName: ezOrder.customer.name,
            customerEmail: ezOrder.customer.email,
            customerPhone: ezOrder.customer.phone,
            customerCompany: ezOrder.customer.company,
            eventDate: parseDate(ezOrder.eventTime),
            eventTime: parseTime(ezOrder.eventTime),
            eventLocation: formatAddress(ezOrder.location),
            guestCount: ezOrder.headcount,
            quotedPrice: ezOrder.price.total,
            finalPrice: ezOrder.price.total,
            status: .confirmed,
            source: .ezcater,
            ezcaterOrderId: ezOrder.orderNumber,
            ezcaterOrderUuid: ezOrder.uuid,
            menuItems: formatMenuItems(ezOrder.items),
            specialInstructions: ezOrder.specialInstructions,
            createdAt: Date(),
            updatedAt: Date()
        )
        
        // 4. Save to Supabase
        try await SupabaseService.shared.insert(cateringOrder)
        
        // 5. Create Google Calendar event
        try await createCalendarEvent(for: cateringOrder)
        
        return cateringOrder
    }
    
    func syncOrders(startDate: Date, endDate: Date) async throws -> [CateringOrder] {
        let ezOrders = try await fetchOrders(
            catererID: EzCaterConfig.catererID,
            startDate: startDate,
            endDate: endDate
        )
        
        var imported: [CateringOrder] = []
        
        for ezOrder in ezOrders {
            // Check if already exists
            let existing = try? await SupabaseService.shared
                .from("catering_orders")
                .select()
                .eq("ezcater_order_uuid", value: ezOrder.uuid)
                .single()
                .execute()
            
            if existing == nil {
                let order = try await importOrder(orderNumber: ezOrder.orderNumber)
                imported.append(order)
            }
        }
        
        return imported
    }
}
```

**UI Flow:**

1. **Order List View**
   - Segmented control: All / Upcoming / Completed
   - Filter by date range
   - Search by customer name or order number
   - Color-coded status badges
   - Swipe actions: Edit, Delete, Mark Complete
   - Pull to refresh (syncs with ezCater)

2. **Order Detail View**
   - All order information displayed
   - Edit button (top right)
   - Photo gallery section (if photos exist)
   - Action buttons:
     * "Add Photos"
     * "Create Calendar Event" (if not already synced)
     * "Generate BEO" (Banquet Event Order PDF)
     * "Send to Toast" (if Toast integration active)

3. **Order Form (Create/Edit)**
   - Section 1: Customer Info
   - Section 2: Event Details
   - Section 3: Pricing
   - Section 4: Menu Items (multi-line text editor)
   - Section 5: Special Instructions
   - Section 6: BEO Details (optional)
   - Toggle: "Import from ezCater" → shows order number input

4. **Photo Gallery**
   - Grid layout (2-3 columns)
   - Drag to reorder
   - Tap to view full screen
   - Long press for options: Delete, Add Caption, Set as Cover
   - Camera button: Take photo or select from library
   - Upload progress indicator
   - **Auto-match to order:** When photo uploaded, show picker to select which order

**Photo Management (Supabase Storage):**

```swift
class CateringPhotoService {
    func uploadPhoto(
        image: UIImage,
        orderId: UUID,
        caption: String?
    ) async throws -> CateringPhoto {
        // 1. Compress image
        guard let imageData = image.jpegData(compressionQuality: 0.8) else {
            throw PhotoError.compressionFailed
        }
        
        // 2. Generate thumbnail
        let thumbnail = image.resized(toWidth: 200)
        guard let thumbnailData = thumbnail?.jpegData(compressionQuality: 0.6) else {
            throw PhotoError.thumbnailFailed
        }
        
        // 3. Upload to Supabase Storage
        let fileName = "\(UUID().uuidString).jpg"
        let thumbnailName = "\(UUID().uuidString)_thumb.jpg"
        
        let imagePath = try await SupabaseService.shared.storage
            .from("catering-photos")
            .upload(
                path: fileName,
                file: imageData,
                fileOptions: FileOptions(contentType: "image/jpeg")
            )
        
        let thumbnailPath = try await SupabaseService.shared.storage
            .from("catering-photos")
            .upload(
                path: thumbnailName,
                file: thumbnailData,
                fileOptions: FileOptions(contentType: "image/jpeg")
            )
        
        // 4. Get public URLs
        let imageURL = try SupabaseService.shared.storage
            .from("catering-photos")
            .getPublicURL(path: fileName)
        
        let thumbnailURL = try SupabaseService.shared.storage
            .from("catering-photos")
            .getPublicURL(path: thumbnailName)
        
        // 5. Create database record
        let photo = CateringPhoto(
            id: UUID(),
            orderId: orderId,
            imageUrl: imageURL.absoluteString,
            thumbnailUrl: thumbnailURL.absoluteString,
            caption: caption,
            displayOrder: await getNextDisplayOrder(orderId: orderId),
            uploadedAt: Date(),
            uploadedBy: UserDefaults.standard.string(forKey: "currentUser"),
            isArchived: false
        )
        
        try await SupabaseService.shared.insert(photo)
        
        return photo
    }
    
    func reorderPhotos(orderId: UUID, photoIds: [UUID]) async throws {
        for (index, photoId) in photoIds.enumerated() {
            try await SupabaseService.shared
                .from("catering_photos")
                .update(["display_order": index])
                .eq("id", value: photoId.uuidString)
                .execute()
        }
    }
    
    func deletePhoto(photoId: UUID) async throws {
        // 1. Get photo record
        let photo: CateringPhoto = try await SupabaseService.shared
            .from("catering_photos")
            .select()
            .eq("id", value: photoId.uuidString)
            .single()
            .execute()
        
        // 2. Delete from storage
        let fileName = URL(string: photo.imageUrl)?.lastPathComponent ?? ""
        let thumbnailName = URL(string: photo.thumbnailUrl ?? "")?.lastPathComponent ?? ""
        
        try await SupabaseService.shared.storage
            .from("catering-photos")
            .remove(paths: [fileName, thumbnailName])
        
        // 3. Delete database record
        try await SupabaseService.shared
            .from("catering_photos")
            .delete()
            .eq("id", value: photoId.uuidString)
            .execute()
    }
}
```

### **Google Calendar Integration**

**Setup:**
- Use Google Calendar API v3
- OAuth 2.0 authentication
- Required scopes: `calendar.events`

```swift
import GoogleAPIClientForREST_Calendar
import GoogleSignIn

class GoogleCalendarService {
    private let service = GTLRCalendarService()
    
    func authenticate() async throws {
        // Google Sign-In flow
        let config = GIDConfiguration(clientID: "YOUR_CLIENT_ID")
        let result = try await GIDSignIn.sharedInstance.signIn(with: config)
        service.authorizer = result.authentication.fetcherAuthorizer()
    }
    
    func createEvent(for order: CateringOrder) async throws -> String {
        let event = GTLRCalendar_Event()
        event.summary = "Catering: \(order.customerName)"
        event.location = order.eventLocation
        event.descriptionProperty = """
        Order #\(order.orderNumber ?? "N/A")
        Customer: \(order.customerName)
        Phone: \(order.customerPhone ?? "N/A")
        Guest Count: \(order.guestCount ?? 0)
        
        Special Instructions:
        \(order.specialInstructions ?? "None")
        """
        
        // Parse event date and time
        let dateTime = GTLRCalendar_EventDateTime()
        dateTime.dateTime = GTLRDateTime(date: order.eventDate)
        dateTime.timeZone = "America/Los_Angeles"
        
        event.start = dateTime
        
        // Set end time (2 hours after start by default)
        let endDateTime = GTLRCalendar_EventDateTime()
        endDateTime.dateTime = GTLRDateTime(
            date: order.eventDate.addingTimeInterval(2 * 3600)
        )
        endDateTime.timeZone = "America/Los_Angeles"
        event.end = endDateTime
        
        // Add attendees
        if let email = order.customerEmail {
            let attendee = GTLRCalendar_EventAttendee()
            attendee.email = email
            event.attendees = [attendee]
        }
        
        // Add reminders
        let reminder1 = GTLRCalendar_EventReminder()
        reminder1.minutes = 1440 // 24 hours before
        reminder1.method = "email"
        
        let reminder2 = GTLRCalendar_EventReminder()
        reminder2.minutes = 60 // 1 hour before
        reminder2.method = "popup"
        
        let reminders = GTLRCalendar_Event_Reminders()
        reminders.overrides = [reminder1, reminder2]
        reminders.useDefault = false
        event.reminders = reminders
        
        // Insert event
        let query = GTLRCalendarQuery_EventsInsert.query(
            withObject: event,
            calendarId: "primary"
        )
        
        let result = try await service.executeQuery(query)
        guard let createdEvent = result as? GTLRCalendar_Event,
              let eventId = createdEvent.identifier else {
            throw CalendarError.creationFailed
        }
        
        // Update order with calendar event ID
        try await SupabaseService.shared
            .from("catering_orders")
            .update(["google_calendar_event_id": eventId])
            .eq("id", value: order.id.uuidString)
            .execute()
        
        return eventId
    }
}
```

---

## 💵 MODULE 3: TIP POOL CALCULATOR

### **Toast API - TDS Driver Auto-Fetch (Critical)**

**Problem Being Solved:**
Delivery drivers (TDS = Toast Delivery Services) earn tips through Toast POS. Manually calculating these tips from hundreds of orders is time-consuming and error-prone. The web app solves this by automatically fetching and calculating driver tips from the Toast API.

**Toast API Configuration:**
```swift
struct ToastConfig {
    static let baseURL = "https://ws-api.toasttab.com"
    static let clientID = ProcessInfo.processInfo.environment["TOAST_CLIENT_ID"]!
    static let clientSecret = ProcessInfo.processInfo.environment["TOAST_CLIENT_SECRET"]!
    static let restaurantGUID = "d3efae34-7c2e-4107-a442-49081e624706"
    static let tdsDriverGUID = "5ffaae6f-4238-477d-979b-3da88d45b8e2"
}
```

**Authentication Flow:**
```swift
class ToastAuthService {
    private var accessToken: String?
    private var tokenExpiry: Date?
    
    func getAccessToken() async throws -> String {
        // Check if token is still valid
        if let token = accessToken,
           let expiry = tokenExpiry,
           expiry > Date() {
            return token
        }
        
        // Request new token
        let url = URL(string: "\(ToastConfig.baseURL)/authentication/v1/authentication/login")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body = [
            "clientId": ToastConfig.clientID,
            "clientSecret": ToastConfig.clientSecret,
            "userAccessType": "TOAST_MACHINE_CLIENT"
        ]
        
        request.httpBody = try JSONEncoder().encode(body)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw ToastError.authenticationFailed
        }
        
        struct TokenResponse: Codable {
            let accessToken: String
            let expiresIn: Int // seconds
        }
        
        let tokenResponse = try JSONDecoder().decode(TokenResponse.self, from: data)
        
        self.accessToken = tokenResponse.accessToken
        self.tokenExpiry = Date().addingTimeInterval(TimeInterval(tokenResponse.expiresIn))
        
        return tokenResponse.accessToken
    }
}

class ToastAPIService {
    private let authService = ToastAuthService()
    
    func fetchOrders(
        startDate: Date,
        endDate: Date,
        businessDate: String? = nil
    ) async throws -> [ToastOrder] {
        let token = try await authService.getAccessToken()
        
        // Convert dates to Pacific timezone business dates
        let formatter = ISO8601DateFormatter()
        formatter.timeZone = TimeZone(identifier: "America/Los_Angeles")
        
        let businessDateStr = businessDate ?? convertToPacificBusinessDate(startDate)
        
        let url = URL(string: "\(ToastConfig.baseURL)/orders/v2/orders")!
        var components = URLComponents(url: url, resolvingAgainstBaseURL: false)!
        components.queryItems = [
            URLQueryItem(name: "restaurantGuid", value: ToastConfig.restaurantGUID),
            URLQueryItem(name: "businessDate", value: businessDateStr),
            URLQueryItem(name: "startDate", value: formatter.string(from: startDate)),
            URLQueryItem(name: "endDate", value: formatter.string(from: endDate))
        ]
        
        var request = URLRequest(url: components.url!)
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let (data, _) = try await URLSession.shared.data(for: request)
        
        let orders = try JSONDecoder().decode([ToastOrder].self, from: data)
        return orders
    }
    
    private func convertToPacificBusinessDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.timeZone = TimeZone(identifier: "America/Los_Angeles")
        formatter.dateFormat = "yyyyMMdd"
        return formatter.string(from: date)
    }
}
```

**TDS Driver Tip Calculation:**

```swift
struct ToastOrder: Codable {
    let guid: String
    let checks: [ToastCheck]
    let voidInfo: ToastVoidInfo?
    let deletedDate: String?
    let businessDate: String
    let createdDate: String
}

struct ToastCheck: Codable {
    let guid: String
    let server: ToastServer?
    let payments: [ToastPayment]?
    let voidInfo: ToastVoidInfo?
    let amount: Decimal
    let tipAmount: Decimal?
}

struct ToastServer: Codable {
    let guid: String
    let name: String?
}

struct ToastPayment: Codable {
    let guid: String
    let type: String
    let amount: Decimal
    let tipAmount: Decimal?
    let refund: ToastRefund?
}

struct ToastRefund: Codable {
    let refundAmount: Decimal
    let tipRefundAmount: Decimal?
}

struct ToastVoidInfo: Codable {
    let voidDate: String
}

class TDSDriverTipService {
    func calculateTips(
        startDate: Date,
        endDate: Date
    ) async throws -> TipCalculationResult {
        var allOrders: [ToastOrder] = []
        
        // Fetch orders for each day in range
        var currentDate = startDate
        while currentDate <= endDate {
            let businessDate = convertToPacificBusinessDate(currentDate)
            let dayOrders = try await ToastAPIService().fetchOrders(
                startDate: currentDate,
                endDate: currentDate,
                businessDate: businessDate
            )
            allOrders.append(contentsOf: dayOrders)
            currentDate = Calendar.current.date(byAdding: .day, value: 1, to: currentDate)!
        }
        
        // Filter for TDS Driver orders
        let tdsOrders = allOrders.filter { order in
            order.checks.contains { check in
                check.server?.guid == ToastConfig.tdsDriverGUID
            }
        }
        
        // Calculate net tips
        var totalTips: Decimal = 0
        var voidedTips: Decimal = 0
        var refundedTips: Decimal = 0
        
        for order in tdsOrders {
            // Skip voided orders
            if order.voidInfo != nil || order.deletedDate != nil {
                continue
            }
            
            for check in order.checks {
                // Skip if not TDS driver
                guard check.server?.guid == ToastConfig.tdsDriverGUID else {
                    continue
                }
                
                // Skip voided checks
                if check.voidInfo != nil {
                    if let tipAmount = check.tipAmount {
                        voidedTips += tipAmount
                    }
                    continue
                }
                
                // Add check tips
                if let tipAmount = check.tipAmount {
                    totalTips += tipAmount
                }
                
                // Process payments
                if let payments = check.payments {
                    for payment in payments {
                        // Handle refunds
                        if let refund = payment.refund {
                            if let tipRefund = refund.tipRefundAmount {
                                refundedTips += tipRefund
                            }
                        }
                    }
                }
            }
        }
        
        let netTips = totalTips - voidedTips - refundedTips
        
        return TipCalculationResult(
            totalOrders: tdsOrders.count,
            grossTips: totalTips,
            voidedTips: voidedTips,
            refundedTips: refundedTips,
            netTips: netTips,
            startDate: startDate,
            endDate: endDate
        )
    }
}

struct TipCalculationResult {
    let totalOrders: Int
    let grossTips: Decimal
    let voidedTips: Decimal
    let refundedTips: Decimal
    let netTips: Decimal
    let startDate: Date
    let endDate: Date
}
```

**Tip Pool Distribution Logic:**

```swift
struct EmployeeHours: Codable {
    let name: String
    let hoursWorked: Decimal
}

struct TipDistribution: Codable {
    let employeeName: String
    let hoursWorked: Decimal
    let tipAmount: Decimal
    let percentage: Decimal
}

class TipPoolService {
    func calculateDistribution(
        totalTips: Decimal,
        employees: [EmployeeHours]
    ) -> [TipDistribution] {
        // Calculate total hours
        let totalHours = employees.reduce(Decimal(0)) { $0 + $1.hoursWorked }
        
        guard totalHours > 0 else {
            return []
        }
        
        // Calculate per-hour rate
        let ratePerHour = totalTips / totalHours
        
        // Distribute tips
        var distributions: [TipDistribution] = []
        var distributedTotal: Decimal = 0
        
        for (index, employee) in employees.enumerated() {
            let tipAmount: Decimal
            
            if index == employees.count - 1 {
                // Last employee gets remainder to avoid rounding errors
                tipAmount = totalTips - distributedTotal
            } else {
                tipAmount = (employee.hoursWorked * ratePerHour).rounded(2)
            }
            
            let percentage = (employee.hoursWorked / totalHours) * 100
            
            distributions.append(TipDistribution(
                employeeName: employee.name,
                hoursWorked: employee.hoursWorked,
                tipAmount: tipAmount,
                percentage: percentage.rounded(2)
            ))
            
            distributedTotal += tipAmount
        }
        
        return distributions
    }
}
```

**UI Flow:**

1. **Tip Pool Calculator View**
   - Date range picker (start/end dates)
   - Button: "Fetch TDS Driver Tips" → calls Toast API
   - Display result:
     * Total Orders
     * Gross Tips
     * Voided/Refunded
     * **Net Tips (large, prominent)**
   - Manual override option (text field)
   
2. **Employee Hours Input**
   - Option 1: CSV Upload (parse with Swift)
   - Option 2: Manual entry (list with add/remove)
   - Each row: Name + Hours worked
   
3. **Distribution Calculation**
   - Button: "Calculate Distribution"
   - Shows table:
     * Employee Name
     * Hours Worked
     * Tip Amount
     * Percentage
   - Total row at bottom
   
4. **Generate Report**
   - PDF generation using PDFKit
   - Email via MFMailComposeViewController
   - Save to Files app

**CSV Parsing:**
```swift
import CSV

func parseEmployeeHours(from csvData: Data) throws -> [EmployeeHours] {
    guard let csvString = String(data: csvData, encoding: .utf8) else {
        throw CSVError.invalidEncoding
    }
    
    let csv = try CSVReader(string: csvString, hasHeaderRow: true)
    var employees: [EmployeeHours] = []
    
    while let row = csv.next() {
        guard row.count >= 2,
              let name = row.first,
              let hoursString = row.last,
              let hours = Decimal(string: hoursString) else {
            continue
        }
        
        employees.append(EmployeeHours(
            name: name,
            hoursWorked: hours
        ))
    }
    
    return employees
}
```

---

## 🍽️ MODULE 4: KITCHEN PREP & ORDERS

### **Prep List Generation Logic**

**Data Sources:**
1. Historical sales data (average daily sales by item)
2. Upcoming catering orders (known quantities)
3. Manual adjustments by prep cook

**Algorithm:**
```swift
struct PrepItem: Codable, Identifiable {
    let id: UUID
    var name: String
    var category: String // protein, vegetable, sauce, etc.
    var unit: String // lbs, oz, each, etc.
    var averageDailyUsage: Decimal
    var currentStock: Decimal?
    var upcomingCateringNeeds: Decimal
    var recommendedPrepAmount: Decimal
    var actualPrepAmount: Decimal?
    var location: String? // Walk-in zone
    var notes: String?
}

class PrepListService {
    func generatePrepList(for date: Date) async throws -> [PrepItem] {
        // 1. Get historical usage data
        let historicalData = try await fetchHistoricalUsage(date: date)
        
        // 2. Get upcoming catering orders
        let cateringOrders = try await fetchUpcomingCateringOrders(date: date)
        
        // 3. Get current inventory levels
        let inventory = try await fetchCurrentInventory()
        
        // 4. Calculate prep needs
        var prepItems: [PrepItem] = []
        
        for item in historicalData {
            let currentStock = inventory[item.name] ?? 0
            let averageDaily = item.averageDailyUsage
            let cateringNeeds = calculateCateringNeeds(
                for: item.name,
                from: cateringOrders
            )
            
            // Recommended: (Daily average + Catering needs) - Current stock
            let recommended = max(0, averageDaily + cateringNeeds - currentStock)
            
            prepItems.append(PrepItem(
                id: UUID(),
                name: item.name,
                category: item.category,
                unit: item.unit,
                averageDailyUsage: averageDaily,
                currentStock: currentStock,
                upcomingCateringNeeds: cateringNeeds,
                recommendedPrepAmount: recommended.rounded(2),
                location: item.defaultLocation
            ))
        }
        
        return prepItems.sorted { $0.category < $1.category }
    }
    
    private func fetchHistoricalUsage(date: Date) async throws -> [PrepItem] {
        // Query last 30 days of sales data from Toast API
        let thirtyDaysAgo = Calendar.current.date(
            byAdding: .day,
            value: -30,
            to: date
        )!
        
        let orders = try await ToastAPIService().fetchOrders(
            startDate: thirtyDaysAgo,
            endDate: date
        )
        
        // Aggregate by menu item
        var itemCounts: [String: Int] = [:]
        
        for order in orders {
            // Parse menu items from order
            // ... aggregate logic
        }
        
        // Calculate daily average
        let dayCount = 30
        return itemCounts.map { (name, total) in
            PrepItem(
                id: UUID(),
                name: name,
                category: inferCategory(name),
                unit: inferUnit(name),
                averageDailyUsage: Decimal(total) / Decimal(dayCount),
                upcomingCateringNeeds: 0,
                recommendedPrepAmount: 0
            )
        }
    }
    
    private func fetchUpcomingCateringOrders(date: Date) async throws -> [CateringOrder] {
        // Get catering orders for next 3 days
        let threeDaysLater = Calendar.current.date(
            byAdding: .day,
            value: 3,
            to: date
        )!
        
        return try await SupabaseService.shared
            .from("catering_orders")
            .select()
            .gte("event_date", value: date.ISO8601Format())
            .lte("event_date", value: threeDaysLater.ISO8601Format())
            .execute()
            .value
    }
    
    private func calculateCateringNeeds(
        for itemName: String,
        from orders: [CateringOrder]
    ) -> Decimal {
        var total: Decimal = 0
        
        for order in orders {
            // Parse menu items JSON
            if let menuItemsJSON = order.menuItems,
               let data = menuItemsJSON.data(using: .utf8),
               let items = try? JSONDecoder().decode([MenuItem].self, from: data) {
                
                for item in items where item.name.lowercased().contains(itemName.lowercased()) {
                    total += Decimal(item.quantity)
                }
            }
        }
        
        return total
    }
}

struct MenuItem: Codable {
    let name: String
    let quantity: Int
    let unit: String?
}
```

### **3-Inch Label Printing**

**Requirement:** Print prep labels to thermal printer (Zebra, Brother, etc.)

**Implementation Options:**

1. **AirPrint (Easiest):**
```swift
import UIKit

class LabelPrintService {
    func printLabel(for item: PrepItem) {
        let printInfo = UIPrintInfo.printInfo()
        printInfo.outputType = .general
        printInfo.jobName = "Prep Label - \(item.name)"
        
        let printController = UIPrintInteractionController.shared
        printController.printInfo = printInfo
        printController.printingItem = generateLabelImage(for: item)
        
        printController.present(animated: true) { (controller, completed, error) in
            if completed {
                print("Print successful")
            } else if let error = error {
                print("Print failed: \(error.localizedDescription)")
            }
        }
    }
    
    private func generateLabelImage(for item: PrepItem) -> UIImage {
        let size = CGSize(width: 288, height: 144) // 3" label at 96 DPI
        let renderer = UIGraphicsImageRenderer(size: size)
        
        return renderer.image { context in
            // White background
            UIColor.white.setFill()
            context.fill(CGRect(origin: .zero, size: size))
            
            // Draw item name
            let nameAttributes: [NSAttributedString.Key: Any] = [
                .font: UIFont.boldSystemFont(ofSize: 24),
                .foregroundColor: UIColor.black
            ]
            item.name.draw(
                at: CGPoint(x: 10, y: 10),
                withAttributes: nameAttributes
            )
            
            // Draw prep amount
            let amountText = "\(item.actualPrepAmount ?? item.recommendedPrepAmount) \(item.unit)"
            let amountAttributes: [NSAttributedString.Key: Any] = [
                .font: UIFont.systemFont(ofSize: 36, weight: .heavy),
                .foregroundColor: UIColor.black
            ]
            amountText.draw(
                at: CGPoint(x: 10, y: 50),
                withAttributes: amountAttributes
            )
            
            // Draw location
            if let location = item.location {
                let locationAttributes: [NSAttributedString.Key: Any] = [
                    .font: UIFont.systemFont(ofSize: 18),
                    .foregroundColor: UIColor.darkGray
                ]
                location.draw(
                    at: CGPoint(x: 10, y: 110),
                    withAttributes: locationAttributes
                )
            }
            
            // Draw date
            let dateFormatter = DateFormatter()
            dateFormatter.dateStyle = .short
            let dateText = dateFormatter.string(from: Date())
            let dateAttributes: [NSAttributedString.Key: Any] = [
                .font: UIFont.systemFont(ofSize: 14),
                .foregroundColor: UIColor.gray
            ]
            dateText.draw(
                at: CGPoint(x: 200, y: 120),
                withAttributes: dateAttributes
            )
        }
    }
}
```

2. **Direct Thermal Printer (Advanced):**
- Use ZPL (Zebra Programming Language) or ESC/POS commands
- Send via Bluetooth or WiFi
- Libraries: `CocoaAsyncSocket` for network printing

**UI Flow:**

1. **Prep List View**
   - Date selector (defaults to today)
   - Button: "Generate Prep List"
   - List grouped by category
   - Each item shows:
     * Name
     * Recommended amount
     * Current stock (if available)
     * Catering needs (if any)
   - Edit button: adjust recommended amount
   - Checkboxes: mark as prepped
   
2. **Item Detail**
   - All item details
   - Input: Actual prep amount
   - Button: "Print Label"
   - Button: "Mark as Complete"
   - Notes field
   
3. **BOH Checklist**
   - Similar to FOH checklist (already covered)
   - Categories: Opening, Closing, Daily
   - Team member cycling
   - Completion tracking

---

## 👤 MODULE 5: FOH CHECKLISTS

**Already covered database schema. Here's the UI implementation:**

```swift
struct FOHChecklistView: View {
    @StateObject private var viewModel = FOHChecklistViewModel()
    @State private var selectedDate = Date()
    @State private var shiftType: ShiftType = .am
    @State private var reviewMode = false
    
    enum ShiftType: String, CaseIterable {
        case am = "AM Opening"
        case pm = "PM Closing"
        case transition = "Transition"
    }
    
    var body: some View {
        NavigationView {
            VStack {
                // Date and shift selector
                HStack {
                    DatePicker("Date", selection: $selectedDate, displayedComponents: .date)
                    Picker("Shift", selection: $shiftType) {
                        ForEach(ShiftType.allCases, id: \.self) { shift in
                            Text(shift.rawValue).tag(shift)
                        }
                    }
                    .pickerStyle(.segmented)
                }
                .padding()
                
                // Checklist
                List {
                    ForEach(viewModel.tasks) { task in
                        ChecklistRow(
                            task: task,
                            onToggle: {
                                Task {
                                    await viewModel.toggleTask(task.id)
                                }
                            },
                            onNameTap: {
                                Task {
                                    await viewModel.cycleTaskUser(task.id)
                                }
                            }
                        )
                    }
                }
            }
            .navigationTitle("FOH Checklist")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(reviewMode ? "Edit Mode" : "Review Mode") {
                        reviewMode.toggle()
                        viewModel.setReviewMode(reviewMode)
                    }
                }
            }
            .task {
                await viewModel.loadTasks(date: selectedDate, shift: shiftType)
                await viewModel.fetchClockedInEmployees()
            }
        }
    }
}

struct ChecklistRow: View {
    let task: FOHChecklist
    let onToggle: () -> Void
    let onNameTap: () -> Void
    
    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            // Checkbox
            Button(action: onToggle) {
                Image(systemName: task.isCompleted ? "checkmark.square.fill" : "square")
                    .font(.title2)
                    .foregroundColor(task.isCompleted ? .green : .gray)
            }
            .buttonStyle(.plain)
            
            // Task content
            VStack(alignment: .leading, spacing: 4) {
                Text(task.title)
                    .font(.body)
                    .strikethrough(task.isCompleted)
                
                if let description = task.description {
                    Text(description)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                if task.isCompleted, let completedBy = task.completedBy {
                    HStack(spacing: 4) {
                        Circle()
                            .fill(colorForUser(completedBy))
                            .frame(width: 8, height: 8)
                        
                        Button(action: onNameTap) {
                            Text(completedBy)
                                .font(.caption)
                                .foregroundColor(.blue)
                        }
                        
                        if let completedAt = task.completedAt {
                            Text("• \(completedAt, style: .time)")
                                .font(.caption2)
                                .foregroundColor(.secondary)
                        }
                    }
                }
            }
            
            Spacer()
        }
        .padding(.vertical, 4)
    }
    
    private func colorForUser(_ name: String) -> Color {
        // Use hash of name for consistent color
        let hash = abs(name.hashValue)
        let colors: [Color] = [.red, .blue, .green, .orange, .purple, .pink]
        return colors[hash % colors.count]
    }
}
```

**Name Cycling Logic (Critical - must match web app):**

```swift
class FOHChecklistViewModel: ObservableObject {
    @Published var tasks: [FOHChecklist] = []
    @Published var clockedInEmployees: [String] = []
    private let activeUserKey = "foh_active_user"
    private let activeUserExpiryKey = "foh_active_user_expiry"
    
    func cycleTaskUser(_ taskId: UUID) async {
        guard let task = tasks.first(where: { $0.id == taskId }) else {
            return
        }
        
        // Fetch clocked-in employees if empty
        if clockedInEmployees.isEmpty {
            await fetchClockedInEmployees()
        }
        
        // Build team list: Always start with "Demetri Gregorakis", then clocked-in staff
        var teamMembers = ["Demetri Gregorakis"] + clockedInEmployees
        
        // Current user
        let currentUser = task.completedBy ?? getActiveUser() ?? "Demetri Gregorakis"
        
        // Find next user in rotation
        guard let currentIndex = teamMembers.firstIndex(of: currentUser) else {
            return
        }
        
        let nextIndex = (currentIndex + 1) % teamMembers.count
        let nextUser = teamMembers[nextIndex]
        
        // Update task
        var updatedTask = task
        updatedTask.completedBy = nextUser
        updatedTask.completedAt = Date()
        
        // Save to database
        try? await SupabaseService.shared
            .from("foh_checklists")
            .update([
                "completed_by": nextUser,
                "completed_at": Date().ISO8601Format()
            ])
            .eq("id", value: taskId.uuidString)
            .execute()
        
        // Update local state
        if let index = tasks.firstIndex(where: { $0.id == taskId }) {
            tasks[index] = updatedTask
        }
        
        // Set active user (30-minute persistence)
        setActiveUser(nextUser)
    }
    
    private func getActiveUser() -> String? {
        guard let expiry = UserDefaults.standard.object(forKey: activeUserExpiryKey) as? Date,
              expiry > Date() else {
            return nil
        }
        
        return UserDefaults.standard.string(forKey: activeUserKey)
    }
    
    private func setActiveUser(_ name: String) {
        UserDefaults.standard.set(name, forKey: activeUserKey)
        UserDefaults.standard.set(
            Date().addingTimeInterval(30 * 60), // 30 minutes
            forKey: activeUserExpiryKey
        )
    }
    
    func fetchClockedInEmployees() async {
        do {
            let token = try await ToastAuthService().getAccessToken()
            
            // Convert current Pacific time to UTC for API query
            let now = Date()
            let pacificTZ = TimeZone(identifier: "America/Los_Angeles")!
            var calendar = Calendar.current
            calendar.timeZone = pacificTZ
            
            // Get start of day in Pacific
            let startOfDay = calendar.startOfDay(for: now)
            
            // Convert to UTC and add buffer for overnight shifts
            let startUTC = startOfDay.addingTimeInterval(-6 * 3600) // 6 hours before
            let endUTC = now.addingTimeInterval(6 * 3600) // 6 hours after
            
            let url = URL(string: "\(ToastConfig.baseURL)/labor/v1/timeEntries")!
            var components = URLComponents(url: url, resolvingAgainstBaseURL: false)!
            components.queryItems = [
                URLQueryItem(name: "restaurantGuid", value: ToastConfig.restaurantGUID),
                URLQueryItem(name: "startDate", value: ISO8601DateFormatter().string(from: startUTC)),
                URLQueryItem(name: "endDate", value: ISO8601DateFormatter().string(from: endUTC)),
                URLQueryItem(name: "businessDate", value: formatBusinessDate(startOfDay))
            ]
            
            var request = URLRequest(url: components.url!)
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            
            let (data, _) = try await URLSession.shared.data(for: request)
            
            struct TimeEntriesResponse: Codable {
                let timeEntries: [TimeEntry]
            }
            
            struct TimeEntry: Codable {
                let employeeReference: EmployeeReference
                let inDate: String
                let outDate: String?
            }
            
            struct EmployeeReference: Codable {
                let guid: String
                let firstName: String?
                let lastName: String?
            }
            
            let response = try JSONDecoder().decode(TimeEntriesResponse.self, from: data)
            
            // Filter for currently clocked in (no outDate)
            let clockedIn = response.timeEntries
                .filter { $0.outDate == nil }
                .compactMap { entry -> String? in
                    let firstName = entry.employeeReference.firstName ?? ""
                    let lastName = entry.employeeReference.lastName ?? ""
                    let fullName = "\(firstName) \(lastName)".trimmingCharacters(in: .whitespaces)
                    return fullName.isEmpty ? nil : fullName
                }
                .filter { $0 != "Demetri Gregorakis" } // Exclude manager
                .sorted()
            
            DispatchQueue.main.async {
                self.clockedInEmployees = clockedIn
            }
        } catch {
            print("Failed to fetch clocked-in employees: \(error)")
        }
    }
    
    private func formatBusinessDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.timeZone = TimeZone(identifier: "America/Los_Angeles")
        formatter.dateFormat = "yyyyMMdd"
        return formatter.string(from: date)
    }
}
```

---

## 📊 MODULE 6: MANAGER DASHBOARD

**Real-time Analytics Display:**

```swift
struct ManagerDashboardView: View {
    @StateObject private var viewModel = DashboardViewModel()
    
    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                // Today's metrics
                MetricsGrid(metrics: viewModel.todayMetrics)
                
                // Sales chart
                SalesChartView(data: viewModel.hourlySales)
                
                // Labor summary
                LaborSummaryView(summary: viewModel.laborSummary)
                
                // Recent orders
                RecentOrdersList(orders: viewModel.recentOrders)
            }
            .padding()
        }
        .navigationTitle("Dashboard")
        .refreshable {
            await viewModel.refresh()
        }
        .task {
            await viewModel.loadData()
        }
    }
}

struct MetricsGrid: View {
    let metrics: DashboardMetrics
    
    var body: some View {
        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 16) {
            MetricCard(
                title: "Revenue",
                value: metrics.revenue,
                format: .currency(code: "USD"),
                icon: "dollarsign.circle.fill",
                color: .green
            )
            
            MetricCard(
                title: "Orders",
                value: Double(metrics.orderCount),
                format: .number,
                icon: "cart.fill",
                color: .blue
            )
            
            MetricCard(
                title: "Avg Order",
                value: metrics.averageOrderValue,
                format: .currency(code: "USD"),
                icon: "chart.line.uptrend.xyaxis",
                color: .orange
            )
            
            MetricCard(
                title: "Labor Cost",
                value: metrics.laborCost,
                format: .currency(code: "USD"),
                icon: "person.3.fill",
                color: .purple
            )
        }
    }
}

struct MetricCard: View {
    let title: String
    let value: Double
    let format: FloatingPointFormatStyle<Double>
    let icon: String
    let color: Color
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: icon)
                    .foregroundColor(color)
                Text(title)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            Text(value, format: format)
                .font(.title2)
                .bold()
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }
}
```

**Homebase Integration:**

```swift
class HomebaseService {
    private let baseURL = "https://api.joinhomebase.com/v1"
    private let apiKey: String
    
    init() {
        guard let key = ProcessInfo.processInfo.environment["HOMEBASE_API_KEY"] else {
            fatalError("HOMEBASE_API_KEY not found")
        }
        self.apiKey = key
    }
    
    func fetchLaborSummary(for date: Date) async throws -> LaborSummary {
        let formatter = ISO8601DateFormatter()
        let dateStr = formatter.string(from: date)
        
        let url = URL(string: "\(baseURL)/timesheets")!
        var components = URLComponents(url: url, resolvingAgainstBaseURL: false)!
        components.queryItems = [
            URLQueryItem(name: "date", value: dateStr),
            URLQueryItem(name: "location_id", value: ProcessInfo.processInfo.environment["HOMEBASE_LOCATION_UUID"])
        ]
        
        var request = URLRequest(url: components.url!)
        request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        
        let (data, _) = try await URLSession.shared.data(for: request)
        
        struct TimesheetsResponse: Codable {
            let timesheets: [Timesheet]
        }
        
        struct Timesheet: Codable {
            let employeeName: String
            let hoursWorked: Decimal
            let regularHours: Decimal
            let overtimeHours: Decimal
            let wage: Decimal
        }
        
        let response = try JSONDecoder().decode(TimesheetsResponse.self, from: data)
        
        let totalHours = response.timesheets.reduce(Decimal(0)) { $0 + $1.hoursWorked }
        let totalCost = response.timesheets.reduce(Decimal(0)) { $0 + ($1.hoursWorked * $1.wage) }
        let overtimeHours = response.timesheets.reduce(Decimal(0)) { $0 + $1.overtimeHours }
        
        return LaborSummary(
            totalHours: totalHours,
            totalCost: totalCost,
            overtimeHours: overtimeHours,
            employeeCount: response.timesheets.count
        )
    }
}

struct LaborSummary {
    let totalHours: Decimal
    let totalCost: Decimal
    let overtimeHours: Decimal
    let employeeCount: Int
}
```

---

## 🔐 AUTHENTICATION & SECURITY

**Role-Based Access Control:**

```swift
enum UserRole: String, Codable {
    case master = "Master"
    case admin = "Admin"
    case manager = "Manager"
    case editor = "Editor"
    case viewer = "Viewer"
    
    var permissions: Set<Permission> {
        switch self {
        case .master:
            return Set(Permission.allCases)
        case .admin:
            return Set(Permission.allCases.filter { $0 != .changePassword })
        case .manager:
            return [.viewDashboard, .editCash, .editCatering, .editPrep, .editChecklists, .viewReports]
        case .editor:
            return [.editCash, .editCatering, .editPrep, .editChecklists]
        case .viewer:
            return [.viewDashboard, .viewReports]
        }
    }
}

enum Permission: String, CaseIterable {
    case viewDashboard
    case editCash
    case editCatering
    case editPrep
    case editChecklists
    case viewReports
    case manageUsers
    case changePassword
}

class AuthService: ObservableObject {
    @Published var currentUser: User?
    @Published var isAuthenticated = false
    
    private let supabase = SupabaseService.shared
    
    func signIn(email: String, password: String) async throws {
        let session = try await supabase.auth.signIn(
            email: email,
            password: password
        )
        
        // Fetch user role from database
        let userRecord: UserRecord = try await supabase
            .from("users")
            .select()
            .eq("id", value: session.user.id.uuidString)
            .single()
            .execute()
            .value
        
        DispatchQueue.main.async {
            self.currentUser = User(
                id: session.user.id,
                email: session.user.email ?? "",
                role: UserRole(rawValue: userRecord.role) ?? .viewer
            )
            self.isAuthenticated = true
        }
    }
    
    func signOut() async throws {
        try await supabase.auth.signOut()
        
        DispatchQueue.main.async {
            self.currentUser = nil
            self.isAuthenticated = false
        }
    }
    
    func hasPermission(_ permission: Permission) -> Bool {
        guard let role = currentUser?.role else {
            return false
        }
        
        return role.permissions.contains(permission)
    }
}

struct User {
    let id: UUID
    let email: String
    let role: UserRole
}

struct UserRecord: Codable {
    let id: String
    let email: String
    let role: String
}
```

**Password Management:**

```swift
struct PasswordPromptView: View {
    @Binding var isPresented: Bool
    @State private var password: String = ""
    let requiredPassword: String
    let onSuccess: () -> Void
    
    var body: some View {
        NavigationView {
            Form {
                Section {
                    SecureField("Password", text: $password)
                } header: {
                    Text("Master Password Required")
                } footer: {
                    Text("This action requires the master password to proceed.")
                }
            }
            .navigationTitle("Verification")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        isPresented = false
                    }
                }
                
                ToolbarItem(placement: .confirmationAction) {
                    Button("Submit") {
                        if password == requiredPassword {
                            onSuccess()
                            isPresented = false
                        } else {
                            // Show error
                        }
                    }
                    .disabled(password.isEmpty)
                }
            }
        }
    }
}
```

---

## 📱 ADDITIONAL MODULES

### **7. Driver Management**
- Stats view for each driver
- Integration with Toast delivery orders
- Tip tracking per driver

### **8. Incident Reporting**
- Form with categories (customer complaint, employee issue, equipment problem)
- Photo upload capability
- Manager logs searchable database

### **9. Cost Management**
- Invoice OCR using Vision framework
- Vendor matching with CoreML
- COGS tracking
- Price history charts

### **10. Team Updates**
- Simple note posting system
- Push notifications for new updates
- Manager logs with timestamps

### **11. Scheduling**
- Calendar view of shifts
- Homebase integration
- Labor cost projections

---

## 🧪 TESTING REQUIREMENTS

**Unit Tests:**
- All calculation logic (cash, tips, prep)
- API service methods
- View model state management

**UI Tests:**
- Critical user flows (AM count, PM count, catering order creation)
- Navigation between screens
- Data persistence

**Integration Tests:**
- Supabase connection
- Toast API calls
- ezCater webhook handling
- Google Calendar sync

**Test Data:**
Use production-like test data:
```swift
extension CashCount {
    static var mock: CashCount {
        CashCount(
            id: UUID(),
            date: Date(),
            amCounter: "Test User",
            amTotal: 500.00,
            // ... complete mock data
        )
    }
}
```

---

## 📦 DEPLOYMENT CHECKLIST

**Pre-Launch:**
1. ✅ All API keys in environment variables
2. ✅ Supabase connection tested
3. ✅ Row Level Security policies configured
4. ✅ Push notification certificates
5. ✅ App Store screenshots and metadata
6. ✅ Privacy policy and terms of service
7. ✅ TestFlight beta testing completed

**App Store Requirements:**
- **App Name:** Jayna Gyro Manager
- **Category:** Business
- **Age Rating:** 4+
- **Privacy Manifest:** Declare all data collection
- **App Icons:** All required sizes
- **Screenshots:** iPhone 14 Pro Max + iPad Pro

**Post-Launch:**
- Monitor crash reports (Crashlytics)
- Track analytics (Mixpanel or similar)
- User feedback collection
- Regular updates for iOS compatibility

---

## 🎯 SUCCESS CRITERIA

**The iOS app is ready for production when:**

1. ✅ Feature parity with web app (all 12 modules functional)
2. ✅ All API integrations working (Toast, ezCater, Homebase, Google Calendar)
3. ✅ Offline mode for core functions (cash counting, checklists)
4. ✅ Push notifications for critical events
5. ✅ Role-based access control implemented
6. ✅ Data syncing reliably with Supabase
7. ✅ Email reports sending correctly
8. ✅ Photo upload/management working
9. ✅ Print functionality operational
10. ✅ Zero critical bugs in TestFlight beta

---

## 📚 ADDITIONAL RESOURCES

**Swift/SwiftUI References:**
- [Apple's SwiftUI Documentation](https://developer.apple.com/documentation/swiftui)
- [Supabase Swift Client](https://github.com/supabase-community/supabase-swift)
- [Async/Await in Swift](https://docs.swift.org/swift-book/LanguageGuide/Concurrency.html)

**API Documentation:**
- [Toast POS API Docs](https://doc.toasttab.com/)
- [ezCater API Docs](https://developers.ezcater.com/)
- [Google Calendar API](https://developers.google.com/calendar/api/v3/reference)
- [Homebase API](https://joinhomebase.com/api/docs)

**Best Practices:**
- Follow MVVM architecture strictly
- Use async/await for all network calls
- Implement proper error handling with user-friendly messages
- Cache data locally for offline use
- Use SwiftUI @Published for reactive UI updates
- Modularize code (one ViewModel per major feature)

---

## 🚨 CRITICAL REMINDERS

1. **Do NOT skip the complex calculation logic** - especially for:
   - PM cash reconciliation (deposit rounding, tip adjustments)
   - TDS driver tip calculation (voided/refunded order handling)
   - Prep list generation (historical + catering needs)

2. **Pacific Timezone is CRITICAL** - all date/time handling must respect PST/PDT

3. **Maintain existing Supabase database** - do not create new tables

4. **Email reports must work** - this is non-negotiable for daily operations

5. **Toast API pagination** - fetch ALL orders, not just first 100

6. **Photo management** - upload to Supabase Storage, not device storage

7. **Offline support** - core features must work without internet

8. **Role-based access** - different staff have different permissions

9. **30-minute user persistence** - remember who last completed tasks

10. **Name cycling must match web app behavior** - always Demetri first, then clocked-in staff

---

## 🎬 GETTING STARTED

**First Steps for Claude Code:**

1. Create new Xcode project: "JaynaGyro"
2. Add Swift Package Dependencies:
   - Supabase Swift
   - Google Sign-In
   - Google API Client Library

3. Set up project structure (Models, Views, ViewModels, Services)

4. Implement Supabase connection and authentication

5. Start with Cash Management module (most critical)

6. Implement API services (Toast, ezCater)

7. Build remaining modules in priority order

8. Test thoroughly with production data

9. Deploy to TestFlight

10. Iterate based on user feedback

---

**This prompt provides Claude Code with everything needed to rebuild the entire Jayna Gyro web application as a native iOS app with full feature parity and no details omitted.**
