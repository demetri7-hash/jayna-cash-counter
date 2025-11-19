/**
 * EZCater Failed Webhook Events Checker
 * Lists failed webhook delivery attempts in the last 7 days
 * Updated October 2025 to use correct GraphQL schema fields
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

    // Updated query with correct field names from schema introspection (Nov 2025)
    // ExternalEvent fields: entityId, entityType, key, subscriberName, timestamp, externalEventsNotificationAttempts
    const query = `
      query GetFailedEvents($datetimeRange: DatetimeRangeInput!, $parentId: ID!, $parentType: Parent!) {
        failedEvents(datetimeRange: $datetimeRange, parentId: $parentId, parentType: $parentType) {
          entityId
          entityType
          key
          subscriberName
          timestamp
          externalEventsNotificationAttempts {
            number
            startedAt
            responseCode
            responseBody
            responseReceivedAt
            successful
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
          datetimeRange: {
            starting: startDate.toISOString(),
            ending: endDate.toISOString()
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

    // Process events for better readability
    const processedEvents = failedEvents.map(event => ({
      order_uuid: event.entityId,
      event_type: event.key,
      entity_type: event.entityType,
      subscriber: event.subscriberName,
      timestamp: event.timestamp,
      attempts: event.externalEventsNotificationAttempts?.map(attempt => ({
        attempt_number: attempt.number,
        started_at: attempt.startedAt,
        response_code: attempt.responseCode,
        response_body: attempt.responseBody,
        response_received_at: attempt.responseReceivedAt,
        successful: attempt.successful
      })) || [],
      last_error: event.externalEventsNotificationAttempts?.[0]?.responseBody || 'Unknown',
      last_response_code: event.externalEventsNotificationAttempts?.[0]?.responseCode || null
    }));

    return res.status(200).json({
      success: true,
      totalFailedEvents: failedEvents.length,
      failedEvents: processedEvents,
      rawEvents: failedEvents,
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      },
      note: failedEvents.length === 0
        ? '✅ No failed webhook events in the last 7 days'
        : `⚠️ Found ${failedEvents.length} failed webhook events - check order_uuid to find missing orders`,
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
