#!/bin/bash

# Test script for V8 API (uses orders endpoint with check.amount)
# Expected result: $45,814.43 (matching Toast web)

START_DATE="2025-10-06"
END_DATE="2025-10-12"
EXPECTED_SALES=45814.43

echo ""
echo "=== TIP POOL SALES V8 TEST ==="
echo "Testing NEW API: toast-sales-summary-v8 (orders endpoint)"
echo "Date Range: $START_DATE to $END_DATE"
echo "Expected from Toast Web: \$$EXPECTED_SALES"
echo ""

# Check for required environment variables
if [ -z "$TOAST_CLIENT_ID" ] || [ -z "$TOAST_CLIENT_SECRET" ]; then
    echo "❌ ERROR: TOAST_CLIENT_ID and TOAST_CLIENT_SECRET must be set"
    exit 1
fi

echo "Step 1: Authenticating with Toast API..."

# Get Toast API token
AUTH_RESPONSE=$(curl -s -X POST "https://ws-api.toasttab.com/authentication/v1/authentication/login" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "'"$TOAST_CLIENT_ID"'",
    "clientSecret": "'"$TOAST_CLIENT_SECRET"'",
    "userAccessType": "TOAST_MACHINE_CLIENT"
  }')

# Extract token
TOKEN=$(echo "$AUTH_RESPONSE" | grep -o '"accessToken":"[^"]*"' | sed 's/"accessToken":"\(.*\)"/\1/')

if [ -z "$TOKEN" ]; then
    echo "❌ Authentication failed!"
    exit 1
fi

echo "✅ Authentication successful"
echo ""

echo "Step 2: Calling V8 API (this may take 2-3 minutes)..."
echo "URL: https://jayna-cash-counter.vercel.app/api/toast-sales-summary-v8"
echo ""

# Call the V8 API
SALES_RESPONSE=$(curl -s --max-time 300 "https://jayna-cash-counter.vercel.app/api/toast-sales-summary-v8?startDate=$START_DATE&endDate=$END_DATE&token=$TOKEN")

# Pretty print the response
echo "=== V8 API RESPONSE ==="
echo "$SALES_RESPONSE" | python3 -m json.tool

echo ""
echo "=== COMPARISON ==="

# Extract key values
NET_SALES=$(echo "$SALES_RESPONSE" | grep -o '"netSales":[0-9.]*' | head -1 | sed 's/"netSales"://')
CREDIT_TIPS=$(echo "$SALES_RESPONSE" | grep -o '"creditTips":[0-9.]*' | head -1 | sed 's/"creditTips"://')
CREDIT_AMOUNT=$(echo "$SALES_RESPONSE" | grep -o '"creditAmount":[0-9.]*' | head -1 | sed 's/"creditAmount"://')
CASH_SALES=$(echo "$SALES_RESPONSE" | grep -o '"cashSales":[0-9.]*' | head -1 | sed 's/"cashSales"://')

echo "V8 Net Sales:        \$$NET_SALES"
echo "Toast Web Expected:  \$$EXPECTED_SALES"

# Calculate difference using bc if available
if command -v bc &> /dev/null; then
    DIFF=$(echo "$NET_SALES - $EXPECTED_SALES" | bc)
    DIFF_ABS=$(echo "$DIFF" | tr -d '-')

    echo "Difference:          \$$DIFF"
    echo ""

    # Check if within acceptable range (±$10)
    if (( $(echo "$DIFF_ABS < 10" | bc -l) )); then
        echo "✅ SUCCESS! Net sales matches Toast web within \$10!"
        echo ""
        echo "V8 API is working correctly!"
    else
        echo "⚠️  Still a discrepancy of \$$DIFF"
        echo ""
        echo "Check the detailed breakdown above for issues."
    fi
fi

echo ""
echo "=== BREAKDOWN ==="
echo "Credit Tips:   \$$CREDIT_TIPS (Toast web: \$3,324.35)"
echo "Credit Amount: \$$CREDIT_AMOUNT (Toast web: \$36,659.45)"
echo "Cash Sales:    \$$CASH_SALES (Toast web: \$2,239.54)"
echo ""
