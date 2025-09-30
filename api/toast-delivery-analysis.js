// Vercel API function specifically for delivery order analysis and tip extraction
// Separate from toast-orders.js to avoid affecting existing functionality

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

    console.log(`Fetching Toast delivery orders for date: ${date}`);

    // Toast API configuration
    const TOAST_CONFIG = {
      baseUrl: process.env.TOAST_BASE_URL || 'https://ws-api.toasttab.com',
      restaurantGuid: process.env.TOAST_RESTAURANT_GUID || 'd3efae34-7c2e-4107-a442-49081e624706'
    };

    // Use businessDate format (yyyymmdd)
    const businessDate = date.replace(/-/g, '');
    console.log(`Business date format: ${businessDate}`);

    // Use the ordersBulk endpoint with pagination to get ALL orders
    let allOrders = [];
    let page = 1;
    let hasMorePages = true;
    const pageSize = 100; // Maximum allowed by Toast API
    
    console.log(`Starting pagination to fetch all orders for ${businessDate}`);
    
    while (hasMorePages) {
      const ordersUrl = `${TOAST_CONFIG.baseUrl}/orders/v2/ordersBulk?businessDate=${businessDate}&pageSize=${pageSize}&page=${page}`;
      console.log(`Fetching page ${page}: ${ordersUrl}`);

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
          page: page
        });
      }

      const pageOrders = await ordersResponse.json();
      
      if (Array.isArray(pageOrders) && pageOrders.length > 0) {
        allOrders = allOrders.concat(pageOrders);
        console.log(`Page ${page}: Retrieved ${pageOrders.length} orders (Total: ${allOrders.length})`);
        
        // Check if we got a full page (indicating there might be more)
        if (pageOrders.length === pageSize) {
          page++;
        } else {
          hasMorePages = false;
        }
      } else {
        hasMorePages = false;
      }
      
      // Safety check to prevent infinite loops
      if (page > 50) {
        console.warn('Reached maximum page limit (50), stopping pagination');
        hasMorePages = false;
      }
    }

    console.log(`Pagination complete: Retrieved ${allOrders.length} total orders across ${page} pages for ${date}`);

    // COMPREHENSIVE DELIVERY ORDER ANALYSIS
    let deliveryAnalysis = {
      totalOrders: allOrders.length,
      totalPages: page,
      deliveryOrders: [],
      totalDeliveryTips: 0,
      deliveryDetectionMethods: {
        deliveryInfo: 0,
        diningOption: 0, 
        source: 0,
        estimatedFulfillment: 0,
        serviceCharges: 0
      },
      tipExtractionMethods: {
        paymentTipAmount: 0,
        serviceChargeGratuity: 0,
        deliveryCharges: 0
      },
      rejectedOrders: []
    };

    if (Array.isArray(allOrders)) {
      // TDS Driver server GUID for filtering specific employee orders
      const TDS_DRIVER_GUID = '7863337c-16f2-4d9e-a855-e83953bbb016';
      
      allOrders.forEach((order, index) => {
        // CRITICAL FILTER: Only process orders from TDS Driver
        if (order.server?.guid !== TDS_DRIVER_GUID) {
          deliveryAnalysis.rejectedOrders.push({
            index,
            reason: `Not TDS Driver order - server GUID: ${order.server?.guid || 'null'}`,
            orderGuid: order.guid
          });
          return;
        }
        
        // Skip voided/deleted orders
        if (order.voided || order.deleted) {
          deliveryAnalysis.rejectedOrders.push({
            index,
            reason: `Order voided: ${order.voided}, deleted: ${order.deleted}`,
            orderGuid: order.guid
          });
          return;
        }

        // COMPREHENSIVE DELIVERY DETECTION - MUCH BROADER APPROACH
        let isDelivery = false;
        let deliveryIndicators = [];
        
        // Method 1: deliveryInfo object (strongest indicator)
        if (order.deliveryInfo && Object.keys(order.deliveryInfo).length > 0) {
          isDelivery = true;
          deliveryIndicators.push('deliveryInfo');
          deliveryAnalysis.deliveryDetectionMethods.deliveryInfo++;
        }

        // Method 2: estimatedFulfillmentDate (delivery/takeout orders have this)
        if (order.estimatedFulfillmentDate) {
          isDelivery = true;
          deliveryIndicators.push('estimatedFulfillmentDate');
          deliveryAnalysis.deliveryDetectionMethods.estimatedFulfillment++;
        }

        // Method 3: source analysis (delivery platforms)
        if (order.source) {
          const deliverySources = ['delivery', 'doordash', 'ubereats', 'grubhub', 'postmates', 'seamless', 'online'];
          if (deliverySources.some(source => order.source.toLowerCase().includes(source))) {
            isDelivery = true;
            deliveryIndicators.push('source');
            deliveryAnalysis.deliveryDetectionMethods.source++;
          }
        }

        // Method 4: diningOption analysis - ASSUME ALL NON-DINE-IN ARE POTENTIAL DELIVERY
        if (order.diningOption && order.diningOption.guid) {
          // Cast wider net - if it has a diningOption, it might be delivery/takeout
          isDelivery = true;
          deliveryIndicators.push('diningOption');
          deliveryAnalysis.deliveryDetectionMethods.diningOption++;
        }

        // Method 5: service charges analysis (delivery fees often indicate delivery)
        let hasDeliveryCharges = false;
        if (order.checks && Array.isArray(order.checks)) {
          order.checks.forEach(check => {
            if (check.appliedServiceCharges && Array.isArray(check.appliedServiceCharges)) {
              check.appliedServiceCharges.forEach(charge => {
                if (charge.delivery || (charge.name && charge.name.toLowerCase().includes('delivery'))) {
                  hasDeliveryCharges = true;
                  isDelivery = true;
                  deliveryIndicators.push('serviceCharges');
                  deliveryAnalysis.deliveryDetectionMethods.serviceCharges++;
                }
              });
            }
          });
        }

        // Method 6: BROAD TIP DETECTION - If order has ANY tips, consider it delivery
        let hasAnyTips = false;
        if (order.checks && Array.isArray(order.checks)) {
          order.checks.forEach(check => {
            if (check.payments && Array.isArray(check.payments)) {
              check.payments.forEach(payment => {
                if (payment.tipAmount && payment.tipAmount > 0) {
                  hasAnyTips = true;
                }
              });
            }
          });
        }
        
        // If order has tips but no other delivery indicators, still consider it potential delivery
        if (hasAnyTips && !isDelivery) {
          isDelivery = true;
          deliveryIndicators.push('hasTips');
        }

        // If any delivery indicators found, analyze tips
        if (isDelivery) {
          let orderTips = {
            paymentTips: 0,
            serviceChargeTips: 0,
            deliveryCharges: 0,
            total: 0
          };

          // TIP EXTRACTION from payments - ENHANCED LOGIC
          if (order.checks && Array.isArray(order.checks)) {
            order.checks.forEach(check => {
              // Method 1: Payment tipAmount (primary) - INCLUDE ALL PAYMENT TYPES
              if (check.payments && Array.isArray(check.payments)) {
                check.payments.forEach(payment => {
                  // Extract tips from ALL payment types - amounts likely already in dollars
                  if (payment.tipAmount && payment.tipAmount > 0) {
                    orderTips.paymentTips += payment.tipAmount; // Keep as-is, likely already dollars
                    deliveryAnalysis.tipExtractionMethods.paymentTipAmount++;
                  }
                  
                  // Also check for tips in different payment structures
                  if (payment.tip && payment.tip > 0) {
                    orderTips.paymentTips += payment.tip; // Keep as-is, likely already dollars
                    deliveryAnalysis.tipExtractionMethods.paymentTipAmount++;
                  }
                });
              }

              // Method 2: Service charge gratuity - ENHANCED DETECTION
              if (check.appliedServiceCharges && Array.isArray(check.appliedServiceCharges)) {
                check.appliedServiceCharges.forEach(charge => {
                  // Any service charge marked as gratuity
                  if (charge.gratuity && charge.chargeAmount > 0) {
                    orderTips.serviceChargeTips += charge.chargeAmount; // Keep as-is, likely already dollars
                    deliveryAnalysis.tipExtractionMethods.serviceChargeGratuity++;
                  }
                  
                  // Delivery charges (may include tips)
                  if (charge.delivery && charge.chargeAmount > 0) {
                    orderTips.deliveryCharges += charge.chargeAmount; // Keep as-is, likely already dollars
                    deliveryAnalysis.tipExtractionMethods.deliveryCharges++;
                  }
                  
                  // Service charges with "tip" or "gratuity" in name
                  if (charge.name && charge.chargeAmount > 0) {
                    const tipKeywords = ['tip', 'gratuity', 'service', 'auto'];
                    if (tipKeywords.some(keyword => charge.name.toLowerCase().includes(keyword))) {
                      orderTips.serviceChargeTips += charge.chargeAmount; // Keep as-is, likely already dollars
                      deliveryAnalysis.tipExtractionMethods.serviceChargeGratuity++;
                    }
                  }
                });
              }
              
              // Method 3: Check-level tip amounts (if exists)
              if (check.tipAmount && check.tipAmount > 0) {
                orderTips.paymentTips += check.tipAmount; // Keep as-is, likely already dollars
                deliveryAnalysis.tipExtractionMethods.paymentTipAmount++;
              }
            });
          }

          // Calculate total tips (take the maximum to avoid double counting, but be more inclusive)
          orderTips.total = orderTips.paymentTips + orderTips.serviceChargeTips + orderTips.deliveryCharges;
          
          // If we found tips, include this order regardless of amount
          if (orderTips.total > 0) {
            deliveryAnalysis.deliveryOrders.push({
              orderGuid: order.guid,
              openedDate: order.openedDate,
              businessDate: order.businessDate,
              deliveryIndicators: deliveryIndicators,
              deliveryInfo: order.deliveryInfo || null,
              source: order.source || null,
              tips: orderTips,
              estimatedFulfillmentDate: order.estimatedFulfillmentDate || null,
              diningOptionGuid: order.diningOption?.guid || null
            });

            deliveryAnalysis.totalDeliveryTips += orderTips.total;
          }
        }
      });
    }

    return res.status(200).json({
      success: true,
      message: `Analyzed ${allOrders.length} orders across ${page} pages for delivery tips on ${businessDate}`,
      data: {
        date: date,
        businessDate: businessDate,
        pagination: {
          totalPages: page,
          totalOrders: allOrders.length,
          pageSize: pageSize
        },
        deliveryAnalysis: deliveryAnalysis,
        rawOrdersSample: allOrders.slice(0, 2), // First 2 orders for structure analysis
        summary: {
          totalDeliveryOrders: deliveryAnalysis.deliveryOrders.length,
          totalDeliveryTips: deliveryAnalysis.totalDeliveryTips.toFixed(2),
          averageTipPerOrder: deliveryAnalysis.deliveryOrders.length > 0 ? 
            (deliveryAnalysis.totalDeliveryTips / deliveryAnalysis.deliveryOrders.length).toFixed(2) : '0.00'
        }
      }
    });

  } catch (error) {
    console.error('Delivery orders fetch error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error during delivery orders fetch',
      details: error.message
    });
  }
}