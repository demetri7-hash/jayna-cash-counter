/**
 * ezCater Subscription Setup (FIXED - October 2025)
 * Creates webhook subscriptions for order events using correct API mutation
 *
 * FIXED: Changed from createSubscriber (deprecated) to createEventNotificationSubscription
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

    // Create subscriptions for all order events using CORRECT mutation
    const eventKeys = ['submitted', 'accepted', 'rejected', 'cancelled'];
    const subscriptions = [];
    const errors = [];

    for (const eventKey of eventKeys) {
      console.log(`📝 Creating subscription for order.${eventKey}...`);

      const mutation = `
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
          query: mutation,
          variables: {
            input: {
              url: WEBHOOK_URL,
              eventEntity: 'Order',
              eventKey: eventKey,
              parentId: CATERER_UUID,
              parentEntity: 'Caterer'
            }
          }
        })
      });

      const data = await response.json();

      if (data.errors) {
        console.error(`❌ GraphQL error for ${eventKey}:`, data.errors);
        errors.push({ eventKey, error: data.errors });
        continue;
      }

      const result = data.data?.createEventNotificationSubscription;

      if (result?.errors && result.errors.length > 0) {
        console.error(`❌ Subscription error for ${eventKey}:`, result.errors);

        // Check if subscription already exists
        const isDuplicate = result.errors.some(err =>
          err.message?.toLowerCase().includes('already exists') ||
          err.message?.toLowerCase().includes('duplicate')
        );

        if (isDuplicate) {
          console.log(`ℹ️  Subscription for order.${eventKey} already exists (skipping)`);
          errors.push({ eventKey, error: 'Already exists', skipped: true });
        } else {
          errors.push({ eventKey, error: result.errors });
        }
        continue;
      }

      if (result?.eventNotificationSubscription) {
        console.log(`✅ Subscribed to order.${eventKey} (ID: ${result.eventNotificationSubscription.id})`);
        subscriptions.push(result.eventNotificationSubscription);
      }

      // Rate limiting: wait 500ms between requests
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Check if we have any successful subscriptions
    if (subscriptions.length === 0 && errors.length > 0) {
      // All failed, but check if they were duplicates
      const allDuplicates = errors.every(e => e.skipped);

      if (allDuplicates) {
        return res.status(200).json({
          success: true,
          message: 'Webhook subscriptions already exist! ✅',
          note: 'All subscriptions were already configured. Orders should be syncing automatically.',
          subscriptions: [],
          errors: errors,
          timestamp: new Date().toISOString()
        });
      }

      throw new Error(`Failed to create any subscriptions: ${JSON.stringify(errors)}`);
    }

    return res.status(200).json({
      success: true,
      message: `Webhook subscriptions created successfully! 🎉 (${subscriptions.length}/${eventKeys.length})`,
      webhookUrl: WEBHOOK_URL,
      subscriptions: subscriptions,
      skipped: errors.filter(e => e.skipped),
      errors: errors.filter(e => !e.skipped),
      coverage: {
        submitted: subscriptions.some(s => s.eventKey === 'submitted') || errors.some(e => e.eventKey === 'submitted' && e.skipped),
        accepted: subscriptions.some(s => s.eventKey === 'accepted') || errors.some(e => e.eventKey === 'accepted' && e.skipped),
        rejected: subscriptions.some(s => s.eventKey === 'rejected') || errors.some(e => e.eventKey === 'rejected' && e.skipped),
        cancelled: subscriptions.some(s => s.eventKey === 'cancelled') || errors.some(e => e.eventKey === 'cancelled' && e.skipped)
      },
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
