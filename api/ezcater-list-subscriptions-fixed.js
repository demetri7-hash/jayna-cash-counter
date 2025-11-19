/**
 * EZCater Webhook Subscriptions Checker (Fixed with Introspection)
 * Uses GraphQL introspection to find correct field name, then lists subscriptions
 */

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const apiToken = process.env.EZCATER_API_TOKEN;
    const apiUrl = process.env.EZCATER_API_URL || 'https://api.ezcater.com/graphql';

    if (!apiToken) {
      return res.status(500).json({
        error: 'EZCATER_API_TOKEN not configured'
      });
    }

    console.log('🔍 Step 1: Using introspection to find subscription field...');

    // STEP 1: Introspection to find the correct field name for subscriptions
    const introspectionQuery = `
      query IntrospectSubscriptions {
        __schema {
          queryType {
            fields {
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
    `;

    const introspectionResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': apiToken,
        'Apollographql-client-name': 'jayna-catering-system',
        'Apollographql-client-version': '1.0.0'
      },
      body: JSON.stringify({ query: introspectionQuery })
    });

    const introspectionData = await introspectionResponse.json();

    if (introspectionData.errors) {
      return res.status(500).json({
        error: 'Introspection failed',
        details: introspectionData.errors
      });
    }

    // Find subscription-related fields
    const queryFields = introspectionData.data.__schema.queryType.fields;
    const subscriptionFields = queryFields.filter(field =>
      field.name.toLowerCase().includes('subscription') ||
      field.name.toLowerCase().includes('notification') ||
      field.name.toLowerCase().includes('event') ||
      field.name.toLowerCase().includes('webhook')
    );

    console.log('📋 Subscription-related fields found:', subscriptionFields.map(f => f.name));

    // Try to find the most likely subscription listing field
    // NOTE: 'subscribers' is the actual ezCater field for listing webhook subscriptions
    const possibleFields = [
      'subscribers',  // This is the actual ezCater field!
      'eventNotificationSubscriptions',
      'subscriptions',
      'webhookSubscriptions',
      'notificationSubscriptions'
    ];

    let subscriptionFieldName = null;
    for (const fieldName of possibleFields) {
      if (queryFields.some(f => f.name === fieldName)) {
        subscriptionFieldName = fieldName;
        break;
      }
    }

    if (!subscriptionFieldName && subscriptionFields.length > 0) {
      // Use the first subscription-related field found
      subscriptionFieldName = subscriptionFields[0].name;
    }

    if (!subscriptionFieldName) {
      return res.json({
        success: false,
        message: 'No subscription field found in schema',
        available_subscription_fields: subscriptionFields
      });
    }

    console.log(`✅ Using subscription field: ${subscriptionFieldName}`);

    // STEP 2: Query subscriptions using the discovered field name
    // Different queries for different field types
    let subscriptionsQuery;

    if (subscriptionFieldName === 'subscribers') {
      // The 'subscribers' field has a different schema
      subscriptionsQuery = `
        query ListSubscribers {
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
    } else {
      // Generic subscription query with nodes pattern
      subscriptionsQuery = `
        query ListSubscriptions {
          ${subscriptionFieldName} {
            nodes {
              id
              eventTypes
              url
              active
              createdAt
            }
          }
        }
      `;
    }

    const subscriptionsResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': apiToken,
        'Apollographql-client-name': 'jayna-catering-system',
        'Apollographql-client-version': '1.0.0'
      },
      body: JSON.stringify({ query: subscriptionsQuery })
    });

    const subscriptionsData = await subscriptionsResponse.json();

    if (subscriptionsData.errors) {
      return res.status(500).json({
        error: 'Failed to fetch subscriptions',
        field_used: subscriptionFieldName,
        details: subscriptionsData.errors
      });
    }

    const webhookUrl = 'https://jayna-cash-counter.vercel.app/api/ezcater-webhook';
    const CATERER_UUID = 'c78c7e31-fe7c-40eb-8490-3468c99b1b68';

    // Handle different response formats
    if (subscriptionFieldName === 'subscribers') {
      // Process 'subscribers' response
      const allSubscribers = subscriptionsData.data?.subscribers || [];
      const ourSubscribers = allSubscribers.filter(sub => sub.webhookUrl === webhookUrl);

      console.log(`📊 Found ${allSubscribers.length} total subscribers, ${ourSubscribers.length} with our webhook URL`);

      // Collect subscriptions for our caterer
      const ourSubscriptions = [];
      ourSubscribers.forEach(subscriber => {
        const catererSubscriptions = subscriber.subscriptions?.filter(s =>
          s.parentId === CATERER_UUID && s.parentEntity === 'Caterer'
        ) || [];
        ourSubscriptions.push(...catererSubscriptions.map(s => ({
          ...s,
          subscriberId: subscriber.id,
          subscriberName: subscriber.name
        })));
      });

      // Check event coverage
      const allEventKeys = ourSubscriptions.map(s => s.eventKey);
      const requiredEvents = ['submitted', 'accepted', 'rejected', 'cancelled'];
      const missingEvents = requiredEvents.filter(e => !allEventKeys.includes(e));

      return res.json({
        success: true,
        field_used: subscriptionFieldName,
        webhook_url: webhookUrl,
        caterer_uuid: CATERER_UUID,
        summary: {
          total_subscribers: allSubscribers.length,
          our_subscribers: ourSubscribers.length,
          total_subscriptions: ourSubscriptions.length,
          missing_events: missingEvents
        },
        subscribers: ourSubscribers,
        subscriptions: ourSubscriptions,
        coverage: {
          submitted: allEventKeys.includes('submitted'),
          accepted: allEventKeys.includes('accepted'),
          rejected: allEventKeys.includes('rejected'),
          cancelled: allEventKeys.includes('cancelled')
        },
        health_check: {
          has_subscribers: ourSubscribers.length > 0,
          has_subscriptions: ourSubscriptions.length > 0,
          all_events_covered: missingEvents.length === 0
        },
        issues: [
          ...(ourSubscribers.length === 0 ? ['❌ NO SUBSCRIBERS found with our webhook URL!'] : []),
          ...(ourSubscriptions.length === 0 ? ['❌ NO SUBSCRIPTIONS found for our caterer!'] : []),
          ...(missingEvents.length > 0 ? [`⚠️ Missing event types: ${missingEvents.join(', ')}`] : [])
        ]
      });
    }

    // Original code for other subscription field types
    const subscriptions = subscriptionsData.data?.[subscriptionFieldName]?.nodes || [];

    console.log(`📊 Found ${subscriptions.length} subscriptions`);

    // Check subscription health
    const activeSubscriptions = subscriptions.filter(sub => sub.active);
    const inactiveSubscriptions = subscriptions.filter(sub => !sub.active);
    const wrongUrlSubscriptions = subscriptions.filter(sub => sub.url !== webhookUrl);

    // Check event type coverage
    const allEventTypes = subscriptions.flatMap(sub => sub.eventTypes || []);
    const requiredEventTypes = ['ORDER_SUBMITTED', 'ORDER_ACCEPTED', 'ORDER_REJECTED', 'ORDER_CANCELLED'];
    const missingEventTypes = requiredEventTypes.filter(type => !allEventTypes.includes(type));

    return res.json({
      success: true,
      field_used: subscriptionFieldName,
      webhook_url: webhookUrl,
      summary: {
        total_subscriptions: subscriptions.length,
        active_subscriptions: activeSubscriptions.length,
        inactive_subscriptions: inactiveSubscriptions.length,
        wrong_url_subscriptions: wrongUrlSubscriptions.length,
        missing_event_types: missingEventTypes
      },
      subscriptions: subscriptions.map(sub => ({
        id: sub.id,
        event_types: sub.eventTypes,
        url: sub.url,
        active: sub.active,
        created_at: sub.createdAt,
        status: sub.active ? '✅ ACTIVE' : '❌ INACTIVE',
        url_correct: sub.url === webhookUrl ? '✅' : `❌ Wrong URL: ${sub.url}`
      })),
      health_check: {
        all_active: inactiveSubscriptions.length === 0,
        all_urls_correct: wrongUrlSubscriptions.length === 0,
        all_events_covered: missingEventTypes.length === 0
      },
      issues: [
        ...(inactiveSubscriptions.length > 0 ? [`${inactiveSubscriptions.length} subscription(s) are INACTIVE`] : []),
        ...(wrongUrlSubscriptions.length > 0 ? [`${wrongUrlSubscriptions.length} subscription(s) have incorrect URL`] : []),
        ...(missingEventTypes.length > 0 ? [`Missing event types: ${missingEventTypes.join(', ')}`] : [])
      ]
    });

  } catch (error) {
    console.error('❌ Error:', error);
    return res.status(500).json({
      error: error.message,
      stack: error.stack
    });
  }
}
