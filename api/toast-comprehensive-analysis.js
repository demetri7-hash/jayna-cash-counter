// Comprehensive Toast Orders Analysis - COMPLETE FIELD DUMP
// This endpoint analyzes ALL fields from every order to identify TDS Driver filtering patterns

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

    console.log(`COMPREHENSIVE ANALYSIS: ${startDate} to ${endDate}`);

    const TOAST_CONFIG = {
      baseUrl: process.env.TOAST_BASE_URL || 'https://ws-api.toasttab.com',
      restaurantGuid: process.env.TOAST_RESTAURANT_GUID || 'd3efae34-7c2e-4107-a442-49081e624706'
    };

    // Get all orders for the date range
    let allOrders = [];
    const startBusinessDate = startDate.replace(/-/g, '');
    const endBusinessDate = endDate.replace(/-/g, '');
    
    // For each day in range
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dateRange = [];
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dateRange.push(d.toISOString().split('T')[0]);
    }

    for (const date of dateRange) {
      const businessDate = date.replace(/-/g, '');
      console.log(`Fetching orders for ${businessDate}...`);
      
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

    // COMPREHENSIVE ANALYSIS OF ALL ORDERS
    const analysis = {
      totalOrders: allOrders.length,
      dateRange: { startDate, endDate },
      
      // Complete field analysis (will be populated dynamically)
      fieldAnalysis: {},
      
      // Tip analysis by various criteria
      tipAnalysisByField: {
        byServerGuid: {},
        byDiningOption: {},
        bySource: {},
        byRevenueCenter: {},
        byServiceArea: {},
        byChannel: {},
        byHour: {},
        byPaymentType: {}
      },
      
      // Individual order details (for pattern matching)
      ordersWithTips: [],
      ordersWithoutTips: [],
      
      // Summary stats
      totalTips: 0,
      ordersWithTipsCount: 0,
      ordersWithoutTipsCount: 0,
      
      // Target matching
      targetTips: 481.83,
      potentialMatches: []
    };

    // Process each order
    allOrders.forEach((order, index) => {
      if (order.voided || order.deleted) return;

      // Extract ALL possible fields
      const orderData = {
        index,
        guid: order.guid,
        orderNumber: order.orderNumber,
        openedDate: order.openedDate,
        closedDate: order.closedDate,
        businessDate: order.businessDate,
        promisedDate: order.promisedDate,
        estimatedFulfillmentDate: order.estimatedFulfillmentDate,
        source: order.source,
        duration: order.duration,
        numberOfGuests: order.numberOfGuests,
        voided: order.voided,
        deleted: order.deleted,
        approvalStatus: order.approvalStatus,
        excessFood: order.excessFood,
        createdInTestMode: order.createdInTestMode,
        
        // Server info
        server: {
          guid: order.server?.guid || null,
          externalId: order.server?.externalId || null,
          entityType: order.server?.entityType || null
        },
        
        // Dining option
        diningOption: {
          guid: order.diningOption?.guid || null,
          externalId: order.diningOption?.externalId || null,
          entityType: order.diningOption?.entityType || null
        },
        
        // Location info (these are objects with guid property according to API docs)
        revenueCenter: order.revenueCenter?.guid || null,
        serviceArea: order.serviceArea?.guid || null,
        table: order.table?.guid || null,
        channelGuid: order.channelGuid || null,
        
        // Delivery info
        deliveryInfo: order.deliveryInfo || null,
        curbsidePickupInfo: order.curbsidePickupInfo || null,
        
        // Device info
        createdDevice: order.createdDevice?.id || null,
        lastModifiedDevice: order.lastModifiedDevice?.id || null,
        
        // Dates
        createdDate: order.createdDate,
        modifiedDate: order.modifiedDate,
        deletedDate: order.deletedDate,
        voidBusinessDate: order.voidBusinessDate,
        
        // Features
        pricingFeatures: order.pricingFeatures || [],
        appliedPackagingInfo: order.appliedPackagingInfo || null,
        
        // Time analysis
        hour: order.openedDate ? new Date(order.openedDate).getUTCHours() : null,
        dayOfWeek: order.openedDate ? new Date(order.openedDate).getUTCDay() : null,
        
        // Tip calculation
        tips: {
          paymentTips: 0,
          serviceChargeTips: 0,
          total: 0,
          paymentDetails: []
        }
      };

      // Calculate tips
      if (order.checks && Array.isArray(order.checks)) {
        order.checks.forEach(check => {
          if (check.payments && Array.isArray(check.payments)) {
            check.payments.forEach(payment => {
              const tipAmount = payment.tipAmount || 0;
              if (tipAmount > 0) {
                orderData.tips.paymentTips += tipAmount;
                orderData.tips.paymentDetails.push({
                  type: payment.type,
                  amount: payment.amount,
                  tipAmount: tipAmount,
                  cardType: payment.cardType
                });
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
      analysis.totalTips += orderData.tips.total;

      // Track field occurrences with safe field analysis
      const trackField = (fieldType, fieldValue, tipAmount) => {
        if (fieldValue !== null && fieldValue !== undefined) {
          // Initialize field analysis if needed
          if (!analysis.fieldAnalysis[fieldType]) {
            analysis.fieldAnalysis[fieldType] = {};
          }
          if (!analysis.fieldAnalysis[fieldType][fieldValue]) {
            analysis.fieldAnalysis[fieldType][fieldValue] = 0;
          }
          analysis.fieldAnalysis[fieldType][fieldValue]++;
          
          // Initialize tip analysis if needed
          if (!analysis.tipAnalysisByField[fieldType]) {
            analysis.tipAnalysisByField[fieldType] = {};
          }
          if (!analysis.tipAnalysisByField[fieldType][fieldValue]) {
            analysis.tipAnalysisByField[fieldType][fieldValue] = { orders: 0, tips: 0 };
          }
          analysis.tipAnalysisByField[fieldType][fieldValue].orders++;
          analysis.tipAnalysisByField[fieldType][fieldValue].tips += tipAmount;
        }
      };
      
      // Track all relevant fields
      trackField('byServerGuid', orderData.server.guid, orderData.tips.total);
      trackField('byDiningOption', orderData.diningOption.guid, orderData.tips.total);
      trackField('bySource', orderData.source, orderData.tips.total);
      trackField('byRevenueCenter', orderData.revenueCenter?.guid, orderData.tips.total);
      trackField('byServiceArea', orderData.serviceArea?.guid, orderData.tips.total);
      trackField('byChannel', orderData.channelGuid, orderData.tips.total);
      trackField('byHour', orderData.hour, orderData.tips.total);
      
      // Track payment types (array handling)
      orderData.tips.paymentDetails.forEach(payment => {
        trackField('byPaymentType', payment.type, orderData.tips.total);
      });

      // Categorize orders
      if (orderData.tips.total > 0) {
        analysis.ordersWithTips.push(orderData);
        analysis.ordersWithTipsCount++;
      } else {
        analysis.ordersWithoutTips.push(orderData);
        analysis.ordersWithoutTipsCount++;
      }
    });

    // Find potential matches for TDS Driver (close to $481.83)
    const tolerance = 50; // $50 tolerance
    Object.entries(analysis.tipAnalysisByField).forEach(([fieldType, fieldData]) => {
      Object.entries(fieldData).forEach(([fieldValue, data]) => {
        if (Math.abs(data.tips - 481.83) <= tolerance) {
          analysis.potentialMatches.push({
            fieldType,
            fieldValue,
            tips: data.tips,
            orders: data.orders,
            difference: Math.abs(data.tips - 481.83),
            accuracy: ((481.83 - Math.abs(data.tips - 481.83)) / 481.83) * 100
          });
        }
      });
    });

    // Sort potential matches by accuracy
    analysis.potentialMatches.sort((a, b) => b.accuracy - a.accuracy);

    return res.json({
      success: true,
      message: `Comprehensive analysis complete: ${analysis.totalOrders} orders, $${analysis.totalTips.toFixed(2)} total tips`,
      target: 481.83,
      actualTotal: analysis.totalTips,
      difference: Math.abs(481.83 - analysis.totalTips),
      analysis
    });

  } catch (error) {
    console.error('Comprehensive analysis error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}