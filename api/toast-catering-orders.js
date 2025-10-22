/**
 * Vercel Serverless Function: Toast Catering Orders
 * Fetches catering orders from Toast API for upcoming date range
 *
 * Catering orders identified by source field:
 * - "Invoice"
 * - "Catering"
 * - "Catering Online Ordering"
 */

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { accessToken, startDate, endDate } = req.body;

    if (!accessToken || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Access token, startDate, and endDate are required'
      });
    }

    console.log(`📋 Fetching Toast catering orders: ${startDate} to ${endDate}`);

    // Toast API configuration
    const TOAST_CONFIG = {
      baseUrl: process.env.TOAST_BASE_URL || 'https://ws-api.toasttab.com',
      restaurantGuid: process.env.TOAST_RESTAURANT_GUID
    };

    // Convert dates to business date format (yyyymmdd)
    const startBusinessDate = parseInt(startDate.replace(/-/g, ''));
    const endBusinessDate = parseInt(endDate.replace(/-/g, ''));

    console.log(`📅 Date range: ${startBusinessDate} to ${endBusinessDate}`);

    // Fetch orders for each day in the range
    const allCateringOrders = [];
    let currentDate = new Date(startDate);
    const finalDate = new Date(endDate);

    while (currentDate <= finalDate) {
      const businessDate = currentDate.toISOString().split('T')[0].replace(/-/g, '');

      console.log(`🔍 Fetching orders for ${businessDate}...`);

      // Fetch orders for this business date
      const ordersUrl = `${TOAST_CONFIG.baseUrl}/orders/v2/ordersBulk?businessDate=${businessDate}&pageSize=100`;

      const response = await fetch(ordersUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Toast-Restaurant-External-ID': TOAST_CONFIG.restaurantGuid,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const orders = await response.json();

        // Filter for catering orders only
        if (Array.isArray(orders)) {
          const cateringOrders = orders.filter(order => {
            // Check if order is a catering order by source
            const isCatering =
              order.source === 'Invoice' ||
              order.source === 'Catering' ||
              order.source === 'Catering Online Ordering';

            // Exclude voided/deleted orders
            const isValid = !order.voided && !order.deleted;

            return isCatering && isValid;
          });

          console.log(`✅ Found ${cateringOrders.length} catering orders on ${businessDate}`);
          allCateringOrders.push(...cateringOrders);
        }
      } else {
        console.error(`❌ Failed to fetch orders for ${businessDate}: ${response.status}`);
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);

      // Add small delay to avoid rate limiting (100ms between requests)
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`📦 Total catering orders found: ${allCateringOrders.length}`);

    // Transform orders to catering format
    const cateringData = allCateringOrders.map(order => {
      // Extract delivery info
      const deliveryInfo = order.deliveryInfo || {};

      // Extract customer info
      const customer = order.customer || {};

      // Parse business date to readable format
      const dateStr = order.businessDate?.toString() || '';
      const deliveryDate = dateStr.length === 8
        ? `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`
        : null;

      // Calculate total from checks
      let total = 0;
      if (order.checks && Array.isArray(order.checks)) {
        total = order.checks.reduce((sum, check) => sum + (check.amount || 0), 0);
      }

      return {
        // Order IDs
        toast_order_id: order.guid,
        order_number: order.orderNumber || order.guid?.substring(0, 8),

        // Customer info
        customer_name: customer.firstName && customer.lastName
          ? `${customer.firstName} ${customer.lastName}`
          : customer.firstName || customer.lastName || 'Unknown',
        customer_email: customer.email || null,
        customer_phone: customer.phone || null,

        // Delivery info
        delivery_date: deliveryDate,
        delivery_time: order.promisedDate || order.openedDate || null,
        delivery_address: deliveryInfo.address || null,
        delivery_notes: deliveryInfo.notes || null,

        // Order details
        source: order.source,
        business_date: order.businessDate,
        headcount: order.numberOfGuests || null,
        total: total / 100, // Convert cents to dollars

        // Status
        status: parseOrderStatus(order),

        // Full order data for details view
        order_data: order
      };
    });

    // Sort by delivery date
    cateringData.sort((a, b) => {
      if (!a.delivery_date) return 1;
      if (!b.delivery_date) return -1;
      return a.delivery_date.localeCompare(b.delivery_date);
    });

    return res.status(200).json({
      success: true,
      message: `Found ${cateringData.length} catering orders`,
      data: {
        startDate,
        endDate,
        totalOrders: cateringData.length,
        orders: cateringData
      }
    });

  } catch (error) {
    console.error('❌ Catering orders fetch error:', error);

    return res.status(500).json({
      success: false,
      error: 'Failed to fetch catering orders',
      details: error.message
    });
  }
}

/**
 * Parse Toast order status to standard format
 */
function parseOrderStatus(order) {
  if (order.voided || order.deleted) return 'cancelled';
  if (order.closed) return 'completed';

  // Check fulfillment status
  const fulfillment = order.fulfillmentStatus;
  if (fulfillment === 'FULFILLED') return 'delivered';
  if (fulfillment === 'IN_PROGRESS') return 'in_progress';
  if (fulfillment === 'PENDING') return 'pending';

  return 'confirmed';
}
