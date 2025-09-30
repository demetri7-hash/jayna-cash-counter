// Vercel API function to fetch orders from Toast API with flexible parameters
// This avoids CORS issues by making the request server-side

export default async function handler(req, res) {
  // Enable CORS for your domain
  res.setHeader('Access-Control-Allow-Origin', 'https://jayna-cash-counter.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { accessToken, startDate, endDate, pageSize = 100 } = req.body;

    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Access token is required'
      });
    }

    console.log(`Fetching Toast orders from ${startDate} to ${endDate}, pageSize: ${pageSize}`);

    // Toast API configuration
    const TOAST_CONFIG = {
      baseUrl: process.env.TOAST_BASE_URL || 'https://ws-api.toasttab.com',
      restaurantGuid: process.env.TOAST_RESTAURANT_GUID || '9ac790ee-e6af-4c96-ae73-93d442db6810'
    };

    // Build the API URL with parameters
    let ordersUrl = `${TOAST_CONFIG.baseUrl}/orders/v2/orders?pageSize=${pageSize}`;
    
    if (startDate) {
      ordersUrl += `&startDate=${startDate}`;
    }
    if (endDate) {
      ordersUrl += `&endDate=${endDate}`;
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