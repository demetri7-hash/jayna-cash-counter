// Vercel API function to fetch orders from Toast API with flexible parameters
// This avoids CORS issues by making the request server-side

export default async function handler(req, res) {
  // Enable CORS for your domain - allow multiple origins for debugging
  const allowedOrigins = [
    'https://jayna-cash-counter.vercel.app',
    'http://localhost:3000',
    'http://127.0.0.1:5500',
    'https://demetri7-hash.github.io'
  ];
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*'); // Allow all for debugging
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { accessToken, startDate, endDate, pageSize, page } = req.query;

    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Access token is required'
      });
    }

    // Convert YYYYMMDD format to proper ISO-8601 format for date ranges
    const formatToISO8601 = (yyyymmdd) => {
      if (!yyyymmdd || yyyymmdd.length !== 8) return yyyymmdd;
      
      // Convert YYYYMMDD to YYYY-MM-DDTHH:MM:SSZ
      const year = yyyymmdd.substring(0, 4);
      const month = yyyymmdd.substring(4, 6);
      const day = yyyymmdd.substring(6, 8);
      return `${year}-${month}-${day}T00:00:00Z`;
    };

    // If no pageSize provided, use maximum (100) and enable pagination to get ALL orders
    // If pageSize is provided, use it as a limit (for specific page requests)
    const shouldPaginateAll = !pageSize && !page; // Get ALL orders if no pageSize or page specified
    const validatedPageSize = pageSize ? Math.min(parseInt(pageSize) || 100, 100) : 100;
    const startPage = page ? parseInt(page) : 1;
    
    console.log(`Fetching Toast orders from ${startDate} to ${endDate}, pageSize: ${validatedPageSize}${shouldPaginateAll ? ' (with full pagination)' : ` page: ${startPage}`}`);

    // Toast API configuration
    const TOAST_CONFIG = {
      baseUrl: process.env.TOAST_BASE_URL || 'https://ws-api.toasttab.com',
      restaurantGuid: process.env.TOAST_RESTAURANT_GUID || 'd3efae34-7c2e-4107-a442-49081e624706'
    };

    // Use businessDate for single-day queries (more reliable according to Toast docs)
    if (startDate === endDate && startDate && startDate.length === 8) {
      // Single business date query - use businessDate parameter
      const businessDate = startDate; // Already in YYYYMMDD format

      if (shouldPaginateAll) {
        // Fetch ALL orders across all pages for this business date
        let allOrders = [];
        let currentPage = 1;
        const maxPages = 50; // Safety limit

        while (currentPage <= maxPages) {
          const pageUrl = `${TOAST_CONFIG.baseUrl}/orders/v2/ordersBulk?businessDate=${businessDate}&pageSize=${validatedPageSize}&page=${currentPage}`;
          console.log(`🍞 Fetching page ${currentPage} from: ${pageUrl}`);

          try {
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
                error: `Toast API error: ${response.status} - ${errorText}`,
                url: pageUrl
              });
            }

            const pageData = await response.json();
            console.log(`✅ Page ${currentPage} response:`, typeof pageData, Array.isArray(pageData) ? `${pageData.length} orders` : 'non-array response');
            
            if (!Array.isArray(pageData) || pageData.length === 0) {
              // No more data
              console.log(`📄 No more data on page ${currentPage}, stopping pagination`);
              break;
            }

            allOrders.push(...pageData);
            console.log(`📊 Page ${currentPage}: ${pageData.length} orders, total: ${allOrders.length}`);
          } catch (fetchError) {
            console.error(`💥 Network error fetching page ${currentPage}:`, fetchError.message);
            return res.status(500).json({
              success: false,
              error: `Network error: ${fetchError.message}`,
              url: pageUrl
            });
          }

          // If we got less than pageSize, this was the last page
          if (pageData.length < validatedPageSize) {
            break;
          }

          currentPage++;
        }

        console.log(`✅ Successfully fetched ${allOrders.length} total orders across ${currentPage} pages for businessDate ${businessDate}`);

        return res.status(200).json({
          success: true,
          data: allOrders,
          totalCount: allOrders.length,
          pagesFetched: currentPage,
          method: 'businessDate with full pagination'
        });

      } else {
        // Single page request for businessDate
        const pageUrl = `${TOAST_CONFIG.baseUrl}/orders/v2/ordersBulk?businessDate=${businessDate}&pageSize=${validatedPageSize}&page=${startPage}`;
        console.log(`Fetching single page from: ${pageUrl}`);

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
          console.error('Toast API error:', response.status, errorText);
          return res.status(response.status).json({
            success: false,
            error: `Toast API error: ${response.status} - ${errorText}`
          });
        }

        const ordersData = await response.json();
        console.log(`Successfully fetched ${ordersData.length || 0} orders using businessDate page ${startPage}`);

        return res.status(200).json({
          success: true,
          data: ordersData,
          totalCount: ordersData.length || 0,
          method: 'businessDate single page'
        });
      }
    }

    // Use startDate/endDate range queries with proper Toast API pagination
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'startDate and endDate are required for date range queries'
      });
    }

    const isoStartDate = formatToISO8601(startDate);
    const isoEndDate = formatToISO8601(endDate).replace('T00:00:00', 'T23:59:59'); // End of day

    if (shouldPaginateAll) {
      // Fetch ALL orders across all pages for this date range
      let allOrders = [];
      let currentPage = 1;
      const maxPages = 50; // Safety limit

      while (currentPage <= maxPages) {
        const pageUrl = `${TOAST_CONFIG.baseUrl}/orders/v2/ordersBulk?startDate=${encodeURIComponent(isoStartDate)}&endDate=${encodeURIComponent(isoEndDate)}&pageSize=${validatedPageSize}&page=${currentPage}`;
        console.log(`Fetching page ${currentPage} from date range: ${pageUrl}`);

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
          console.error('Toast API error:', response.status, errorText);
          return res.status(response.status).json({
            success: false,
            error: `Toast API error: ${response.status} - ${errorText}`
          });
        }

        const pageData = await response.json();
        
        if (!Array.isArray(pageData) || pageData.length === 0) {
          // No more data
          break;
        }

        allOrders.push(...pageData);
        console.log(`Page ${currentPage}: ${pageData.length} orders, total: ${allOrders.length}`);

        // If we got less than pageSize, this was the last page
        if (pageData.length < validatedPageSize) {
          break;
        }

        currentPage++;
      }

      console.log(`✅ Successfully fetched ${allOrders.length} total orders across ${currentPage} pages for range ${isoStartDate} to ${isoEndDate}`);

      return res.status(200).json({
        success: true,
        data: allOrders,
        totalCount: allOrders.length,
        pagesFetched: currentPage,
        method: 'dateRange with full pagination'
      });

    } else {
      // Single page request for date range
      const pageUrl = `${TOAST_CONFIG.baseUrl}/orders/v2/ordersBulk?startDate=${encodeURIComponent(isoStartDate)}&endDate=${encodeURIComponent(isoEndDate)}&pageSize=${validatedPageSize}&page=${startPage}`;
      console.log(`Fetching single page from date range: ${pageUrl}`);

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
        console.error('Toast API error:', response.status, errorText);
        return res.status(response.status).json({
          success: false,
          error: `Toast API error: ${response.status} - ${errorText}`
        });
      }

      const ordersData = await response.json();
      console.log(`Successfully fetched ${ordersData.length || 0} orders using dateRange page ${startPage}`);

      return res.status(200).json({
        success: true,
        data: ordersData,
        totalCount: ordersData.length || 0,
        method: 'dateRange single page'
      });
    }

  } catch (error) {
    console.error('Error fetching Toast orders:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
