// Vercel API function to fetch data from Homebase API
// This avoids CORS issues by making the request server-side

export default async function handler(req, res) {
  // Enable CORS for your domain - allow multiple origins for debugging
  const allowedOrigins = [
    'https://jayna-cash-counter.vercel.app',
    'https://provincial-rhianon-restaurantintelligence-b8a4dd49.koyeb.app',
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

    console.log(`🏠 Fetching Homebase data from: ${endpoint} using ${method}`);
    console.log(`📍 Original endpoint: ${endpoint}`);

    // Homebase API credentials from environment variables
    const HOMEBASE_CONFIG = {
      baseUrl: process.env.HOMEBASE_BASE_URL || 'https://api.joinhomebase.com',
      apiKey: process.env.HOMEBASE_API_KEY,
      locationUuid: process.env.HOMEBASE_LOCATION_UUID
    };

    console.log(`🔐 Homebase Config Debug:`, {
      baseUrl: HOMEBASE_CONFIG.baseUrl,
      apiKey: HOMEBASE_CONFIG.apiKey ? `${HOMEBASE_CONFIG.apiKey.substring(0, 10)}...` : 'MISSING',
      locationUuid: HOMEBASE_CONFIG.locationUuid || 'MISSING'
    });

    // Validate required environment variables
    if (!HOMEBASE_CONFIG.apiKey) {
      return res.status(500).json({
        success: false,
        error: 'Homebase API key not configured'
      });
    }

    if (!HOMEBASE_CONFIG.locationUuid) {
      return res.status(500).json({
        success: false,
        error: 'Homebase location UUID not configured'
      });
    }

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

    // Inject location UUID into endpoint path if needed
    if (baseEndpoint.includes('/locations/LOCATION_UUID/')) {
      console.log(`🔄 Replacing LOCATION_UUID with: ${HOMEBASE_CONFIG.locationUuid}`);
      baseEndpoint = baseEndpoint.replace('/locations/LOCATION_UUID/', `/locations/${HOMEBASE_CONFIG.locationUuid}/`);
      console.log(`📍 Final endpoint: ${baseEndpoint}`);
    }

    // Merge params from body with parsed query params
    const allParams = { ...queryParams, ...params };

    // Convert date parameters to ISO 8601 format for Homebase API
    const formatDateForHomebase = (dateStr) => {
      if (!dateStr) return dateStr;
      
      // If already in ISO format, return as-is
      if (dateStr.includes('T') || dateStr.includes('Z')) return dateStr;
      
      // Convert YYYY-MM-DD to YYYY-MM-DDTHH:MM:SSZ format
      if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return `${dateStr}T00:00:00Z`;
      }
      
      return dateStr;
    };

    // Apply date formatting to common date parameters
    Object.keys(allParams).forEach(key => {
      if (['start_date', 'end_date', 'date'].includes(key)) {
        allParams[key] = formatDateForHomebase(allParams[key]);
      }
    });

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
      
      // Enhanced error handling based on Homebase API documentation
      let errorMessage;
      switch (homebaseResponse.status) {
        case 400:
          errorMessage = 'Bad Request: Invalid parameters or malformed request';
          break;
        case 401:
          errorMessage = 'Unauthorized: Invalid or missing API key';
          break;
        case 403:
          errorMessage = 'Forbidden: Insufficient permissions for this resource';
          break;
        case 404:
          errorMessage = 'Not Found: Resource does not exist';
          break;
        case 429:
          errorMessage = 'Rate Limit Exceeded: Too many requests (60/minute max)';
          break;
        case 500:
          errorMessage = 'Internal Server Error: Homebase API server error';
          break;
        default:
          errorMessage = `Homebase API error: ${homebaseResponse.status} - ${errorText}`;
      }
      
      return res.status(homebaseResponse.status).json({
        success: false,
        error: errorMessage,
        details: errorText
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