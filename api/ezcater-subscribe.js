/**
 * ezCater Subscription Setup
 * Creates webhook subscriptions for order events
 */

export default async function handler(req, res) {
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
    const WEBHOOK_URL = 'https://jayna-cash-counter.vercel.app/api/ezcater-webhook';
    const CATERER_UUID = 'c78c7e31-fe7c-40eb-8490-3468c99b1b68';

    if (!EZCATER_API_TOKEN) {
      throw new Error('EZCATER_API_TOKEN not configured');
    }

    console.log('🔔 Setting up ezCater webhook subscriptions...');

    // STEP 1: Use introspection to find mutation names
    const introspectionQuery = `
      {
        __schema {
          mutationType {
            fields {
              name
              description
              args {
                name
                description
                type {
                  name
                  kind
                }
              }
            }
          }
        }
      }
    `;

    const introspectionResponse = await fetch('https://api.ezcater.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': EZCATER_API_TOKEN,
        'Apollographql-client-name': 'Jayna-Gyro-Sacramento',
        'Apollographql-client-version': '1.0.0'
      },
      body: JSON.stringify({
        query: introspectionQuery
      })
    });

    const introspectionData = await introspectionResponse.json();

    console.log('📋 Available mutations:', JSON.stringify(introspectionData, null, 2));

    return res.status(200).json({
      success: true,
      data: introspectionData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Subscription error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
