/**
 * Vercel Serverless Function: ezCater Delivery API Proxy
 * Handles delivery tracking mutations to ezCater Delivery API
 *
 * Supported operations:
 * - assignCourier: Assign driver to delivery
 * - unassignCourier: Remove driver assignment
 * - courierEvent: Update delivery lifecycle (picked_up, in_transit, delivered)
 * - trackingEvent: Send location updates
 * - uploadImage: Upload proof of delivery photo
 */

import { createClient } from '@supabase/supabase-js';

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
    const { operation, deliveryId, data } = req.body;

    console.log(`🚚 ezCater Delivery API: ${operation} for delivery ${deliveryId}`);

    if (!deliveryId) {
      return res.status(400).json({
        error: 'Missing deliveryId',
        details: 'deliveryId is required for all delivery operations'
      });
    }

    // Get API credentials
    const apiToken = process.env.EZCATER_API_TOKEN;
    const apiUrl = process.env.EZCATER_API_URL || 'https://api.ezcater.com/graphql';

    if (!apiToken) {
      return res.status(500).json({
        error: 'ezCater API not configured',
        details: 'EZCATER_API_TOKEN missing'
      });
    }

    // Route to appropriate handler
    let result;
    switch (operation) {
      case 'assignCourier':
        result = await assignCourier(apiUrl, apiToken, deliveryId, data);
        break;
      case 'unassignCourier':
        result = await unassignCourier(apiUrl, apiToken, deliveryId);
        break;
      case 'courierEvent':
        result = await createCourierEvent(apiUrl, apiToken, deliveryId, data);
        break;
      case 'trackingEvent':
        result = await createTrackingEvent(apiUrl, apiToken, deliveryId, data);
        break;
      case 'uploadImage':
        result = await uploadProofOfDelivery(apiUrl, apiToken, deliveryId, data);
        break;
      default:
        return res.status(400).json({
          error: 'Invalid operation',
          details: `Operation "${operation}" not supported`
        });
    }

    if (!result.success) {
      return res.status(500).json({
        error: 'ezCater API error',
        details: result.error
      });
    }

    // Update local database with tracking event
    await updateLocalDatabase(deliveryId, operation, data, result.data);

    console.log(`✅ ezCater Delivery API: ${operation} successful`);

    return res.status(200).json({
      success: true,
      operation,
      deliveryId,
      data: result.data
    });

  } catch (error) {
    console.error('❌ ezCater Delivery API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
}

/**
 * Assign courier to delivery
 */
async function assignCourier(apiUrl, apiToken, deliveryId, courierData) {
  const { name, phone } = courierData;

  const query = `
    mutation AssignCourier($deliveryId: ID!, $courier: CourierInput!) {
      courierAssign(deliveryId: $deliveryId, courier: $courier) {
        delivery {
          deliveryId
          courier {
            name
            phone
          }
        }
      }
    }
  `;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': apiToken,
        'Apollographql-client-name': 'jayna-catering-system',
        'Apollographql-client-version': '1.0.0'
      },
      body: JSON.stringify({
        query,
        variables: {
          deliveryId,
          courier: { name, phone }
        }
      })
    });

    const result = await response.json();

    if (result.errors) {
      console.error('❌ GraphQL errors:', result.errors);
      return {
        success: false,
        error: result.errors[0]?.message || 'GraphQL error'
      };
    }

    return {
      success: true,
      data: result.data?.courierAssign?.delivery
    };

  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Unassign courier from delivery
 */
async function unassignCourier(apiUrl, apiToken, deliveryId) {
  const query = `
    mutation UnassignCourier($deliveryId: ID!) {
      courierUnassign(deliveryId: $deliveryId) {
        delivery {
          deliveryId
          courier {
            name
          }
        }
      }
    }
  `;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': apiToken,
        'Apollographql-client-name': 'jayna-catering-system',
        'Apollographql-client-version': '1.0.0'
      },
      body: JSON.stringify({
        query,
        variables: { deliveryId }
      })
    });

    const result = await response.json();

    if (result.errors) {
      return {
        success: false,
        error: result.errors[0]?.message || 'GraphQL error'
      };
    }

    return {
      success: true,
      data: result.data?.courierUnassign?.delivery
    };

  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Create courier lifecycle event (picked_up, in_transit, delivered)
 */
async function createCourierEvent(apiUrl, apiToken, deliveryId, eventData) {
  const { eventType, timestamp, note } = eventData;

  const query = `
    mutation CreateCourierEvent($deliveryId: ID!, $event: CourierEventInput!) {
      courierEventCreate(deliveryId: $deliveryId, event: $event) {
        delivery {
          deliveryId
          status
        }
      }
    }
  `;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': apiToken,
        'Apollographql-client-name': 'jayna-catering-system',
        'Apollographql-client-version': '1.0.0'
      },
      body: JSON.stringify({
        query,
        variables: {
          deliveryId,
          event: {
            type: eventType,  // 'picked_up', 'in_transit', 'delivered'
            timestamp: timestamp || new Date().toISOString(),
            note: note || ''
          }
        }
      })
    });

    const result = await response.json();

    if (result.errors) {
      console.error('❌ GraphQL errors:', result.errors);
      return {
        success: false,
        error: result.errors[0]?.message || 'GraphQL error'
      };
    }

    return {
      success: true,
      data: {
        ...result.data?.courierEventCreate?.delivery,
        eventType
      }
    };

  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Create tracking event (location update)
 */
async function createTrackingEvent(apiUrl, apiToken, deliveryId, eventData) {
  const { latitude, longitude, timestamp } = eventData;

  const query = `
    mutation CreateTrackingEvent($deliveryId: ID!, $event: TrackingEventInput!) {
      courierTrackingEventCreate(deliveryId: $deliveryId, event: $event) {
        delivery {
          deliveryId
          lastKnownLocation {
            latitude
            longitude
          }
        }
      }
    }
  `;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': apiToken,
        'Apollographql-client-name': 'jayna-catering-system',
        'Apollographql-client-version': '1.0.0'
      },
      body: JSON.stringify({
        query,
        variables: {
          deliveryId,
          event: {
            latitude,
            longitude,
            timestamp: timestamp || new Date().toISOString()
          }
        }
      })
    });

    const result = await response.json();

    if (result.errors) {
      return {
        success: false,
        error: result.errors[0]?.message || 'GraphQL error'
      };
    }

    return {
      success: true,
      data: result.data?.courierTrackingEventCreate?.delivery
    };

  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Upload proof of delivery image
 */
async function uploadProofOfDelivery(apiUrl, apiToken, deliveryId, imageData) {
  const { imageBase64 } = imageData;

  const query = `
    mutation UploadProofOfDelivery($deliveryId: ID!, $imageData: String!) {
      courierImageCreate(deliveryId: $deliveryId, imageData: $imageData) {
        delivery {
          deliveryId
          proofOfDeliveryUrl
        }
      }
    }
  `;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': apiToken,
        'Apollographql-client-name': 'jayna-catering-system',
        'Apollographql-client-version': '1.0.0'
      },
      body: JSON.stringify({
        query,
        variables: {
          deliveryId,
          imageData: imageBase64
        }
      })
    });

    const result = await response.json();

    if (result.errors) {
      return {
        success: false,
        error: result.errors[0]?.message || 'GraphQL error'
      };
    }

    return {
      success: true,
      data: result.data?.courierImageCreate?.delivery
    };

  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Update local database with tracking event
 */
async function updateLocalDatabase(deliveryId, operation, data, resultData) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.warn('⚠️ Supabase not configured, skipping local database update');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Find order by delivery_id
  const { data: orders, error: findError } = await supabase
    .from('catering_orders')
    .select('*')
    .eq('delivery_id', deliveryId)
    .limit(1);

  if (findError || !orders || orders.length === 0) {
    console.warn(`⚠️ Order not found for deliveryId ${deliveryId}`);
    return;
  }

  const order = orders[0];

  // Build tracking event
  const trackingEvent = {
    timestamp: new Date().toISOString(),
    operation,
    auto: false,  // Manual operation (automated ones marked separately)
    data: resultData
  };

  // Parse existing tracking events
  let trackingEvents = [];
  try {
    trackingEvents = typeof order.delivery_tracking_events === 'string'
      ? JSON.parse(order.delivery_tracking_events)
      : (order.delivery_tracking_events || []);
  } catch (e) {
    trackingEvents = [];
  }

  // Add new event
  trackingEvents.push(trackingEvent);

  // Build update object
  const updates = {
    delivery_tracking_events: JSON.stringify(trackingEvents),
    last_auto_update_at: new Date().toISOString()
  };

  // Add operation-specific updates
  if (operation === 'assignCourier') {
    updates.courier_name = data.name;
    updates.courier_phone = data.phone;
    updates.delivery_status = 'assigned';
  } else if (operation === 'courierEvent') {
    const statusMap = {
      'picked_up': 'picked_up',
      'in_transit': 'in_transit',
      'delivered': 'delivered'
    };
    updates.delivery_status = statusMap[data.eventType] || order.delivery_status;
  } else if (operation === 'uploadImage') {
    updates.proof_of_delivery_url = resultData.proofOfDeliveryUrl;
  } else if (operation === 'unassignCourier') {
    updates.courier_name = null;
    updates.courier_phone = null;
    updates.delivery_status = 'pending';
  }

  // Update database
  const { error: updateError } = await supabase
    .from('catering_orders')
    .update(updates)
    .eq('id', order.id);

  if (updateError) {
    console.error('❌ Error updating local database:', updateError);
  } else {
    console.log(`✅ Local database updated for delivery ${deliveryId}`);
  }
}
