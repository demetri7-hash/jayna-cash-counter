/**
 * ezCater Orders API - GraphQL Proxy
 * Fetches orders from ezCater using their GraphQL API
 */

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const EZCATER_API_TOKEN = process.env.EZCATER_API_TOKEN;
    const CATERER_ID = '332390'; // Store Number
    const CATERER_UUID = 'c78c7e31-fe7c-40eb-8490-3468c99b1b68'; // Jayna Gyro-Sacramento UUID

    if (!EZCATER_API_TOKEN) {
      throw new Error('EZCATER_API_TOKEN not configured');
    }

    console.log('🍽️ Fetching ezCater orders...');

    // GraphQL query to fetch caterer info
    // 332390 is the STORE NUMBER (not UUID), so we use 'ids' parameter
    const query = `
      query GetCaterers($catererId: ID!) {
        caterers(ids: [$catererId]) {
          name
          storeNumber
          uuid
          address {
            street
            city
            state
            zip
          }
          live
        }
      }
    `;

    const variables = {
      catererId: CATERER_ID
    };

    // Make GraphQL request
    const response = await fetch('https://api.ezcater.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': EZCATER_API_TOKEN,
        'Apollographql-client-name': 'Jayna-Gyro-Sacramento',
        'Apollographql-client-version': '1.0.0'
      },
      body: JSON.stringify({
        query: query,
        variables: variables
      })
    });

    const data = await response.json();

    console.log('ezCater API Response Status:', response.status);
    console.log('ezCater API Response:', JSON.stringify(data, null, 2));

    if (!response.ok) {
      throw new Error(`ezCater API error: ${response.status} - ${JSON.stringify(data)}`);
    }

    return res.status(200).json({
      success: true,
      data: data,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ ezCater API error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
