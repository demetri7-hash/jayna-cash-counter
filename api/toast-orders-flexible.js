// Vercel API function to fetch orders from Toast API with flexible parameters
// This avoids CORS issues by making the request server-side

export default async function handler(req, res) {
  // Enable CORS for your domain
  res.setHeader('Access-Control-Allow-Origin', 'https://jayna-cash-counter.vercel.app');
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
    const { accessToken, startDate, endDate, pageSize = 100 } = req.query;

    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Access token is required'
      });
    }

    // Toast API has a maximum pageSize limit of 100
    const validatedPageSize = Math.min(parseInt(pageSize) || 100, 100);
    
    console.log(`Fetching Toast orders from ${startDate} to ${endDate}, pageSize: ${validatedPageSize} (requested: ${pageSize})`);

    // Toast API configuration
    const TOAST_CONFIG = {
      baseUrl: process.env.TOAST_BASE_URL || 'https://ws-api.toasttab.com',
      restaurantGuid: process.env.TOAST_RESTAURANT_GUID || 'd3efae34-7c2e-4107-a442-49081e624706'
    };

    // Check if we can use businessDate for single-day queries (more reliable)
    if (startDate === endDate && startDate && startDate.length === 8) {
      // Use businessDate parameter for single-day queries (YYYYMMDD format)
      const businessDate = startDate;
      let ordersUrl = `${TOAST_CONFIG.baseUrl}/orders/v2/ordersBulk?businessDate=${businessDate}&pageSize=${pageSize}`;
      
      console.log(`Using businessDate approach: ${ordersUrl}`);
      
      const ordersResponse = await fetch(ordersUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Toast-Restaurant-External-ID': TOAST_CONFIG.restaurantGuid,
          'Accept': 'application/json'
        }
      });

      if (!ordersResponse.ok) {
        const errorText = await ordersResponse.text();
        console.error('Toast API error:', ordersResponse.status, errorText);
        return res.status(ordersResponse.status).json({
          success: false,
          error: `Toast API error: ${ordersResponse.status} - ${errorText}`
        });
      }

      const ordersData = await ordersResponse.json();
      console.log(`Successfully fetched ${ordersData.length || 0} orders using businessDate`);

      return res.status(200).json({
        success: true,
        data: ordersData,
        totalCount: ordersData.length || 0,
        method: 'businessDate'
      });
    }

    // Convert YYYYMMDD format to proper ISO-8601 format for date ranges
    const formatToISO8601 = (yyyymmdd) => {
      if (!yyyymmdd || yyyymmdd.length !== 8) return yyyymmdd;
      const year = yyyymmdd.substring(0, 4);
      const month = yyyymmdd.substring(4, 6);
      const day = yyyymmdd.substring(6, 8);
      
      // Use UTC timezone to avoid timezone issues
      return `${year}-${month}-${day}T00:00:00.000+0000`;
    };

    // Use ordersBulk endpoint (correct endpoint from documentation)
    let ordersUrl = `${TOAST_CONFIG.baseUrl}/orders/v2/ordersBulk?pageSize=${pageSize}`;
    
    if (startDate) {
      const isoStartDate = encodeURIComponent(formatToISO8601(startDate));
      ordersUrl += `&startDate=${isoStartDate}`;
    }
    if (endDate) {
      // For end date, set to end of day to include all orders for that date
      const isoEndDate = encodeURIComponent(formatToISO8601(endDate).replace('T00:00:00', 'T23:59:59'));
      ordersUrl += `&endDate=${isoEndDate}`;
    }

    console.log(`Orders URL: ${ordersUrl}`);

    // Make the orders request to Toast API
    let allOrders = [];
    let currentUrl = ordersUrl;
    let pageCount = 0;
    const maxPages = 10; // Prevent infinite loops

    do {
      console.log(`Fetching page ${pageCount + 1}...`);
      
      const ordersResponse = await fetch(currentUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Toast-Restaurant-External-ID': TOAST_CONFIG.restaurantGuid,
          'Accept': 'application/json'
        }
      });

      if (!ordersResponse.ok) {
        const errorText = await ordersResponse.text();
        console.error('Toast API error:', ordersResponse.status, errorText);
        return res.status(ordersResponse.status).json({
          success: false,
          error: `Toast API error: ${ordersResponse.status} - ${errorText}`
        });
      }

      const ordersData = await ordersResponse.json();
      
      if (ordersData && Array.isArray(ordersData)) {
        allOrders.push(...ordersData);
        console.log(`Fetched ${ordersData.length} orders on page ${pageCount + 1}`);
        
        // Check if we got a full page (indicating there might be more)
        if (ordersData.length < pageSize) {
          break; // No more pages
        }
        
        // For pagination, we'll use the last order's date as a starting point for the next page
        // This is a simplified approach - Toast API pagination is complex
        if (ordersData.length === pageSize && pageCount < maxPages - 1) {
          const lastOrder = ordersData[ordersData.length - 1];
          if (lastOrder && lastOrder.openedDate) {
            // Use the last order's date to continue pagination
            const lastDate = new Date(lastOrder.openedDate);
            const nextStartDate = lastDate.toISOString().split('T')[0];
            currentUrl = ordersUrl.replace(`startDate=${startDate}`, `startDate=${nextStartDate}`);
          } else {
            break; // No valid date to continue pagination
          }
        } else {
          break; // Reached max pages or got less than full page
        }
      } else {
        break; // Invalid response format
      }
      
      pageCount++;
    } while (pageCount < maxPages);

    console.log(`Successfully fetched ${allOrders.length} total orders across ${pageCount + 1} pages`);

    return res.status(200).json({
      success: true,
      data: allOrders,
      totalCount: allOrders.length,
      pages: pageCount + 1
    });

  } catch (error) {
    console.error('Error fetching Toast orders:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}