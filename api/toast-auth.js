// Vercel API function to handle Toast authentication
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
    console.log('Toast authentication request received');

    // Toast API credentials from environment variables or hardcoded for testing
    const TOAST_CONFIG = {
      baseUrl: process.env.TOAST_BASE_URL || 'https://ws-api.toasttab.com',
      clientId: process.env.TOAST_CLIENT_ID || '3g0R0NFYjHIQcVe9bYP8eTbJjwRTvCNV',
      clientSecret: process.env.TOAST_CLIENT_SECRET || 'dClMNN5GmpgCZYU8BtTK9NGCVT4eAmZtE0E4EkJO4CFpPJx2rXP26PTptwSe--Sa',
      userAccessType: 'TOAST_MACHINE_CLIENT'
    };

    // Make the authentication request to Toast API
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

    if (authResponse.ok && authData.token?.accessToken) {
      console.log('Toast authentication successful');
      
      return res.status(200).json({
        success: true,
        message: 'Toast authentication successful',
        data: {
          authenticated: true,
          tokenType: authData.token.tokenType,
          expiresIn: authData.token.expiresIn,
          scopes: authData.token.scope?.split(' ') || [],
          accessToken: authData.token.accessToken // We'll need this for subsequent requests
        }
      });
    } else {
      console.error('Toast authentication failed:', authData);
      
      return res.status(400).json({
        success: false,
        error: `Toast authentication failed: ${authData.message || 'Unknown error'}`,
        details: authData
      });
    }

  } catch (error) {
    console.error('Authentication error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error during authentication',
      details: error.message
    });
  }
}