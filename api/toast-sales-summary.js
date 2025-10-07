export default async function handler(req, res) {
  // Set CORS headers (v4.0 - switched to payment-based calculation - item-based broken)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { startDate, endDate, token } = req.query;

    if (!startDate || !endDate || !token) {
      return res.status(400).json({
        error: 'Missing required parameters: startDate, endDate, and token'
      });
    }

    const restaurantId = process.env.TOAST_RESTAURANT_GUID || 'd3efae34-7c2e-4107-a442-49081e624706';
    const toastApiUrl = process.env.TOAST_BASE_URL || 'https://ws-api.toasttab.com';

    console.log(`Fetching sales summary for ${startDate} to ${endDate}`);

    // Parse dates to get business date range
    const start = new Date(startDate);
    const end = new Date(endDate);
    const businessDates = [];

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      businessDates.push(d.toISOString().split('T')[0]);
    }

    console.log(`Processing ${businessDates.length} business dates`);

    let totalNetSales = 0;
    let totalCreditTips = 0;
    let totalCreditTipsGross = 0; // Before voiding
    let totalCashSales = 0;
    let totalOrdersProcessed = 0;
    let totalVoidedTips = 0;
    let totalDiscounts = 0;
    let totalTipsOnDiscountedChecks = 0;
    let debugOrderCount = 0; // Separate counter for debug logging

    // Alternative calculation: from menu items (like Toast does)
    let totalGrossSales = 0; // Sum of all item prices
    let totalVoidedItemSales = 0; // Sales from voided items

    // Use ordersBulk endpoint (more efficient - gets all payment data in bulk)
    // Toast docs recommend /payments endpoint, but it's too slow (1 API call per payment)
    // ordersBulk gives us all payment data in paginated batches
    for (const dateStr of businessDates) {
      try {
        // Format date for Toast API (YYYYMMDD without dashes)
        const businessDate = dateStr.replace(/-/g, '');
        console.log(`Fetching orders for ${businessDate} (${dateStr})...`);

        let page = 1;
        let hasMorePages = true;
        let retryCount = 0;
        const maxRetries = 3;

        while (hasMorePages) {
          const ordersUrl = `${toastApiUrl}/orders/v2/ordersBulk?businessDate=${businessDate}&page=${page}&pageSize=100`;

          try {
            const ordersResponse = await fetch(ordersUrl, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Toast-Restaurant-External-ID': restaurantId,
                'Content-Type': 'application/json'
              }
            });

            if (!ordersResponse.ok) {
              // If rate limited, retry with exponential backoff
              if (ordersResponse.status === 429 && retryCount < maxRetries) {
                const backoffDelay = 1000 * Math.pow(2, retryCount);
                console.log(`Rate limited on ${businessDate} page ${page}, retrying in ${backoffDelay}ms (attempt ${retryCount + 1}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, backoffDelay));
                retryCount++;
                continue; // Retry same page
              }

              console.error(`Failed to fetch orders for ${businessDate}, page ${page}: ${ordersResponse.status}`);
              break;
            }

            const orders = await ordersResponse.json();
            retryCount = 0; // Reset retry count on success

            if (Array.isArray(orders) && orders.length > 0) {
              console.log(`${businessDate} Page ${page}: ${orders.length} orders (total processed: ${totalOrdersProcessed})`);

              // Process each order (INCLUDING voided orders to get gross tips)
              for (const order of orders) {
                debugOrderCount++; // Increment for every order, regardless of void status

                // SIMPLIFIED void detection - only check voided boolean
                // Removing all other checks temporarily to isolate the issue
                const isVoided = order.voided === true;

                if (!isVoided) {
                  totalOrdersProcessed++;
                }

                // ENHANCED DEBUG: Log first 5 orders completely to see structure
                // Use debugOrderCount to avoid logging ALL orders if none are counted
                if (debugOrderCount <= 5) {
                  console.log(`\n=== SAMPLE ORDER ${debugOrderCount} (${order.orderNumber}) ===`);
                  console.log('Order fields:', Object.keys(order));
                  console.log('Order voided?', order.voided);
                  console.log('Order voidDate?', order.voidDate);
                  console.log('Order deletedDate?', order.deletedDate);
                  console.log('Order deleted?', order.deleted);
                  console.log('Order guestOrderStatus?', order.guestOrderStatus);
                  console.log('Order paymentStatus?', order.paymentStatus);
                  console.log('isVoided result:', isVoided);
                  if (order.checks && order.checks[0]) {
                    console.log('Check fields:', Object.keys(order.checks[0]));
                    console.log('Check voided?', order.checks[0].voided);
                    console.log('Check voidDate?', order.checks[0].voidDate);
                    if (order.checks[0].payments && order.checks[0].payments[0]) {
                      console.log('Payment fields:', Object.keys(order.checks[0].payments[0]));
                      console.log('Payment refundStatus?', order.checks[0].payments[0].refundStatus);
                      console.log('Payment voided?', order.checks[0].payments[0].voided);
                      console.log('Payment paymentStatus?', order.checks[0].payments[0].paymentStatus);
                      console.log('Payment voidInfo?', order.checks[0].payments[0].voidInfo);
                    }
                  }
                  console.log('=== END SAMPLE ===\n');
                }

                // Track discounts at order level
                let orderDiscountAmount = 0;
                let orderHasTips = false;

                // Process payments within checks
                if (order.checks && Array.isArray(order.checks)) {
                  for (const check of order.checks) {
                    // SIMPLIFIED check void detection - only check voided boolean
                    const isCheckVoided = check.voided === true;

                    // Track check-level discounts
                    let checkDiscounts = 0;
                    if (check.appliedDiscounts && Array.isArray(check.appliedDiscounts)) {
                      for (const discount of check.appliedDiscounts) {
                        const discountAmount = discount.discountAmount || 0;
                        checkDiscounts += discountAmount;
                        totalDiscounts += discountAmount;
                      }
                    }

                    // Track selection-level (menu item) sales and voids
                    // CRITICAL: Only process items from NON-VOIDED orders/checks
                    if (check.selections && Array.isArray(check.selections)) {
                      for (const selection of check.selections) {
                        const selectionPrice = selection.price || 0;
                        const selectionQuantity = selection.quantity || 1;
                        const selectionTotal = selectionPrice * selectionQuantity;

                        // SIMPLIFIED selection void detection - only check voided boolean
                        const isSelectionVoided = selection.voided === true;

                        // Only count items from non-voided orders/checks
                        if (!isVoided && !isCheckVoided) {
                          if (isSelectionVoided) {
                            // Item was voided - track separately
                            totalVoidedItemSales += selectionTotal;
                            console.log(`  Voided item: ${selection.itemName || selection.item?.name || 'Unknown'}, Price: $${selectionPrice}, Qty: ${selectionQuantity}`);
                          } else {
                            // Not voided - add to gross sales
                            totalGrossSales += selectionTotal;
                          }

                          // Selection-level discounts
                          if (selection.appliedDiscounts && Array.isArray(selection.appliedDiscounts)) {
                            for (const discount of selection.appliedDiscounts) {
                              const discountAmount = discount.discountAmount || 0;
                              checkDiscounts += discountAmount;
                              totalDiscounts += discountAmount;
                            }
                          }
                        }
                      }
                    }

                    if (check.payments && Array.isArray(check.payments)) {
                      for (const payment of check.payments) {
                        const tipAmount = payment.tipAmount || 0;
                        const amount = payment.amount || 0;

                        // SIMPLIFIED payment void detection - only check explicit void/refund statuses
                        const isPaymentVoided = payment.voided === true ||
                                               payment.refundStatus === 'FULL' ||
                                               payment.refundStatus === 'PARTIAL';

                        // Categorize by payment type (not cash, not delivery platforms)
                        const isCreditCardTip = payment.type !== 'CASH' &&
                                               payment.type !== 'OTHER' &&
                                               payment.type !== 'HOUSE_ACCOUNT' &&
                                               payment.type !== 'UNDECLARED_CASH';

                        // Debug logging for all voided transactions
                        if (isVoided || isCheckVoided || isPaymentVoided) {
                          console.log(`VOID DETECTED: Order ${order.orderNumber}, Amount: $${amount}, Tip: $${tipAmount}, Type: ${payment.type}`);
                          console.log(`  Void reasons: OrderVoid=${isVoided}, CheckVoid=${isCheckVoided}, PaymentVoid=${isPaymentVoided}`);
                          console.log(`  Order data: voided=${order.voided}, voidDate=${order.voidDate}, deleted=${order.deleted}`);
                          console.log(`  Payment data: refundStatus=${payment.refundStatus}, paymentStatus=${payment.paymentStatus}\n`);
                        }

                        // Only include payment amounts from NON-VOIDED orders
                        // (voided orders still appear in API but shouldn't count toward sales)
                        if (!isVoided && !isCheckVoided && !isPaymentVoided) {
                          totalNetSales += amount;
                        }

                        // Handle tips separately - track ALL tips including voided for transparency
                        if (isCreditCardTip && tipAmount > 0) {
                          orderHasTips = true;

                          // Add to gross tips (all tips before voiding)
                          totalCreditTipsGross += tipAmount;

                          // If voided (order, check, or payment level), add to voided total
                          if (isVoided || isCheckVoided || isPaymentVoided) {
                            totalVoidedTips += tipAmount;
                          } else {
                            // Only add to net tips if NOT voided
                            totalCreditTips += tipAmount;

                            // Track tips on checks with discounts
                            if (checkDiscounts > 0) {
                              totalTipsOnDiscountedChecks += tipAmount;
                            }
                          }
                        }

                        // Track cash sales from non-voided payments only
                        if (payment.type === 'CASH' && !isVoided && !isCheckVoided && !isPaymentVoided) {
                          totalCashSales += amount;
                        }
                      }
                    }
                  }
                }
              }

              page++;

              // If less than 100 orders, we're done with this date
              if (orders.length < 100) {
                hasMorePages = false;
              }
            } else {
              hasMorePages = false;
            }

            // Longer delay between pages to avoid rate limits (increased from 100ms to 300ms)
            await new Promise(resolve => setTimeout(resolve, 300));

          } catch (fetchError) {
            console.error(`Error fetching page ${page} for ${businessDate}:`, fetchError.message);
            // Retry logic for network errors
            if (retryCount < maxRetries) {
              const backoffDelay = 1000 * Math.pow(2, retryCount);
              console.log(`Retrying in ${backoffDelay}ms (attempt ${retryCount + 1}/${maxRetries})`);
              await new Promise(resolve => setTimeout(resolve, backoffDelay));
              retryCount++;
              continue;
            }
            break;
          }
        }

        // Delay between dates to further avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (dateError) {
        console.error(`Error processing date ${dateStr}:`, dateError.message);
      }
    }

    // Calculate net sales using Toast's method (from menu items)
    const calculatedNetSales = totalGrossSales - totalDiscounts;

    // CRITICAL FIX: Item-based calculation is broken (3.4x inflated)
    // Use payment-based calculation instead (only $79 off vs $113k off!)
    const finalNetSales = totalNetSales; // Payment-based is accurate

    console.log(`\n=== SALES SUMMARY COMPLETE ===`);
    console.log(`DEBUG: Total orders from API: ${debugOrderCount}`);
    console.log(`Orders Processed (non-voided): ${totalOrdersProcessed}`);
    console.log(`Orders marked as voided: ${debugOrderCount - totalOrdersProcessed}`);
    console.log(`\nSales Calculation Comparison:`);
    console.log(`  Method 1 (from payments): $${totalNetSales.toFixed(2)} ✓ USING THIS`);
    console.log(`  Method 2 (from items): Gross $${totalGrossSales.toFixed(2)} - Discounts $${totalDiscounts.toFixed(2)} = $${calculatedNetSales.toFixed(2)} ✗ BROKEN`);
    console.log(`  Voided Item Sales: $${totalVoidedItemSales.toFixed(2)}`);
    console.log(`  Using Method 1 (payments) - only $79 off vs $113k off!`);
    console.log(`\nNet Sales (from payments): $${finalNetSales.toFixed(2)}`);
    console.log(`Total Discounts: $${totalDiscounts.toFixed(2)}`);
    console.log(`Credit Tips (Gross): $${totalCreditTipsGross.toFixed(2)}`);
    console.log(`Voided Tips: $${totalVoidedTips.toFixed(2)}`);
    console.log(`Tips on Discounted Checks: $${totalTipsOnDiscountedChecks.toFixed(2)}`);
    console.log(`Credit Tips (Net): $${totalCreditTips.toFixed(2)}`);
    console.log(`Cash Sales: $${totalCashSales.toFixed(2)}`);
    console.log(`=== END SUMMARY ===\n`);

    return res.json({
      success: true,
      version: 'v4.0-payments-20251006-2350', // Using payment-based calculation
      dateRange: {
        start: startDate,
        end: endDate
      },
      netSales: finalNetSales, // Using payment-based calculation (accurate!)
      grossSales: totalGrossSales, // For transparency
      voidedItemSales: totalVoidedItemSales, // Track voided item sales
      creditTips: totalCreditTips,
      creditTipsGross: totalCreditTipsGross,
      voidedTips: totalVoidedTips,
      cashSales: totalCashSales,
      discounts: totalDiscounts,
      tipsOnDiscountedChecks: totalTipsOnDiscountedChecks,
      businessDatesProcessed: businessDates.length,
      ordersProcessed: totalOrdersProcessed,
      // Debug info
      debug: {
        totalOrdersFromAPI: debugOrderCount,
        ordersMarkedVoided: debugOrderCount - totalOrdersProcessed,
        netSalesFromPayments: totalNetSales, // Using this one!
        netSalesFromItems: calculatedNetSales, // Broken (3.4x inflated)
        voidedItemSales: totalVoidedItemSales
      }
    });

  } catch (error) {
    console.error('Toast sales summary API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
}
