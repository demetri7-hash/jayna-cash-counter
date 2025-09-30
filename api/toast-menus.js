// Vercel API function to fetch menus from Toast API
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
    const { accessToken } = req.body;

    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Access token is required'
      });
    }

    console.log('Fetching Toast menus');

    // Toast API credentials from environment variables
    const TOAST_CONFIG = {
      baseUrl: process.env.TOAST_BASE_URL || 'https://ws-api.toasttab.com',
      restaurantGuid: process.env.TOAST_RESTAURANT_GUID || '9ac790ee-e6af-4c96-ae73-93d442db6810'
    };

    // Fetch menus from Toast API
    const menusResponse = await fetch(`${TOAST_CONFIG.baseUrl}/menus/v2/menus`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Toast-Restaurant-External-ID': TOAST_CONFIG.restaurantGuid,
        'Accept': 'application/json'
      }
    });

    if (!menusResponse.ok) {
      const errorText = await menusResponse.text();
      console.error('Toast menus API error:', menusResponse.status, errorText);
      return res.status(menusResponse.status).json({
        success: false,
        error: `Toast API error: ${menusResponse.status} - ${errorText}`
      });
    }

    const menusData = await menusResponse.json();
    console.log(`Successfully fetched ${menusData.length || 0} menus`);

    return res.status(200).json({
      success: true,
      data: menusData
    });

  } catch (error) {
    console.error('Error fetching Toast menus:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}