# 🏠 Homebase API Comprehensive Documentation

## 📋 Table of Contents
1. [API Overview](#api-overview)
2. [Authentication & Setup](#authentication--setup)
3. [API Structure & Standards](#api-structure--standards)
4. [Core Endpoints Documentation](#core-endpoints-documentation)
5. [Data Models & Entities](#data-models--entities)
6. [Pagination & Rate Limiting](#pagination--rate-limiting)
7. [Error Handling](#error-handling)
8. [Integration Best Practices](#integration-best-practices)
9. [Complete API Reference](#complete-api-reference)
10. [Troubleshooting Guide](#troubleshooting-guide)

---

## 📖 API Overview

### Purpose
Homebase provides a comprehensive collection of REST APIs to enable building integrations for workforce management, scheduling, time tracking, and labor analytics for restaurant and retail businesses.

### Base Information
- **Base URL**: `https://api.joinhomebase.com`
- **API Version**: `1.0.0`
- **Protocol**: HTTPS only
- **Data Format**: JSON only
- **Architecture**: RESTful API

### Key Capabilities
- **Employee Management**: Create, update, retrieve employee data
- **Scheduling**: Manage shifts and scheduling data
- **Time Tracking**: Handle timecards, clock-in/out operations
- **Labor Analytics**: Aggregate labor data by role, employee, time periods
- **Location Management**: Multi-location business support
- **Sales Integration**: Post sales data for labor efficiency calculations

---

## 🔐 Authentication & Setup

### API Key Request Process
1. **Request Location**: [API Settings Page](https://app.joinhomebase.com/settings/api)
2. **Approval Process**: Manual approval by Homebase team
3. **Access**: Key available on API settings page after approval

### Authentication Method
```http
Authorization: Bearer {your_api_key}
Accept: application/vnd.homebase-v1+json
```

### Example cURL Request
```bash
curl -H 'Authorization: Bearer xxx' \
     -H 'Accept: application/vnd.homebase-v1+json' \
     https://api.joinhomebase.com/locations
```

### Required Headers
- **Authorization**: `Bearer {api_key}` (Required)
- **Accept**: `application/vnd.homebase-v1+json` (Required for versioning)
- **Content-Type**: `application/json` (For POST/PUT requests)

---

## 🏗️ API Structure & Standards

### Date Format (ISO 8601)
All dates use ISO 8601 format: `YYYY-MM-DDTHH:MM:SS.sssZ`

**Examples**:
- `2025-09-30T18:00:00.000Z`
- `2025-09-30T06:30:00Z`
- `2025-09-30` (date only)

### Pagination (RFC-5988 Web Linking)
Pagination metadata in response headers:

```http
Total: 150
Per-Page: 25
Link: <https://api.joinhomebase.com/locations/uuid/employees?page=2&per_page=25>; rel="next",
      <https://api.joinhomebase.com/locations/uuid/employees?page=6&per_page=25>; rel="last"
```

**Link Relation Types**:
- `next`: Next page of results
- `prev`: Previous page of results
- `first`: First page of results
- `last`: Last page of results

### Rate Limiting
- **Limit**: 60 requests per minute per UUID
- **Scope**: Applies to requests with UUID in URL path
- **Error Response**: `429 Rate limit exceeded`

```json
{
  "error": "Rate limit exceeded"
}
```

---

## 🔗 Core Endpoints Documentation

### 1. Companies API
**Base Path**: `/company`

#### Get Company Information
```http
GET /company
```
**Response**: Company details for current account
```json
{
  "name": "Restaurant Name",
  "owner": {
    "id": 123,
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@restaurant.com"
  },
  "created_at": "2023-01-15T10:00:00Z",
  "updated_at": "2025-09-30T12:00:00Z"
}
```

### 2. Locations API
**Base Path**: `/locations`

#### List All Locations
```http
GET /locations
```

#### Get Specific Location
```http
GET /locations/{location_uuid}
```

#### Create New Location
```http
POST /locations
```
**Required Fields**:
- `location[name]`: Location name
- `location[zip]`: ZIP code

**Optional Fields**:
- `location[address_1]`: Street address
- `location[address_2]`: Suite/apartment
- `location[phone]`: Phone number
- `location[website]`: Website URL
- `location[merchant_id]`: External merchant ID

#### Get Location Plan
```http
GET /locations/{location_uuid}/plan
```
**Response**:
```json
{
  "plan": 2,
  "last_update": "2025-09-30T12:00:00Z",
  "price": 29.99,
  "in_trial": false,
  "trial_end_date": null
}
```

### 3. Employees API
**Base Path**: `/locations/{location_uuid}/employees`

#### List Employees
```http
GET /locations/{location_uuid}/employees?page=1&per_page=100&with_archived=false
```

#### Get Single Employee
```http
GET /locations/{location_uuid}/employees/{id}?with_archived=false
```

#### Create Employee
```http
POST /locations/{location_uuid}/employees
```
**Required Fields**:
- `first_name`: Employee first name
- `last_name`: Employee last name
- `email`: Employee email address

**Optional Fields**:
- `phone`: Phone number
- `job[level]`: "Employee", "Manager", "General Manager"
- `job[wage_rate]`: Wage rate in dollars
- `job[default_role]`: Default role (e.g., "Server", "Host", "Cashier")
- `job[pin]`: 4-6 digit clock-in PIN
- `job[pos_partner_id]`: POS system external ID
- `job[payroll_id]`: Payroll system ID

#### Update Employee
```http
PUT /locations/{location_uuid}/employees/{id}
```
Same fields as create, all optional for updates.

### 4. Shifts API
**Base Path**: `/locations/{location_uuid}/shifts`

#### List Shifts
```http
GET /locations/{location_uuid}/shifts?start_date=2025-09-30T00:00:00Z&end_date=2025-09-30T23:59:59Z&page=1&per_page=25
```

**Query Parameters**:
- `start_date`: Start date filter (ISO 8601, required)
- `end_date`: End date filter (ISO 8601, required)
- `open`: Filter for open shifts only (boolean)
- `with_note`: Include shift notes (boolean)
- `date_filter`: Which date to filter by ("start_at", "end_at", "created_at", "updated_at")

#### Get Single Shift
```http
GET /locations/{location_uuid}/shifts/{id}?with_note=false
```

#### Get Deleted Shifts
```http
GET /locations/{location_uuid}/shifts/deleted?start_date=2025-09-30T00:00:00Z&end_date=2025-09-30T23:59:59Z
```

### 5. Timecards API
**Base Path**: `/locations/{location_uuid}/timecards`

#### List Timecards
```http
GET /locations/{location_uuid}/timecards?start_date=2025-09-30T00:00:00Z&end_date=2025-09-30T23:59:59Z&date_filter=clock_in
```

**Query Parameters**:
- `start_date`: Start date filter (ISO 8601, required)
- `end_date`: End date filter (ISO 8601, required)
- `date_filter`: Which date to filter by ("clock_in", "clock_out", "created_at", "updated_at")

#### Get Single Timecard
```http
GET /locations/{location_uuid}/timecards/{id}
```

#### Get Deleted Timecards
```http
GET /locations/{location_uuid}/timecards/deleted?start_date=2025-09-30T00:00:00Z&end_date=2025-09-30T23:59:59Z
```

### 6. Labor Analytics API
**Base Path**: `/locations/{location_uuid}/labor`

#### Labor by Role
```http
GET /locations/{location_uuid}/labor/by_role?start_date=2025-09-30T00:00:00Z&end_date=2025-09-30T23:59:59Z
```

#### Labor by Employee
```http
GET /locations/{location_uuid}/labor/by_employee?start_date=2025-09-30T00:00:00Z&end_date=2025-09-30T23:59:59Z
```

#### Aggregate Labor Data
```http
GET /locations/{location_uuid}/labor?start_date=2025-09-30T00:00:00Z&end_date=2025-09-30T23:59:59Z&group_by=day
```

**Parameters**:
- `group_by`: "hour" or "day" (default: "day")

### 7. Timeclock Operations API
**Base Path**: `/timeclock`

#### Get Timeclock Status
```http
GET /timeclock/status?job_id=123
```

#### Clock In
```http
POST /timeclock/clock_in
```
**Form Data**:
- `job_id`: Employee job ID (required)
- `shift_id`: Shift to clock into (optional)
- `override_early_rules`: Override early clock-in rules (boolean)

#### Clock Out
```http
POST /timeclock/clock_out
```
**Form Data**:
- `job_id`: Employee job ID (required)
- `rating`: Shift rating 0-5 (optional)
- `feedback`: Text feedback (optional)
- `cash_tips`: Cash tips in dollars (optional)

#### Start Break
```http
POST /timeclock/start_break
```
**Form Data**:
- `job_id`: Employee job ID (required)
- `mandated_break_id`: Break type ID (required)

#### End Break
```http
POST /timeclock/end_break
```
**Form Data**:
- `job_id`: Employee job ID (required)
- `override_early_rules`: Override early break end rules (boolean)

### 8. Sales Integration API
**Base Path**: `/locations/{location_uuid}/sales`

#### Post Sales Data
```http
POST /locations/{location_uuid}/sales
```
**Form Data**:
- `sales[value_in_cents][]`: Array of sale amounts in cents (required)
- `sales[transacted_at][]`: Array of transaction timestamps (required)

---

## 📊 Data Models & Entities

### Employee (User) Entity
```json
{
  "id": 123,
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@restaurant.com",
  "phone": "+1234567890",
  "job": {
    "id": 456,
    "level": "Employee",
    "default_role": "Server",
    "pin": "1234",
    "pos_partner_id": "POS123",
    "payroll_id": "PAY456",
    "wage_rate": 15.50,
    "wage_type": "Hourly",
    "roles": [
      {
        "name": "Server",
        "wage_rate": 15.50
      },
      {
        "name": "Host",
        "wage_rate": 14.00
      }
    ],
    "archived_at": null,
    "location_uuid": "uuid-here"
  },
  "created_at": "2023-01-15T10:00:00Z",
  "updated_at": "2025-09-30T12:00:00Z"
}
```

### Shift Entity
```json
{
  "id": 789,
  "timecard_id": 101112,
  "open": false,
  "role": "Server",
  "department": "Front of House",
  "first_name": "John",
  "last_name": "Doe",
  "location_id": 1,
  "job_id": 456,
  "user_id": 123,
  "wage_rate": 15.50,
  "published": true,
  "scheduled": true,
  "labor": {
    "wage_type": "Hourly",
    "scheduled_hours": 8.0,
    "scheduled_overtime": 0.0,
    "scheduled_regular": 8.0,
    "scheduled_costs": 124.00,
    "scheduled_overtime_costs": 0.0
  },
  "created_at": "2025-09-30T10:00:00Z",
  "updated_at": "2025-09-30T12:00:00Z",
  "start_at": "2025-09-30T09:00:00Z",
  "end_at": "2025-09-30T17:00:00Z",
  "note": {
    "text": "Training shift",
    "author": "Manager Name",
    "created_at": "2025-09-30T10:00:00Z",
    "updated_at": "2025-09-30T10:00:00Z"
  }
}
```

### Timecard Entity
```json
{
  "id": 101112,
  "user_id": 123,
  "first_name": "John",
  "last_name": "Doe",
  "payroll_id": "PAY456",
  "job_id": 456,
  "shift_id": 789,
  "role": "Server",
  "department": "Front of House",
  "timebreaks": [
    {
      "id": 201,
      "mandated_break_id": 301,
      "timecard_id": 101112,
      "paid": false,
      "duration": 1800,
      "work_period": 14400,
      "created_at": "2025-09-30T13:00:00Z",
      "updated_at": "2025-09-30T13:30:00Z",
      "start_at": "2025-09-30T13:00:00Z",
      "end_at": "2025-09-30T13:30:00Z"
    }
  ],
  "labor": {
    "wage_type": "Hourly",
    "break_penalty": 0.0,
    "costs": 124.00,
    "cash_tips": 25.50,
    "credit_tips": 45.75,
    "weekly_overtime": 0.0,
    "paid_time_off_hours": 0.0,
    "time_off_hours": 0.0,
    "unpaid_break_hours": 0.5,
    "regular_hours": 7.5,
    "paid_hours": 8.0,
    "scheduled_hours": 8.0,
    "daily_overtime": 0.0,
    "double_overtime": 0.0,
    "wage_rate": 15.50
  },
  "approved": false,
  "created_at": "2025-09-30T09:00:00Z",
  "updated_at": "2025-09-30T17:00:00Z",
  "clock_in": "2025-09-30T09:00:00Z",
  "clock_out": "2025-09-30T17:00:00Z"
}
```

### Labor Analytics Entities

#### Role with Labor
```json
{
  "role_id": "server",
  "role_name": "Server",
  "labor": {
    "wage_type": "Hourly",
    "costs": 1240.00,
    "regular_hours": 75.0,
    "paid_hours": 80.0,
    "scheduled_hours": 80.0,
    "cash_tips": 255.00,
    "credit_tips": 457.50
  }
}
```

#### Employee with Labor
```json
{
  "id": 123,
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@restaurant.com",
  "phone": "+1234567890",
  "job": { /* Job details */ },
  "created_at": "2023-01-15T10:00:00Z",
  "updated_at": "2025-09-30T12:00:00Z",
  "labor": {
    "wage_type": "Hourly",
    "costs": 620.00,
    "regular_hours": 37.5,
    "paid_hours": 40.0,
    "scheduled_hours": 40.0,
    "cash_tips": 127.50,
    "credit_tips": 228.75
  }
}
```

### Location Entity
```json
{
  "uuid": "0b6c1af3-4904-4b84-ae5f-d1172d77de27",
  "name": "Downtown Location",
  "address_1": "123 Main St",
  "address_2": "Suite 100",
  "city": "Anytown",
  "state": "NY",
  "zip": "12345",
  "country_code": "US",
  "phone": "+1234567890",
  "website": "https://restaurant.com",
  "time_zone": "America/New_York",
  "partner_merchant_id": "MERCHANT123",
  "created_at": "2023-01-15T10:00:00Z",
  "updated_at": "2025-09-30T12:00:00Z"
}
```

### Timeclock Status Entity
```json
{
  "status": "clocked_in",
  "shifts": [
    {
      "id": 789,
      "start_at": "2025-09-30T09:00:00Z",
      "end_at": "2025-09-30T17:00:00Z",
      "role": "Server",
      "timecard": {
        "id": 101112,
        "clock_in": "2025-09-30T09:00:00Z",
        "clock_out": null
      }
    }
  ],
  "current_shift": {
    "id": 789,
    "timecard_id": 101112,
    "role": "Server"
  },
  "job": {
    "id": 456,
    "level": "Employee",
    "default_role": "Server"
  },
  "mandated_breaks": [
    {
      "id": 301,
      "paid": false,
      "duration": 1800,
      "work_period": 14400
    }
  ],
  "cash_tips_enabled": true,
  "auto_clock_out_enabled": true,
  "auto_clock_out_minutes": 720,
  "shift_feedback_enabled": true,
  "prevent_early_clock_in_enabled": true,
  "prevent_early_break_clock_in_enabled": true,
  "early_in_min": 15,
  "tardy_in_min": 10
}
```

---

## 📄 Pagination & Rate Limiting

### Pagination Implementation
Homebase uses RFC-5988 Link Header pagination:

```javascript
// Example pagination handling
async function getAllEmployees(locationUuid) {
  let allEmployees = [];
  let nextUrl = `/locations/${locationUuid}/employees?per_page=100`;
  
  while (nextUrl) {
    const response = await fetch(`https://api.joinhomebase.com${nextUrl}`, {
      headers: {
        'Authorization': 'Bearer YOUR_API_KEY',
        'Accept': 'application/vnd.homebase-v1+json'
      }
    });
    
    const employees = await response.json();
    allEmployees.push(...employees);
    
    // Parse Link header for next page
    const linkHeader = response.headers.get('Link');
    nextUrl = parseLinkHeader(linkHeader, 'next');
  }
  
  return allEmployees;
}

function parseLinkHeader(linkHeader, rel) {
  if (!linkHeader) return null;
  
  const links = linkHeader.split(',');
  for (const link of links) {
    const [url, relType] = link.split(';');
    if (relType.includes(`rel="${rel}"`)) {
      return url.trim().slice(1, -1); // Remove < >
    }
  }
  return null;
}
```

### Rate Limiting Best Practices
```javascript
class HomebaseAPIClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.requestQueue = [];
    this.processing = false;
  }
  
  async makeRequest(endpoint, options = {}) {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ endpoint, options, resolve, reject });
      this.processQueue();
    });
  }
  
  async processQueue() {
    if (this.processing || this.requestQueue.length === 0) return;
    this.processing = true;
    
    while (this.requestQueue.length > 0) {
      const { endpoint, options, resolve, reject } = this.requestQueue.shift();
      
      try {
        const response = await fetch(`https://api.joinhomebase.com${endpoint}`, {
          ...options,
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Accept': 'application/vnd.homebase-v1+json',
            ...options.headers
          }
        });
        
        if (response.status === 429) {
          // Rate limited - wait and retry
          await new Promise(resolve => setTimeout(resolve, 60000));
          this.requestQueue.unshift({ endpoint, options, resolve, reject });
          continue;
        }
        
        resolve(await response.json());
      } catch (error) {
        reject(error);
      }
      
      // Wait 1 second between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    this.processing = false;
  }
}
```

---

## ⚠️ Error Handling

### Common HTTP Status Codes
- **200**: Success
- **201**: Created successfully
- **400**: Bad Request - Invalid parameters
- **401**: Unauthorized - Invalid or missing API key
- **403**: Forbidden - Insufficient permissions
- **404**: Not Found - Resource doesn't exist
- **429**: Rate Limit Exceeded
- **500**: Internal Server Error

### Error Response Format
```json
{
  "error": "Rate limit exceeded"
}
```

### Comprehensive Error Handling
```javascript
async function handleHomebaseRequest(endpoint, options = {}) {
  try {
    const response = await fetch(`https://api.joinhomebase.com${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Accept': 'application/vnd.homebase-v1+json',
        ...options.headers
      }
    });
    
    if (!response.ok) {
      switch (response.status) {
        case 400:
          throw new Error(`Bad Request: Check your parameters`);
        case 401:
          throw new Error(`Unauthorized: Check your API key`);
        case 403:
          throw new Error(`Forbidden: Insufficient permissions`);
        case 404:
          throw new Error(`Not Found: Resource doesn't exist`);
        case 429:
          throw new Error(`Rate Limited: Too many requests`);
        default:
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    }
    
    return await response.json();
  } catch (error) {
    console.error('Homebase API Error:', error);
    throw error;
  }
}
```

---

## 🎯 Integration Best Practices

### 1. Authentication Management
```javascript
class HomebaseAuth {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseHeaders = {
      'Authorization': `Bearer ${apiKey}`,
      'Accept': 'application/vnd.homebase-v1+json'
    };
  }
  
  getHeaders(additionalHeaders = {}) {
    return {
      ...this.baseHeaders,
      ...additionalHeaders
    };
  }
}
```

### 2. Date Handling
```javascript
// Helper functions for date formatting
function toISO8601(date) {
  return new Date(date).toISOString();
}

function formatDateRange(startDate, endDate) {
  return {
    start_date: toISO8601(startDate),
    end_date: toISO8601(endDate)
  };
}

// Example usage
const today = new Date();
const tomorrow = new Date(today);
tomorrow.setDate(tomorrow.getDate() + 1);

const dateRange = formatDateRange(today, tomorrow);
```

### 3. Efficient Data Fetching
```javascript
// Batch fetch labor data for multiple analysis
async function fetchComprehensiveLaborData(locationUuid, startDate, endDate) {
  const dateParams = new URLSearchParams({
    start_date: toISO8601(startDate),
    end_date: toISO8601(endDate)
  });
  
  const [byRole, byEmployee, aggregate] = await Promise.all([
    fetch(`/locations/${locationUuid}/labor/by_role?${dateParams}`),
    fetch(`/locations/${locationUuid}/labor/by_employee?${dateParams}`),
    fetch(`/locations/${locationUuid}/labor?${dateParams}&group_by=day`)
  ]);
  
  return {
    byRole: await byRole.json(),
    byEmployee: await byEmployee.json(),
    aggregate: await aggregate.json()
  };
}
```

### 4. Real-time Updates Pattern
```javascript
// Polling pattern for real-time data
class HomebaseRealtimeMonitor {
  constructor(apiClient, locationUuid) {
    this.apiClient = apiClient;
    this.locationUuid = locationUuid;
    this.intervalId = null;
  }
  
  startMonitoring(callback, interval = 30000) {
    this.intervalId = setInterval(async () => {
      try {
        const [employees, timecards] = await Promise.all([
          this.apiClient.makeRequest(`/locations/${this.locationUuid}/employees`),
          this.apiClient.makeRequest(`/locations/${this.locationUuid}/timecards?start_date=${toISO8601(new Date())}&end_date=${toISO8601(new Date())}`)
        ]);
        
        callback({ employees, timecards });
      } catch (error) {
        console.error('Monitoring error:', error);
      }
    }, interval);
  }
  
  stopMonitoring() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}
```

---

## 📚 Complete API Reference

### Quick Reference Table

| Endpoint | Method | Purpose | Key Parameters |
|----------|--------|---------|----------------|
| `/company` | GET | Get company info | None |
| `/locations` | GET | List locations | None |
| `/locations/{uuid}` | GET | Get location | location_uuid |
| `/locations` | POST | Create location | name, zip |
| `/locations/{uuid}/plan` | GET | Get location plan | location_uuid |
| `/locations/{uuid}/employees` | GET | List employees | page, per_page, with_archived |
| `/locations/{uuid}/employees` | POST | Create employee | first_name, last_name, email |
| `/locations/{uuid}/employees/{id}` | GET | Get employee | location_uuid, id |
| `/locations/{uuid}/employees/{id}` | PUT | Update employee | location_uuid, id |
| `/locations/{uuid}/shifts` | GET | List shifts | start_date, end_date |
| `/locations/{uuid}/shifts/{id}` | GET | Get shift | location_uuid, id |
| `/locations/{uuid}/shifts/deleted` | GET | Get deleted shifts | start_date, end_date |
| `/locations/{uuid}/timecards` | GET | List timecards | start_date, end_date |
| `/locations/{uuid}/timecards/{id}` | GET | Get timecard | location_uuid, id |
| `/locations/{uuid}/timecards/deleted` | GET | Get deleted timecards | start_date, end_date |
| `/locations/{uuid}/labor/by_role` | GET | Labor by role | start_date, end_date |
| `/locations/{uuid}/labor/by_employee` | GET | Labor by employee | start_date, end_date |
| `/locations/{uuid}/labor` | GET | Aggregate labor | start_date, end_date, group_by |
| `/locations/{uuid}/sales` | POST | Post sales data | sales[value_in_cents], sales[transacted_at] |
| `/timeclock/status` | GET | Get clock status | job_id |
| `/timeclock/clock_in` | POST | Clock in | job_id, shift_id |
| `/timeclock/clock_out` | POST | Clock out | job_id, rating, feedback, cash_tips |
| `/timeclock/start_break` | POST | Start break | job_id, mandated_break_id |
| `/timeclock/end_break` | POST | End break | job_id |

### Common Query Parameters

#### Pagination
- `page`: Page number (default: 1)
- `per_page`: Items per page (default: 25, max: 100)

#### Date Filtering
- `start_date`: ISO 8601 date string (required for most endpoints)
- `end_date`: ISO 8601 date string (required for most endpoints)
- `date_filter`: Which date field to filter by ("start_at", "end_at", "clock_in", "clock_out", "created_at", "updated_at")

#### Optional Filters
- `with_archived`: Include archived records (boolean)
- `with_note`: Include notes in response (boolean)
- `open`: Filter for open shifts only (boolean)
- `group_by`: Grouping method ("hour", "day")

---

## 🔧 Troubleshooting Guide

### Common Issues & Solutions

#### 1. 401 Unauthorized Error
**Problem**: API key authentication failing
**Solutions**:
- Verify API key is correct and active
- Check Authorization header format: `Bearer {api_key}`
- Ensure Accept header is included: `application/vnd.homebase-v1+json`
- Confirm API key has access to the location/resource

#### 2. 429 Rate Limit Exceeded
**Problem**: Too many requests per minute
**Solutions**:
- Implement request queuing with delays
- Batch requests where possible
- Use pagination efficiently
- Monitor request frequency per location UUID

#### 3. Date Parameter Issues
**Problem**: Invalid date format errors
**Solutions**:
- Use ISO 8601 format: `YYYY-MM-DDTHH:MM:SS.sssZ`
- Include timezone information
- Validate date ranges (start_date < end_date)

#### 4. Missing Required Parameters
**Problem**: 400 Bad Request for missing fields
**Solutions**:
- Check API documentation for required fields
- Validate form data before sending
- Use proper Content-Type headers for POST/PUT

#### 5. Empty Response Data
**Problem**: No data returned from API
**Solutions**:
- Check date ranges - data might be outside specified period
- Verify location UUID is correct
- Check if employees/shifts exist for the time period
- Review pagination - data might be on subsequent pages

### Debugging Checklist

```javascript
// Debugging helper function
function debugHomebaseRequest(endpoint, options) {
  console.log('🔍 Debugging Homebase Request:');
  console.log('Endpoint:', endpoint);
  console.log('Method:', options.method || 'GET');
  console.log('Headers:', options.headers);
  console.log('Body:', options.body);
  console.log('Full URL:', `https://api.joinhomebase.com${endpoint}`);
}

// Usage
const options = {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Accept': 'application/vnd.homebase-v1+json',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ /* data */ })
};

debugHomebaseRequest('/locations/uuid/employees', options);
```

### Testing Strategy

1. **API Key Validation**
   ```bash
   curl -H 'Authorization: Bearer YOUR_API_KEY' \
        -H 'Accept: application/vnd.homebase-v1+json' \
        https://api.joinhomebase.com/company
   ```

2. **Location Access Test**
   ```bash
   curl -H 'Authorization: Bearer YOUR_API_KEY' \
        -H 'Accept: application/vnd.homebase-v1+json' \
        https://api.joinhomebase.com/locations
   ```

3. **Date Range Test**
   ```bash
   curl -H 'Authorization: Bearer YOUR_API_KEY' \
        -H 'Accept: application/vnd.homebase-v1+json' \
        'https://api.joinhomebase.com/locations/UUID/shifts?start_date=2025-09-30T00:00:00Z&end_date=2025-09-30T23:59:59Z'
   ```

---

## 📋 Summary

This comprehensive documentation covers all aspects of the Homebase API, including:

- ✅ **Complete endpoint documentation** with examples
- ✅ **Full data model specifications** with JSON examples
- ✅ **Authentication and security** best practices
- ✅ **Pagination and rate limiting** implementation guides
- ✅ **Error handling** strategies and common solutions
- ✅ **Integration patterns** for real-world usage
- ✅ **Troubleshooting guide** for common issues

The Homebase API provides robust workforce management capabilities with comprehensive labor analytics, making it ideal for restaurant and retail integrations requiring detailed employee scheduling, time tracking, and labor cost analysis.

---

*Documentation Version: 1.0*  
*Last Updated: September 30, 2025*  
*API Version: 1.0.0*  
*Base URL: https://api.joinhomebase.com*