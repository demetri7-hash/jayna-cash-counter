# Comprehensive Analysis of index.html

This document provides a detailed breakdown of the `index.html` file, its core functionalities, the external services it interacts with, and a list of identified issues with recommended solutions.

## 1. Application Overview

The `index.html` file is a complete single-page application (SPA) for managing daily operations at the Jayna Gyro restaurant. It is not just a simple webpage but a complex, data-driven tool that consolidates multiple workflows into a single interface.

### Core Purposes:

*   **Cash Management:** Allows staff to perform morning and evening cash counts of the registers. It automates the calculation of cash sales by fetching data from the Toast POS API and calculates the final deposit amount and the amount to be returned to the cashbox.
*   **Tip Pool Calculation:** A comprehensive module for managers to calculate weekly tip pools. It can ingest labor data from CSV files or fetch it directly from the Toast API. It calculates total tips (credit, cash, EZCater), deducts special tips (like for TDS drivers), and distributes the remaining pool to employees based on hours worked and an equity percentage.
*   **Inventory & Ordering System:** A sophisticated system for managing inventory, prep, and ordering.
    *   **Prep Sheet:** Provides daily recommendations on what prep items to make based on current stock levels, par levels, and historical consumption data.
    *   **Ordering:** Automatically calculates and suggests orders for various vendors (Greenleaf, Performance, Mani Imports, etc.) based on stock levels and delivery schedules.
    *   **Invoice Check-In:** An OCR-powered system to scan invoices (images or PDFs), extract line items, and reconcile them against inventory. It includes a learning system to improve matching accuracy over time.
*   **Reporting:** Generates historical reports for single days or weekly summaries, including cash reconciliation and tip pool distribution. These reports can be viewed in the app or downloaded as PDFs.

The application is designed to be embedded in a Google Site and relies on several external services:

*   **Supabase:** A PostgreSQL database used as the primary data store for cash counts, inventory levels, historical reports, and more.
*   **Toast API:** Used to fetch live sales data, labor reports, and other restaurant metrics.
*   **EmailJS:** Used to send formatted email reports (e.g., daily cash summaries) to management and printers.
*   **Tesseract.js & PDF.js:** Used for the client-side OCR (Optical Character Recognition) functionality to read invoices.

---

## 2. API Endpoint Summary

The application uses a set of serverless functions located in the `/api/` directory to securely communicate with external services like the Toast API. The frontend JavaScript calls these endpoints.

| API Endpoint                        | Method | Description                                                                                                                                 |
| ----------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `/api/toast-auth`                   | POST   | Authenticates with the Toast API to retrieve an access token. This is the first step for any subsequent Toast API call.                     |
| `/api/toast-payments`               | GET    | Fetches payment data for a specific business date to calculate total cash sales. Used in the PM Close workflow.                             |
| `/api/get-daily-sales`              | GET    | Retrieves cached daily sales data from the Supabase database for a given date range. Used in the Tip Pool calculator.                       |
| `/api/toast-labor-summary`          | GET    | Fetches a labor summary from the Toast API for a given date range, providing employee hours for the Tip Pool calculator.                    |
| `/api/toast-sales-summary`          | GET    | Fetches a comprehensive sales summary from the Toast API, including credit tips, net sales, and cash sales. Used in the Tip Pool calculator. |
| `/api/toast-tds-driver-tips`        | POST   | A specialized endpoint to calculate tips specifically for TDS drivers over a date range.                                                      |
| `/api/send-prep-sheet-email`        | POST   | Takes a base64-encoded PDF of the prep sheet and emails it to the kitchen printer.                                                          |

---

## 3. Supabase Schema Summary

Based on the JavaScript code, the application interacts with the following Supabase tables. 

### `cash_counts`

Stores the results of the AM and PM cash counts.

| Column                   | Type      | Description                                                                 |
| ------------------------ | --------- | --------------------------------------------------------------------------- |
| `date`                   | `date`    | **Primary Key.** The business date for the cash count.                      |
| `am_counter`             | `text`    | The name of the staff member who performed the AM count.                    |
| `am_timestamp`           | `timestamptz` | When the AM count was submitted.                                            |
| `am_total`               | `numeric` | The total cash amount counted in the morning.                               |
| `am_drawer1_total`       | `numeric` | The total for drawer 1 in the morning.                                      |
| `am_drawer1_data`        | `jsonb`   | A JSON object containing the counts of each denomination for drawer 1 (AM). |
| `am_notes`               | `text`    | Notes entered during the AM count.                                          |
| `pm_counter`             | `text`    | The name of the staff member who performed the PM count.                    |
| `pm_timestamp`           | `timestamptz` | When the PM count was submitted.                                            |
| `pm_total`               | `numeric` | The total cash amount counted in the evening.                               |
| `pm_cash_tips`           | `numeric` | The amount of cash tips reported for the day.                               |
| `pm_toast_sales`         | `numeric` | The total cash sales fetched from the Toast API.                            |
| `pm_discrepancy`         | `numeric` | The calculated difference between expected and actual cash.                 |
| `pm_adjusted_tips`       | `numeric` | The final cash tips amount after adjustments for discrepancies.             |
| `pm_deposit_amount`      | `numeric` | The final calculated amount to be deposited in the envelope.                |
| `pm_amount_to_keep`      | `numeric` | The final calculated amount to be returned to the cashbox.                  |
| `pm_notes`               | `text`    | Notes entered during the PM count.                                          |

### `inventory_items`

This is the master list of all inventory and prep items.

| Column                 | Type      | Description                                                              |
| ---------------------- | --------- | ------------------------------------------------------------------------ |
| `id`                   | `bigint`  | **Primary Key.** Unique identifier for the item.                         |
| `item_name`            | `text`    | The name of the item (e.g., "Wild Arugula 4#/CS").                       |
| `vendor`               | `text`    | The name of the vendor for this item (e.g., "Greenleaf", "PREP").      |
| `unit`                 | `text`    | The unit of measurement (e.g., "CS", "EA", "LB", "CAMBRO").            |
| `par_level`            | `numeric` | The target stock quantity to have on hand.                               |
| `current_stock`        | `numeric` | The current on-hand quantity of the item.                                |
| `last_counted_date`    | `date`    | The last date this item's stock was updated.                             |
| `item_type`            | `text`    | Type of item, primarily to distinguish `prep` items from `ingredient`s.  |
| `batch_lifespan_hours` | `integer` | For prep items, how long a batch is good for (in hours).                 |
| `urgent`               | `boolean` | A flag to mark a prep item as "MAKE FIRST".                              |
| `line_cooks_prep`      | `boolean` | A flag to categorize a prep item as something line cooks handle.         |
| `not_made_daily`       | `boolean` | A flag for prep items that are not made every day.                       |
| `storage_location`     | `text`    | Where the item is stored (e.g., "Walk-in Cooler").                       |

### `pending_orders` & `pending_order_items`

Used by the Ordering System to track orders that have been placed but not yet received.

**`pending_orders`**
| Column                 | Type      | Description                                                              |
| ---------------------- | --------- | ------------------------------------------------------------------------ |
| `id`                   | `bigint`  | **Primary Key.**                                                         |
| `vendor`               | `text`    | The vendor the order was placed with.                                    |
| `order_date`           | `date`    | The date the order was created.                                          |
| `expected_delivery_date` | `date`    | The date the delivery is expected to arrive.                             |
| `status`               | `text`    | The status of the order (e.g., `pending`, `partial`, `completed`).       |
| `total_items`          | `integer` | The total number of unique items in the order.                           |

**`pending_order_items`**
| Column             | Type      | Description                                                              |
| ------------------ | --------- | ------------------------------------------------------------------------ |
| `id`               | `bigint`  | **Primary Key.**                                                         |
| `order_id`         | `bigint`  | **Foreign Key** to `pending_orders.id`.                                  |
| `inventory_item_id`| `bigint`  | **Foreign Key** to `inventory_items.id`.                                 |
| `quantity_ordered` | `numeric` | The quantity of the item that was ordered.                               |
| `item_name`        | `text`    | The name of the item (denormalized for easy display).                    |

### Other Tables

The application also interacts with several other tables for reporting, tip variance, and OCR learning.

*   **`weekly_combined_reports`**: Stores the generated weekly reports, including snapshots of tip and cash data.
*   **`weekly_employee_tips`**: Stores the individual tip amounts for each employee for a given week.
*   **`weekly_daily_breakdown`**: Stores a daily summary of cash flow for a given week.
*   **`tip_variance`**: Tracks the small amount of money left over after tip calculations to be carried to the next week.
*   **`cashbox_counts`**: Stores a log of the total cashbox counts for weekly reconciliation.
*   **`prep_count_sessions`**: Logs when a prep count session (Morning, Afternoon, Closing) is started.
*   **`prep_consumption_log`**: Logs the calculated consumption of prep items between count sessions.
*   **`vendor_formats`**: Stores custom parsing rules for the OCR system to learn different invoice layouts.
*   **`ocr_corrections`**: Logs manual corrections made during invoice check-in to train the OCR system.
*   **`invoices` & `invoice_items`**: Stores the results of processed invoices and their line items.

---

## 4. Core Functional Modules

This section details the primary user-facing workflows within the application.

### Module 1: AM/PM Cash Counting

*   **Purpose:** To record the cash in the drawers at the start and end of the day and reconcile it with sales data.
*   **Trigger:** `startAMCount()` and `startPMCount()` functions, called by the main menu buttons.
*   **UI:** The `#amForm` and `#pmForm` divs.
*   **Core Functions:**
    *   `setupDenominations(shift)`: Dynamically creates the input fields for each cash denomination ($100, $50, etc.) for the specified shift ('am' or 'pm').
    *   `updateCalculations(shift, drawer)`: Recalculates the total for a single drawer whenever a denomination input is changed.
    *   `updateGrandTotal(shift)`: Sums the totals from both drawers to get a grand total.
    *   `submitAM()`: Collects AM form data, saves it to Supabase, and shows a success screen.
    *   `submitPM()`: Collects PM form data, calculates the deposit, sends an email report, saves to Supabase, and shows a success screen with deposit instructions.
    *   `loadAMData()`: Fetches the saved AM count data for the selected date so it can be displayed on the PM count screen.
    *   `fetchToastCashSalesForDate(date)`: Fetches cash sales from the Toast API for the PM close.
    *   `calculatePMAmounts(data)`: Contains the core business logic for the PM close, calculating the discrepancy, adjusted tips, deposit amount, and amount to return to the cashbox.
*   **DB/API Interactions:**
    *   **Supabase `cash_counts` table:** `storeAMData` and `storePMData` `upsert`/`update` records in this table. `getAMData` reads from it.
    *   **EmailJS:** `sendEmailReport` uses `emailjs.send()` to email the final PM report.
    *   **Toast API:** `fetchToastCashSalesForDate` calls the `/api/toast-auth` and `/api/toast-payments` endpoints.

### Module 2: Tip Pool Calculator

*   **Purpose:** To calculate the weekly tip pool and distribute it among employees.
*   **Trigger:** `showTipPool()`, called from a secondary link.
*   **UI:** The `#tipPoolForm` div.
*   **Core Functions:**
    *   `autoFetchOnDateChange()`: The primary trigger. When a date is selected, it fetches all necessary data from the database or Toast APIs.
    *   `calculateCashTips()`: Calculates cash tips based on the real envelope deposit and Toast cash sales.
    *   `parsePayrollCSV(file)` & `parseSalesZip(file)`: Uses PapaParse and JSZip to read user-uploaded CSV and ZIP files as a fallback if API data is unavailable.
    *   `computeTipPool(...)`: The core logic function that takes all inputs (labor data, credit tips, cash tips, etc.) and calculates the hourly rate and the amount due to each employee.
    *   `renderTipPoolSummary()` & `renderTipPoolTable()`: Display the results on the page.
    *   `generateCombinedReport()`: Gathers all weekly data, generates a comprehensive HTML report, and saves it to the `weekly_combined_reports` table in Supabase.
*   **DB/API Interactions:**
    *   **Supabase `cash_counts` table:** Reads daily cash sales data for the selected week.
    *   **Supabase `tip_variance` table:** Reads the variance from the previous week to carry it over to the current pool.
    *   **Supabase `weekly_combined_reports`, `weekly_employee_tips`, `weekly_daily_breakdown` tables:** Saves the final report data for historical purposes.
    *   **Toast API:** `autoFetchOnDateChange` calls `/api/toast-labor-summary` and `/api/toast-sales-summary` to get the required data if it's not in the database.

### Module 3: Ordering & Inventory System

*   **Purpose:** A multi-tab system for managing inventory, prep lists, and purchase orders.
*   **Trigger:** `startOrderingSystem()`, called by the main menu button.
*   **UI:** The `#orderingSystemForm` div, which contains multiple tabs (`#prepSheet`, `#checkInInvoice`, `#upcomingOrders`, etc.).
*   **Core Functions:**
    *   `loadInventoryData()`: Fetches the entire `inventory_items` table from Supabase into the `orderingSystemState` object.
    *   `renderStockCountList()` & `renderPrepCountList()`: Renders the lists of items for stock counting.
    *   `autoSaveStockCount(...)`: Automatically saves any change to a stock count input to the `inventory_items` table.
    *   `refreshPrepSheet()`: Calculates and displays prep recommendations based on stock, par, and consumption data.
    *   `calculateUpcomingOrders()`: Calculates suggested orders for all vendors for the next 7 days.
    *   `processInvoiceOCR()`: Uses Tesseract.js to read an uploaded invoice image/PDF.
    *   `parseInvoiceText()` & `fuzzyMatchInventoryItem()`: Parses the OCR text and attempts to match extracted lines to known inventory items.
    *   `checkInInvoiceItems()`: The final step of invoice processing, which updates `current_stock` for all received items in the `inventory_items` table.
*   **DB/API Interactions:**
    *   **Supabase `inventory_items` table:** This is the central table for this module. It is read by almost every function and updated by `autoSaveStockCount`, `checkInInvoiceItems`, and various item editing functions.
    *   **Supabase `pending_orders` & `pending_order_items` tables:** Used to save and manage orders created within the app.
    *   **Supabase `prep_consumption_log` table:** `autoSaveStockCount` logs changes to prep items here to track consumption.
    *   **Supabase `vendor_formats` & `ocr_corrections` tables:** The OCR system reads and writes to these tables to improve its accuracy over time.
    *   **EmailJS:** `emailPrepSheetToPrinter` sends the generated prep sheet PDF to the printer's email address.
