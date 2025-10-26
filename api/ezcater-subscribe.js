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

    // STEP 0: Find ALL types with "Subscriber" or "Subscription" in name
    const typeIntrospection = `
      {
        __schema {
          types {
            name
            kind
            inputFields {
              name
              type {
                name
                kind
              }
            }
            fields {
              name
              type {
                name
                kind
              }
            }
          }
        }
      }
    `;

    const typeResponse = await fetch('https://api.ezcater.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': EZCATER_API_TOKEN,
        'Apollographql-client-name': 'Jayna-Gyro-Sacramento',
        'Apollographql-client-version': '1.0.0'
      },
      body: JSON.stringify({
        query: typeIntrospection
      })
    });

    // STEP 1: Create Subscriber (register webhook URL)
    const createSubscriberMutation = `
      mutation CreateSubscriber($subscriberParams: CreateSubscriberFields!) {
        createSubscriber(subscriberParams: $subscriberParams) {
          subscriber {
            id
            name
            webhookUrl
            webhookSecret
          }
        }
      }
    `;

    const subscriberResponse = await fetch('https://api.ezcater.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': EZCATER_API_TOKEN,
        'Apollographql-client-name': 'Jayna-Gyro-Sacramento',
        'Apollographql-client-version': '1.0.0'
      },
      body: JSON.stringify({
        query: createSubscriberMutation,
        variables: {
          subscriberParams: {
            name: 'Jayna Gyro Sacramento',
            webhookUrl: WEBHOOK_URL
          }
        }
      })
    });

    const subscriberData = await subscriberResponse.json();

    if (subscriberData.errors) {
      console.error('❌ Subscriber creation failed:', subscriberData.errors);
      throw new Error(`Failed to create subscriber: ${JSON.stringify(subscriberData.errors)}`);
    }

    console.log('✅ Subscriber created:', subscriberData.data.createSubscriber.subscriber);

    const subscriberId = subscriberData.data.createSubscriber.subscriber.id;

    // STEP 2: Create Subscription for Order events
    const createSubscriptionMutation = `
      mutation CreateSubscription($subscriptionParams: CreateSubscriptionFields!) {
        createSubscription(subscriptionParams: $subscriptionParams) {
          subscription {
            eventEntity
            eventKey
            parentEntity
            parentId
            subscriberId
          }
        }
      }
    `;

    // Subscribe to all order events: submitted, accepted, rejected, cancelled
    const eventKeys = ['submitted', 'accepted', 'rejected', 'cancelled'];
    const subscriptions = [];

    for (const eventKey of eventKeys) {
      const subscriptionResponse = await fetch('https://api.ezcater.com/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': EZCATER_API_TOKEN,
          'Apollographql-client-name': 'Jayna-Gyro-Sacramento',
          'Apollographql-client-version': '1.0.0'
        },
        body: JSON.stringify({
          query: createSubscriptionMutation,
          variables: {
            subscriptionParams: {
              eventEntity: 'Order',
              eventKey: eventKey,
              parentEntity: 'Caterer',
              parentId: CATERER_UUID,
              subscriberId: subscriberId
            }
          }
        })
      });

      const subscriptionData = await subscriptionResponse.json();

      if (subscriptionData.errors) {
        console.error(`❌ Subscription failed for ${eventKey}:`, subscriptionData.errors);
      } else {
        console.log(`✅ Subscribed to order.${eventKey}`);
        subscriptions.push(subscriptionData.data.createSubscription.subscription);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Webhook subscriptions created successfully! 🎉',
      subscriber: subscriberData.data.createSubscriber.subscriber,
      subscriptions: subscriptions,
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
