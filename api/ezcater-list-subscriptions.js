/**
 * EZCater Subscription Diagnostic Tool (FIXED - October 2025)
 * Lists all active webhook subscriptions using REAL API schema from introspection
 */

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const EZCATER_API_TOKEN = process.env.EZCATER_API_TOKEN;
    const CATERER_UUID = 'c78c7e31-fe7c-40eb-8490-3468c99b1b68';

    if (!EZCATER_API_TOKEN) {
      throw new Error('EZCATER_API_TOKEN not configured');
    }

    console.log('🔍 Fetching EZCater webhook subscriptions using REAL schema...');

    // STEP 1: Get all subscribers (discovered via introspection)
    const subscribersQuery = `
      query GetSubscribers {
        subscribers {
          id
          name
          webhookUrl
          subscriptions {
            eventEntity
            eventKey
            parentEntity
            parentId
          }
        }
      }
    `;

    const subscribersResponse = await fetch('https://api.ezcater.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': EZCATER_API_TOKEN,
        'Apollographql-client-name': 'Jayna-Gyro-Sacramento',
        'Apollographql-client-version': '1.0.0'
      },
      body: JSON.stringify({
        query: subscribersQuery
      })
    });

    const subscribersData = await subscribersResponse.json();

    if (subscribersData.errors) {
      console.error('❌ GraphQL errors:', subscribersData.errors);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch subscribers',
        details: subscribersData.errors
      });
    }

    const allSubscribers = subscribersData.data?.subscribers || [];

    console.log(`✅ Found ${allSubscribers.length} total subscribers`);

    // STEP 2: Get caterer info (using correct plural query)
    const catererQuery = `
      query GetCaterer($uuids: [ID!]!) {
        caterers(uuids: $uuids) {
          uuid
          name
          storeNumber
        }
      }
    `;

    const catererResponse = await fetch('https://api.ezcater.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': EZCATER_API_TOKEN,
        'Apollographql-client-name': 'Jayna-Gyro-Sacramento',
        'Apollographql-client-version': '1.0.0'
      },
      body: JSON.stringify({
        query: catererQuery,
        variables: {
          uuids: [CATERER_UUID]
        }
      })
    });

    const catererData = await catererResponse.json();
    const caterer = catererData.data?.caterers?.[0];

    // STEP 3: Filter subscribers for our webhook URL and caterer
    const ourWebhookUrl = 'https://jayna-cash-counter.vercel.app/api/ezcater-webhook';
    const ourSubscribers = allSubscribers.filter(sub => sub.webhookUrl === ourWebhookUrl);

    console.log(`📋 Found ${ourSubscribers.length} subscribers with our webhook URL`);

    // Collect all subscriptions for our caterer
    const ourSubscriptions = [];
    ourSubscribers.forEach(subscriber => {
      const catererSubscriptions = subscriber.subscriptions?.filter(s =>
        s.parentId === CATERER_UUID && s.parentEntity === 'Caterer'
      ) || [];
      ourSubscriptions.push(...catererSubscriptions);
    });

    console.log(`✅ Found ${ourSubscriptions.length} active subscriptions for our caterer`);

    return res.status(200).json({
      success: true,
      caterer: {
        name: caterer?.name,
        uuid: caterer?.uuid,
        storeNumber: caterer?.storeNumber
      },
      totalSubscribers: allSubscribers.length,
      ourSubscribers: ourSubscribers.length,
      totalSubscriptions: ourSubscriptions.length,
      subscriptions: ourSubscriptions,
      webhookUrl: ourWebhookUrl,
      coverage: {
        submitted: ourSubscriptions.some(s => s.eventKey === 'submitted'),
        accepted: ourSubscriptions.some(s => s.eventKey === 'accepted'),
        rejected: ourSubscriptions.some(s => s.eventKey === 'rejected'),
        cancelled: ourSubscriptions.some(s => s.eventKey === 'cancelled')
      },
      allSubscribers: ourSubscribers,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error fetching subscriptions:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
