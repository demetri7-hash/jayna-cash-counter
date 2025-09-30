// Vercel API function to get restaurant info from Toast API
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

    console.log('Fetching Toast restaurant info');

    // Toast API configuration
    const TOAST_CONFIG = {
      baseUrl: process.env.TOAST_BASE_URL || 'https://ws-api.toasttab.com',
      restaurantGuid: process.env.TOAST_RESTAURANT_GUID || 'd3efae34-7c2e-4107-a442-49081e624706'
    };

    // Make the restaurant request to Toast API
    const restaurantResponse = await fetch(`${TOAST_CONFIG.baseUrl}/restaurants/v1/restaurants/${TOAST_CONFIG.restaurantGuid}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Toast-Restaurant-External-ID': TOAST_CONFIG.restaurantGuid,
        'Content-Type': 'application/json'
      }
    });

    if (!restaurantResponse.ok) {
      const errorText = await restaurantResponse.text();
      console.error('Toast restaurant API failed:', restaurantResponse.status, errorText);
      
      return res.status(restaurantResponse.status).json({
        success: false,
        error: `Toast restaurant API failed: ${restaurantResponse.status} ${restaurantResponse.statusText}`,
        details: errorText
      });
    }

    const restaurantData = await restaurantResponse.json();
    console.log('Retrieved restaurant info successfully');

    return res.status(200).json({
      success: true,
      message: 'Restaurant info retrieved successfully',
      data: {
        name: restaurantData.general?.name,
        location: restaurantData.location,
        timeZone: restaurantData.general?.timeZone,
        schedules: restaurantData.schedules ? 'Present' : 'Not found',
        fullData: restaurantData
      }
    });

  } catch (error) {
    console.error('Restaurant info fetch error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error during restaurant info fetch',
      details: error.message
    });
  }
}