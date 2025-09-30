// Vercel API function to fetch orders from Toast API
// This avoids CORS issues by making the request server-side

export default async function handler(req, res) {
  // Enable CORS for your domain
  res.setHeader('Access-Control-Allow-Origin', 'https://jayna-cash-counter.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { accessToken, date } = req.body;

    if (!accessToken || !date) {
      return res.status(400).json({
        success: false,
        error: 'Access token and date are required'
      });
    }

    console.log(`Fetching Toast orders for date: ${date}`);

    // Toast API configuration
    const TOAST_CONFIG = {
      baseUrl: process.env.TOAST_BASE_URL || 'https://ws-api.toasttab.com',
      restaurantGuid: process.env.TOAST_RESTAURANT_GUID || 'd3efae34-7c2e-4107-a442-49081e624706'
    };

    // Format dates for Toast API (they expect specific timezone format)
    const startDate = `${date}T00:00:00.000`;
    const endDate = `${date}T23:59:59.999`;

    const ordersUrl = `${TOAST_CONFIG.baseUrl}/orders/v2/orders?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;

    // Make the orders request to Toast API
    const ordersResponse = await fetch(ordersUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Toast-Restaurant-External-ID': TOAST_CONFIG.restaurantGuid,
        'Content-Type': 'application/json'
      }
    });

    if (!ordersResponse.ok) {
      const errorText = await ordersResponse.text();
      console.error('Toast orders API failed:', ordersResponse.status, errorText);
      
      return res.status(ordersResponse.status).json({
        success: false,
        error: `Toast orders API failed: ${ordersResponse.status} ${ordersResponse.statusText}`,
        details: errorText
      });
    }

    const ordersData = await ordersResponse.json();
    console.log(`Retrieved ${ordersData.length || 0} orders for ${date}`);

    // Calculate cash sales from the orders data
    let totalCashSales = 0;
    let cashOrderCount = 0;
    const cashDetails = [];
    const rejectedOrders = [];

    if (Array.isArray(ordersData)) {
      ordersData.forEach((order, index) => {
        // Check if order is valid (not voided, refunded, etc.)
        const isValidOrder = order.state !== 'VOIDED' && order.state !== 'CANCELED';
        
        if (!isValidOrder) {
          rejectedOrders.push({
            index,
            reason: `Order state: ${order.state}`,
            amount: order.amount || 0
          });
          return;
        }

        // Check if order has cash payments
        let orderHasCash = false;
        let orderCashAmount = 0;

        if (order.payments && Array.isArray(order.payments)) {
          order.payments.forEach(payment => {
            if (payment.type === 'CASH' && payment.amount) {
              orderHasCash = true;
              orderCashAmount += payment.amount;
            }
          });
        }

        if (orderHasCash) {
          cashOrderCount++;
          totalCashSales += orderCashAmount;
          cashDetails.push({
            orderIndex: index,
            orderId: order.guid || order.id,
            amount: orderCashAmount,
            totalOrderAmount: order.amount,
            time: order.openedDate || order.createdDate
          });
        }
      });
    }

    return res.status(200).json({
      success: true,
      message: `Retrieved ${ordersData.length || 0} orders for ${date}`,
      data: {
        date: date,
        totalOrders: ordersData.length || 0,
        rawOrders: ordersData, // Full order data for analysis
        cashAnalysis: {
          totalCashSales: totalCashSales, // In cents
          totalCashSalesDollars: (totalCashSales / 100).toFixed(2),
          cashOrderCount: cashOrderCount,
          rejectedOrdersCount: rejectedOrders.length,
          cashOrderDetails: cashDetails,
          rejectedOrders: rejectedOrders
        }
      }
    });

  } catch (error) {
    console.error('Orders fetch error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error during orders fetch',
      details: error.message
    });
  }
}