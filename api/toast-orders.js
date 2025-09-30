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

    // Use businessDate format (yyyymmdd) - much simpler and more reliable
    const businessDate = date.replace(/-/g, ''); // Convert 2025-09-28 to 20250928
    console.log(`Business date format: ${businessDate}`);

    // Use the correct ordersBulk endpoint with businessDate parameter
    const ordersUrl = `${TOAST_CONFIG.baseUrl}/orders/v2/ordersBulk?businessDate=${businessDate}&pageSize=100`;
    console.log(`Orders URL: ${ordersUrl}`);

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
      let errorText;
      try {
        errorText = await ordersResponse.text();
        console.error('Toast orders API failed:', ordersResponse.status, errorText);
      } catch (e) {
        errorText = 'Could not read error response';
        console.error('Toast orders API failed:', ordersResponse.status, 'Error reading response:', e);
      }
      
      return res.status(ordersResponse.status).json({
        success: false,
        error: `Toast orders API failed: ${ordersResponse.status} ${ordersResponse.statusText}`,
        details: errorText,
        requestUrl: ordersUrl,
        requestHeaders: {
          'Authorization': `Bearer ${accessToken.substring(0, 20)}...`,
          'Toast-Restaurant-External-ID': TOAST_CONFIG.restaurantGuid
        }
      });
    }

    const ordersData = await ordersResponse.json();
    console.log(`Retrieved ${ordersData.length || 0} orders for ${date}`);

    // Calculate cash sales from the orders data
    let totalCashSales = 0;
    let cashOrderCount = 0;
    const cashDetails = [];
    const rejectedOrders = [];
    const paymentAnalysis = [];

    if (Array.isArray(ordersData)) {
      ordersData.forEach((order, index) => {
        // Check if order is valid (not voided, refunded, etc.)
        const isValidOrder = !order.voided && !order.deleted;
        
        if (!isValidOrder) {
          rejectedOrders.push({
            index,
            reason: `Order voided: ${order.voided}, deleted: ${order.deleted}`,
            orderGuid: order.guid
          });
          return;
        }

        // Look for payments in checks (Toast structure: order.checks[].payments[])
        let orderHasCash = false;
        let orderCashAmount = 0;

        if (order.checks && Array.isArray(order.checks)) {
          order.checks.forEach((check, checkIndex) => {
            if (check.payments && Array.isArray(check.payments)) {
              check.payments.forEach((payment, paymentIndex) => {
                // Collect payment info for analysis
                paymentAnalysis.push({
                  orderIndex: index,
                  checkIndex: checkIndex,
                  paymentIndex: paymentIndex,
                  paymentStructure: Object.keys(payment),
                  payment: payment
                });

                // Look for cash payments - might be type 'CASH' or different field
                if (payment.type === 'CASH' && payment.amount) {
                  orderHasCash = true;
                  orderCashAmount += payment.amount;
                } else if (payment.paidAmount && payment.type === 'CASH') {
                  orderHasCash = true;
                  orderCashAmount += payment.paidAmount;
                }
              });
            }
          });
        }

        if (orderHasCash) {
          cashOrderCount++;
          totalCashSales += orderCashAmount;
          cashDetails.push({
            orderIndex: index,
            orderId: order.guid,
            amount: orderCashAmount,
            openedDate: order.openedDate,
            businessDate: order.businessDate
          });
        }
      });
    }

    return res.status(200).json({
      success: true,
      message: `Retrieved ${ordersData.length || 0} orders for business date ${businessDate}`,
      data: {
        date: date,
        businessDate: businessDate,
        totalOrders: ordersData.length || 0,
        rawOrders: ordersData, // Full order data for analysis
        cashAnalysis: {
          totalCashSales: totalCashSales, // In cents
          totalCashSalesDollars: (totalCashSales / 100).toFixed(2),
          cashOrderCount: cashOrderCount,
          rejectedOrdersCount: rejectedOrders.length,
          cashOrderDetails: cashDetails,
          rejectedOrders: rejectedOrders,
          paymentAnalysis: paymentAnalysis.slice(0, 10) // First 10 payments for debugging
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