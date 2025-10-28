/**
 * Find EZCater Order UUID from ezManage order number
 * Checks failed events for the order
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
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

    console.log('🔍 Checking for failed webhook events in last 7 days...');

    // Check failed events from last 7 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    const query = `
      query GetFailedEvents($datetimeRange: DatetimeRangeInput!, $parentId: ID!, $parentType: Parent!) {
        failedEvents(datetimeRange: $datetimeRange, parentId: $parentId, parentType: $parentType) {
          eventEntity
          eventKey
          eventId
          orderId
          createdAt
          lastAttemptAt
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
          datetimeRange: {
            start: startDate.toISOString(),
            end: endDate.toISOString()
          },
          parentId: CATERER_UUID,
          parentType: 'Caterer'
        }
      })
    });

    const data = await response.json();

    if (data.errors) {
      console.error('❌ GraphQL errors:', data.errors);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch failed events',
        details: data.errors
      });
    }

    const failedEvents = data.data?.failedEvents || [];

    console.log(`📊 Found ${failedEvents.length} failed webhook events`);

    return res.status(200).json({
      success: true,
      totalFailedEvents: failedEvents.length,
      failedEvents: failedEvents,
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
