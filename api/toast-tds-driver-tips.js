// TDS Driver Tips API - Uses EXACT comprehensive analysis method
// Filters for specific server GUID: 5ffaae6f-4238-477d-979b-3da88d45b8e2

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', 'https://jayna-cash-counter.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { accessToken, startDate, endDate } = req.body;

    if (!accessToken || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Access token, start date, and end date are required'
      });
    }

    console.log(`TDS DRIVER ANALYSIS: ${startDate} to ${endDate}`);

    // TDS Driver server GUID from comprehensive analysis
    const TDS_DRIVER_GUID = '5ffaae6f-4238-477d-979b-3da88d45b8e2';

    const TOAST_CONFIG = {
      baseUrl: process.env.TOAST_BASE_URL || 'https://ws-api.toasttab.com',
      restaurantGuid: process.env.TOAST_RESTAURANT_GUID || 'd3efae34-7c2e-4107-a442-49081e624706'
    };

    // Get ALL orders for the date range (EXACT same method as comprehensive analysis)
    let allOrders = [];
    
    // Generate date range
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dateRange = [];
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dateRange.push(d.toISOString().split('T')[0]);
    }

    // Fetch orders for each date (EXACT same pagination logic as comprehensive analysis)
    for (const date of dateRange) {
      const businessDate = date.replace(/-/g, '');
      console.log(`Fetching TDS orders for ${businessDate}...`);
      
      let page = 1;
      let hasMorePages = true;
      const pageSize = 100;
      
      while (hasMorePages) {
        const ordersUrl = `${TOAST_CONFIG.baseUrl}/orders/v2/ordersBulk?businessDate=${businessDate}&page=${page}&pageSize=${pageSize}`;
        
        const ordersResponse = await fetch(ordersUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Toast-Restaurant-External-ID': TOAST_CONFIG.restaurantGuid,
            'Content-Type': 'application/json'
          }
        });

        if (!ordersResponse.ok) {
          console.error(`Failed to fetch orders for ${businessDate}, page ${page}: ${ordersResponse.status}`);
          break;
        }

        const pageOrders = await ordersResponse.json();
        
        if (Array.isArray(pageOrders) && pageOrders.length > 0) {
          allOrders = allOrders.concat(pageOrders);
          console.log(`${businessDate} Page ${page}: ${pageOrders.length} orders (Total: ${allOrders.length})`);
          
          if (pageOrders.length === pageSize) {
            page++;
          } else {
            hasMorePages = false;
          }
        } else {
          hasMorePages = false;
        }
        
        if (page > 50) {
          console.warn(`Max pages reached for ${businessDate}`);
          hasMorePages = false;
        }
      }
    }

    console.log(`TOTAL ORDERS RETRIEVED: ${allOrders.length}`);

    // TDS Driver analysis (EXACT same logic as comprehensive analysis)
    const tdsAnalysis = {
      totalOrders: allOrders.length,
      tdsDriverOrders: 0,
      tdsDriverTips: {
        gross: 0,
        voided: 0,
        refunded: 0,
        net: 0
      },
      orderDetails: []
    };

    // Process each order (EXACT same method as comprehensive analysis)
    allOrders.forEach((order, index) => {
      // Only process orders from TDS Driver server GUID
      if (order.server?.guid !== TDS_DRIVER_GUID) {
        return;
      }

      tdsAnalysis.tdsDriverOrders++;

      // Extract order data (EXACT same structure as comprehensive analysis)
      const orderData = {
        index,
        guid: order.guid,
        orderNumber: order.orderNumber,
        businessDate: order.businessDate,
        source: order.source,
        voided: order.voided,
        deleted: order.deleted,
        server: {
          guid: order.server?.guid || null
        },
        tips: {
          paymentTips: 0,
          serviceChargeTips: 0,
          total: 0,
          refundedTips: 0,
          voidedTips: 0,
          paymentDetails: []
        }
      };

      // Calculate tips (EXACT same logic as comprehensive analysis)
      if (order.checks && Array.isArray(order.checks)) {
        order.checks.forEach(check => {
          if (check.payments && Array.isArray(check.payments)) {
            check.payments.forEach(payment => {
              const tipAmount = payment.tipAmount || 0;
              
              // Track payment details regardless of void status
              orderData.tips.paymentDetails.push({
                type: payment.type,
                amount: payment.amount,
                tipAmount: tipAmount,
                refundStatus: payment.refundStatus || 'NONE',
                paymentStatus: payment.paymentStatus || null,
                voided: payment.voided || false
              });
              
              if (tipAmount > 0) {
                // Check if this payment was refunded or voided (EXACT same logic)
                if (payment.refundStatus === 'FULL' || payment.refundStatus === 'PARTIAL') {
                  orderData.tips.refundedTips += tipAmount;
                } else if (payment.voided || payment.paymentStatus === 'VOIDED') {
                  orderData.tips.voidedTips += tipAmount;
                } else {
                  orderData.tips.paymentTips += tipAmount;
                }
              }
            });
          }
          
          if (check.appliedServiceCharges && Array.isArray(check.appliedServiceCharges)) {
            check.appliedServiceCharges.forEach(charge => {
              if (charge.gratuity && charge.gratuity > 0) {
                orderData.tips.serviceChargeTips += charge.gratuity;
              }
            });
          }
        });
      }
      
      orderData.tips.total = orderData.tips.paymentTips + orderData.tips.serviceChargeTips;
      
      // Add to TDS analysis totals
      tdsAnalysis.tdsDriverTips.gross += orderData.tips.total;
      tdsAnalysis.tdsDriverTips.voided += orderData.tips.voidedTips;
      tdsAnalysis.tdsDriverTips.refunded += orderData.tips.refundedTips;
      
      tdsAnalysis.orderDetails.push(orderData);
    });

    // Calculate net tips (gross - voided - refunded)
    tdsAnalysis.tdsDriverTips.net = tdsAnalysis.tdsDriverTips.gross - tdsAnalysis.tdsDriverTips.voided - tdsAnalysis.tdsDriverTips.refunded;

    console.log(`TDS DRIVER ANALYSIS COMPLETE:`);
    console.log(`- Server GUID: ${TDS_DRIVER_GUID}`);
    console.log(`- Orders: ${tdsAnalysis.tdsDriverOrders}`);
    console.log(`- Gross Tips: $${tdsAnalysis.tdsDriverTips.gross.toFixed(2)}`);
    console.log(`- Voided Tips: $${tdsAnalysis.tdsDriverTips.voided.toFixed(2)}`);
    console.log(`- Refunded Tips: $${tdsAnalysis.tdsDriverTips.refunded.toFixed(2)}`);
    console.log(`- Net Tips: $${tdsAnalysis.tdsDriverTips.net.toFixed(2)}`);

    return res.json({
      success: true,
      message: `TDS Driver analysis complete: ${tdsAnalysis.tdsDriverOrders} orders from server ${TDS_DRIVER_GUID}`,
      data: {
        serverGuid: TDS_DRIVER_GUID,
        dateRange: { startDate, endDate },
        totalOrdersAnalyzed: tdsAnalysis.totalOrders,
        tdsDriverOrders: tdsAnalysis.tdsDriverOrders,
        grossTips: tdsAnalysis.tdsDriverTips.gross,
        voidedTips: tdsAnalysis.tdsDriverTips.voided,
        refundedTips: tdsAnalysis.tdsDriverTips.refunded,
        netTips: tdsAnalysis.tdsDriverTips.net,
        // Return net tips as the main value for tip pool calculation
        totalDeliveryTips: tdsAnalysis.tdsDriverTips.net,
        orderDetails: tdsAnalysis.orderDetails.slice(0, 5) // Sample for debugging
      }
    });

  } catch (error) {
    console.error('TDS Driver analysis error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}