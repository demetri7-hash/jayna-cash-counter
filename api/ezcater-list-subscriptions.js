/**
 * EZCater Subscription Diagnostic Tool
 * Lists all active webhook subscriptions
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

    console.log('🔍 Fetching EZCater webhook subscriptions...');

    // GraphQL query to list all subscriptions for this caterer
    const query = `
      query GetCaterer($uuid: ID!) {
        caterer(id: $uuid) {
          uuid
          name
          storeNumber
          eventNotificationSubscriptions {
            id
            url
            eventEntity
            eventKey
            parentId
            parentEntity
            createdAt
          }
        }
      }
    `;

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
        variables: {
          uuid: CATERER_UUID
        }
      })
    });

    const data = await response.json();

    if (data.errors) {
      console.error('❌ GraphQL errors:', data.errors);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch subscriptions',
        details: data.errors
      });
    }

    const caterer = data.data?.caterer;
    const subscriptions = caterer?.eventNotificationSubscriptions || [];

    console.log(`✅ Found ${subscriptions.length} active subscriptions`);

    // Check for our webhook URL
    const ourWebhookUrl = 'https://jayna-cash-counter.vercel.app/api/ezcater-webhook';
    const activeSubscriptions = subscriptions.filter(sub => sub.url === ourWebhookUrl);

    return res.status(200).json({
      success: true,
      caterer: {
        name: caterer?.name,
        uuid: caterer?.uuid,
        storeNumber: caterer?.storeNumber
      },
      totalSubscriptions: subscriptions.length,
      activeForOurWebhook: activeSubscriptions.length,
      subscriptions: subscriptions,
      webhookUrl: ourWebhookUrl,
      coverage: {
        submitted: activeSubscriptions.some(s => s.eventKey === 'submitted'),
        accepted: activeSubscriptions.some(s => s.eventKey === 'accepted'),
        rejected: activeSubscriptions.some(s => s.eventKey === 'rejected'),
        cancelled: activeSubscriptions.some(s => s.eventKey === 'cancelled')
      },
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
