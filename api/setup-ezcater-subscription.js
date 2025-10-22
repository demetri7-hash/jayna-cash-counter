/**
 * Vercel Serverless Function: Setup EZCater Event Subscription
 * ONE-TIME SETUP to subscribe to order notifications
 *
 * Visit: /api/setup-ezcater-subscription to create subscription
 */

export default async function handler(req, res) {
  try {
    console.log('📋 Setting up EZCater event subscription...');

    // Get API credentials
    const apiToken = process.env.EZCATER_API_TOKEN;
    const catererId = process.env.EZCATER_CATERER_ID; // Your caterer ID
    const apiUrl = process.env.EZCATER_API_URL || 'https://api.ezcater.com/graphql';

    if (!apiToken) {
      return res.status(500).json({
        error: 'EZCATER_API_TOKEN not configured',
        details: 'Add EZCATER_API_TOKEN to Vercel environment variables'
      });
    }

    if (!catererId) {
      return res.status(500).json({
        error: 'EZCATER_CATERER_ID not configured',
        details: 'Add EZCATER_CATERER_ID to Vercel environment variables. Find it in ezManage or contact api_support@ezcater.com'
      });
    }

    // Create subscription for order events
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': apiToken,
        'Apollographql-client-name': 'jayna-catering-system',
        'Apollographql-client-version': '1.0.0'
      },
      body: JSON.stringify({
        query: `
          mutation CreateOrderSubscription($input: CreateEventNotificationSubscriptionInput!) {
            createEventNotificationSubscription(input: $input) {
              eventNotificationSubscription {
                id
                url
                eventEntity
                eventKey
                parentId
                parentEntity
                createdAt
              }
              errors
            }
          }
        `,
        variables: {
          input: {
            url: "https://jayna-cash-counter.vercel.app/api/ezcater-webhook",
            eventEntity: "Order",
            eventKey: "submitted",  // Subscribe to submitted events
            parentId: catererId,
            parentEntity: "Caterer"
          }
        }
      })
    });

    const data = await response.json();

    if (data.errors) {
      console.error('❌ GraphQL errors:', data.errors);
      return res.status(500).json({
        error: 'Failed to create subscription',
        details: data.errors
      });
    }

    const subscription = data.data?.createEventNotificationSubscription;

    if (subscription?.errors && subscription.errors.length > 0) {
      console.error('❌ Subscription errors:', subscription.errors);
      return res.status(500).json({
        error: 'Subscription creation failed',
        details: subscription.errors
      });
    }

    console.log('✅ Subscription created:', subscription.eventNotificationSubscription.id);

    // Now create subscriptions for other events
    const otherEvents = ['accepted', 'rejected', 'cancelled'];
    const subscriptions = [subscription.eventNotificationSubscription];

    for (const eventKey of otherEvents) {
      const eventResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': apiToken,
          'Apollographql-client-name': 'jayna-catering-system',
          'Apollographql-client-version': '1.0.0'
        },
        body: JSON.stringify({
          query: `
            mutation CreateOrderSubscription($input: CreateEventNotificationSubscriptionInput!) {
              createEventNotificationSubscription(input: $input) {
                eventNotificationSubscription {
                  id
                  eventKey
                }
                errors
              }
            }
          `,
          variables: {
            input: {
              url: "https://jayna-cash-counter.vercel.app/api/ezcater-webhook",
              eventEntity: "Order",
              eventKey: eventKey,
              parentId: catererId,
              parentEntity: "Caterer"
            }
          }
        })
      });

      const eventData = await eventResponse.json();
      if (eventData.data?.createEventNotificationSubscription?.eventNotificationSubscription) {
        subscriptions.push(eventData.data.createEventNotificationSubscription.eventNotificationSubscription);
        console.log(`✅ Subscription created for: ${eventKey}`);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'EZCater event subscriptions created successfully!',
      subscriptions: subscriptions,
      webhookUrl: 'https://jayna-cash-counter.vercel.app/api/ezcater-webhook',
      note: 'EZCater will now send order events to your webhook endpoint'
    });

  } catch (error) {
    console.error('❌ Setup error:', error);
    return res.status(500).json({
      error: 'Setup failed',
      details: error.message
    });
  }
}
