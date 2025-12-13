/**
 * Vercel API function to fetch ALL Toast orders for a date range (with auto-authentication)
 * Uses environment variables for credentials - no manual token required!
 */

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'startDate and endDate are required (format: YYYYMMDD)'
      });
    }

    console.log(`🔐 Authenticating with Toast API...`);

    // Step 1: Get access token using environment variables
    const TOAST_CONFIG = {
      baseUrl: process.env.TOAST_BASE_URL || 'https://ws-api.toasttab.com',
      clientId: process.env.TOAST_CLIENT_ID,
      clientSecret: process.env.TOAST_CLIENT_SECRET,
      restaurantGuid: process.env.TOAST_RESTAURANT_GUID,
      userAccessType: 'TOAST_MACHINE_CLIENT'
    };

    if (!TOAST_CONFIG.clientId || !TOAST_CONFIG.clientSecret) {
      return res.status(500).json({
        success: false,
        error: 'Toast API credentials not configured in environment variables'
      });
    }

    // Authenticate
    const authResponse = await fetch(`${TOAST_CONFIG.baseUrl}/authentication/v1/authentication/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        clientId: TOAST_CONFIG.clientId,
        clientSecret: TOAST_CONFIG.clientSecret,
        userAccessType: TOAST_CONFIG.userAccessType
      })
    });

    const authData = await authResponse.json();

    if (!authResponse.ok || !authData.token?.accessToken) {
      console.error('❌ Toast authentication failed:', authData);
      return res.status(401).json({
        success: false,
        error: 'Toast authentication failed',
        details: authData.message || 'Unknown error'
      });
    }

    const accessToken = authData.token.accessToken;
    console.log(`✅ Authentication successful`);

    // Step 2: Fetch ALL orders with pagination
    console.log(`📥 Fetching orders from ${startDate} to ${endDate}...`);

    // Convert YYYYMMDD to ISO-8601
    const formatToISO8601 = (yyyymmdd) => {
      const year = yyyymmdd.substring(0, 4);
      const month = yyyymmdd.substring(4, 6);
      const day = yyyymmdd.substring(6, 8);
      return `${year}-${month}-${day}T00:00:00Z`;
    };

    const isoStartDate = formatToISO8601(startDate);
    const isoEndDate = formatToISO8601(endDate).replace('T00:00:00', 'T23:59:59');

    let allOrders = [];
    let currentPage = 1;
    const pageSize = 100;
    const maxPages = 100; // Safety limit (10,000 orders max)

    while (currentPage <= maxPages) {
      const pageUrl = `${TOAST_CONFIG.baseUrl}/orders/v2/ordersBulk?startDate=${encodeURIComponent(isoStartDate)}&endDate=${encodeURIComponent(isoEndDate)}&pageSize=${pageSize}&page=${currentPage}`;

      console.log(`📄 Fetching page ${currentPage}...`);

      const response = await fetch(pageUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Toast-Restaurant-External-ID': TOAST_CONFIG.restaurantGuid,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Toast API error on page ${currentPage}:`, response.status, errorText);
        return res.status(response.status).json({
          success: false,
          error: `Toast API error: ${response.status}`,
          details: errorText
        });
      }

      const pageData = await response.json();

      if (!Array.isArray(pageData) || pageData.length === 0) {
        console.log(`✅ No more data on page ${currentPage}, stopping`);
        break;
      }

      allOrders.push(...pageData);
      console.log(`✅ Page ${currentPage}: ${pageData.length} orders (total: ${allOrders.length})`);

      // If we got less than pageSize, this was the last page
      if (pageData.length < pageSize) {
        break;
      }

      currentPage++;

      // Add small delay to avoid rate limiting
      if (currentPage <= maxPages) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`✅ Successfully fetched ${allOrders.length} total orders across ${currentPage} pages`);

    return res.status(200).json({
      success: true,
      data: allOrders,
      totalCount: allOrders.length,
      pagesFetched: currentPage,
      dateRange: {
        start: startDate,
        end: endDate
      }
    });

  } catch (error) {
    console.error('❌ Bulk export error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
}
