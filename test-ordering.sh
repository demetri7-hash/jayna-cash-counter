#!/bin/bash

echo "🧪 Testing Automated Ordering Endpoint..."
echo ""
echo "Endpoint: https://jayna-cash-counter.vercel.app/api/daily-ordering"
echo "Auth: Bearer <REDACTED>"
echo ""
echo "Sending request..."
echo ""

# Read CRON_SECRET from environment variable
if [ -z "$CRON_SECRET" ]; then
  echo "❌ ERROR: CRON_SECRET environment variable not set"
  echo "Run: export CRON_SECRET='your-secret-here'"
  exit 1
fi

curl -s -X GET "https://jayna-cash-counter.vercel.app/api/daily-ordering" \
  -H "Authorization: Bearer $CRON_SECRET" \
  | python3 -m json.tool 2>/dev/null || curl -s -X GET "https://jayna-cash-counter.vercel.app/api/daily-ordering" \
  -H "Authorization: Bearer $CRON_SECRET"

echo ""
echo ""
echo "✅ Test complete! Check your email at demetri7@gmail.com for order sheets."
