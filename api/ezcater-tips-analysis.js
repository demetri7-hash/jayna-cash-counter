// ============================================
// EZCATER TIPS ANALYSIS API
// ============================================
// Purpose: Fetch ezCater orders in a date range and calculate total tips
// Goal: Auto-populate ezCater tips in weekly tip pool calculator
// ============================================

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { startDate, endDate } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }

    console.log(`📊 Fetching ezCater tips from ${startDate} to ${endDate}`);

    // ezCater API configuration
    const EZCATER_API_URL = 'https://orders-api.ezcater.com/api/v3/graphql';
    const EZCATER_API_KEY = process.env.EZCATER_API_KEY;
    const CATERER_UUID = 'c78c7e31-fe7c-40eb-8490-3468c99b1b68'; // Jayna Gyro Sacramento

    if (!EZCATER_API_KEY) {
      throw new Error('EZCATER_API_KEY not configured in environment variables');
    }

    // GraphQL query to fetch orders with tip information
    const query = `
      query GetOrdersWithTips($catererId: ID!, $startDate: ISO8601Date!, $endDate: ISO8601Date!) {
        orders(
          catererIds: [$catererId]
          deliveryStartDate: $startDate
          deliveryEndDate: $endDate
        ) {
          id
          number
          deliveryDate
          deliveryTime
          status

          # Customer info
          customer {
            name
          }

          # Pricing fields - exploring all available tip-related fields
          subtotal
          tip
          gratuity
          deliveryFee
          serviceFee
          tax
          total

          # Try these tip-related fields (may or may not exist)
          catererTip
          driverTip
          tipAmount
          gratuityAmount

          # Total fields
          totalInSubunits {
            subunits
            currency
          }
          catererTotalDue
        }
      }
    `;

    const variables = {
      catererId: CATERER_UUID,
      startDate: startDate,
      endDate: endDate
    };

    console.log('🔍 Querying ezCater GraphQL API...');
    console.log('Variables:', variables);

    const response = await fetch(EZCATER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${EZCATER_API_KEY}`,
        'ezToken': EZCATER_API_KEY
      },
      body: JSON.stringify({ query, variables })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ ezCater API Error:', response.status, errorText);
      throw new Error(`ezCater API returned ${response.status}: ${errorText}`);
    }

    const result = await response.json();

    if (result.errors) {
      console.error('❌ GraphQL Errors:', JSON.stringify(result.errors, null, 2));

      // Return partial data if available, with error info
      return res.status(200).json({
        error: 'GraphQL query had errors',
        errors: result.errors,
        partialData: result.data,
        message: 'Some fields may not be available. Check errors array for details.'
      });
    }

    const orders = result.data?.orders || [];
    console.log(`✅ Found ${orders.length} orders`);

    // Process each order to extract tip data
    const processedOrders = orders.map(order => {
      // Try to find tip in multiple possible fields
      let tipAmount = 0;
      let tipSource = 'unknown';

      if (order.tip !== null && order.tip !== undefined) {
        tipAmount = parseFloat(order.tip) || 0;
        tipSource = 'tip';
      } else if (order.gratuity !== null && order.gratuity !== undefined) {
        tipAmount = parseFloat(order.gratuity) || 0;
        tipSource = 'gratuity';
      } else if (order.tipAmount !== null && order.tipAmount !== undefined) {
        tipAmount = parseFloat(order.tipAmount) || 0;
        tipSource = 'tipAmount';
      } else if (order.gratuityAmount !== null && order.gratuityAmount !== undefined) {
        tipAmount = parseFloat(order.gratuityAmount) || 0;
        tipSource = 'gratuityAmount';
      } else if (order.catererTip !== null && order.catererTip !== undefined) {
        tipAmount = parseFloat(order.catererTip) || 0;
        tipSource = 'catererTip';
      }

      return {
        orderNumber: order.number,
        orderId: order.id,
        deliveryDate: order.deliveryDate,
        deliveryTime: order.deliveryTime,
        status: order.status,
        customerName: order.customer?.name || 'Unknown',
        subtotal: parseFloat(order.subtotal) || 0,
        tip: tipAmount,
        tipSource: tipSource, // Which field contained the tip
        deliveryFee: parseFloat(order.deliveryFee) || 0,
        serviceFee: parseFloat(order.serviceFee) || 0,
        tax: parseFloat(order.tax) || 0,
        total: parseFloat(order.total) || 0,
        // Include raw tip data for debugging
        rawTipData: {
          tip: order.tip,
          gratuity: order.gratuity,
          tipAmount: order.tipAmount,
          gratuityAmount: order.gratuityAmount,
          catererTip: order.catererTip,
          driverTip: order.driverTip
        }
      };
    });

    // Calculate totals
    const totalTips = processedOrders.reduce((sum, order) => sum + order.tip, 0);
    const orderCount = processedOrders.length;

    console.log(`💰 Total Tips: $${totalTips.toFixed(2)} from ${orderCount} orders`);

    // Log tip field usage for debugging
    const tipSources = processedOrders.reduce((acc, order) => {
      acc[order.tipSource] = (acc[order.tipSource] || 0) + 1;
      return acc;
    }, {});
    console.log('📊 Tip field usage:', tipSources);

    return res.status(200).json({
      success: true,
      startDate,
      endDate,
      orderCount,
      totalTips: parseFloat(totalTips.toFixed(2)),
      orders: processedOrders,
      tipFieldUsage: tipSources, // Show which fields were used
      message: `Found ${orderCount} orders with $${totalTips.toFixed(2)} in tips`
    });

  } catch (error) {
    console.error('❌ Error in ezcater-tips-analysis:', error);
    return res.status(500).json({
      error: error.message,
      details: error.stack,
      message: 'Failed to fetch ezCater tips. Check server logs for details.'
    });
  }
}
