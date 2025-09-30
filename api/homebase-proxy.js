// Vercel API function to fetch data from Homebase API
// This avoids CORS issues by making the request server-side

export default async function handler(req, res) {
  // Enable CORS for your domain
  res.setHeader('Access-Control-Allow-Origin', 'https://jayna-cash-counter.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { endpoint, method = 'GET', params = {} } = req.body;

    if (!endpoint) {
      return res.status(400).json({
        success: false,
        error: 'Endpoint is required'
      });
    }

    console.log(`Fetching Homebase data from: ${endpoint} using ${method}`);

    // Homebase API credentials from environment variables
    const HOMEBASE_CONFIG = {
      baseUrl: process.env.HOMEBASE_BASE_URL || 'https://api.joinhomebase.com/v1',
      apiKey: process.env.HOMEBASE_API_KEY || 'your_homebase_api_key_here'
    };

    // Parse endpoint if it contains query parameters
    let baseEndpoint = endpoint;
    let queryParams = {};
    
    if (endpoint.includes('?')) {
      const [base, queryString] = endpoint.split('?');
      baseEndpoint = base;
      const urlParams = new URLSearchParams(queryString);
      for (const [key, value] of urlParams.entries()) {
        queryParams[key] = value;
      }
    }

    // Merge params from body with parsed query params
    const allParams = { ...queryParams, ...params };

    // Build URL with query parameters if needed
    let url = `${HOMEBASE_CONFIG.baseUrl}${baseEndpoint}`;
    if (Object.keys(allParams).length > 0 && method === 'GET') {
      const searchParams = new URLSearchParams();
      Object.entries(allParams).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          searchParams.append(key, value);
        }
      });
      if (searchParams.toString()) {
        url += `?${searchParams.toString()}`;
      }
    }

    // Prepare fetch options
    const fetchOptions = {
      method,
      headers: {
        'Authorization': `Bearer ${HOMEBASE_CONFIG.apiKey}`,
        'Accept': 'application/vnd.homebase-v1+json'
      }
    };

    // For POST requests, add body
    if (method === 'POST' && Object.keys(params).length > 0) {
      fetchOptions.headers['Content-Type'] = 'application/x-www-form-urlencoded';
      const formData = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          formData.append(key, value);
        }
      });
      fetchOptions.body = formData.toString();
    } else if (method === 'GET') {
      fetchOptions.headers['Content-Type'] = 'application/json';
    }

    // Fetch data from Homebase API
    const homebaseResponse = await fetch(url, fetchOptions);

    if (!homebaseResponse.ok) {
      const errorText = await homebaseResponse.text();
      console.error('Homebase API error:', homebaseResponse.status, errorText);
      return res.status(homebaseResponse.status).json({
        success: false,
        error: `Homebase API error: ${homebaseResponse.status} - ${errorText}`
      });
    }

    const homebaseData = await homebaseResponse.json();
    console.log(`Successfully fetched Homebase data from ${endpoint}`);

    return res.status(200).json({
      success: true,
      data: homebaseData
    });

  } catch (error) {
    console.error('Error fetching Homebase data:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}