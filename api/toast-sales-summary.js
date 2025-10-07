export default async function handler(req, res) {
  // Set CORS headers (v5.0 - CRITICAL FIXES: deleted orders + gratuity service charge filter)
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

    // CRITICAL FIX: Track voided vs deleted separately
    let totalVoidedOrders = 0;
    let totalDeletedOrders = 0;

    // Alternative calculation: from menu items (like Toast does)
    let totalGrossSales = 0; // Sum of all item prices
    let totalVoidedItemSales = 0; // Sales from voided items

    // Service charge tracking (non-gratuity only)
    let totalServiceCharges = 0;
    let totalGratuityServiceCharges = 0; // Track separately for debugging

    // Payment type breakdown for debugging
    let paymentTypeBreakdown = {};

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

              // Process each order (INCLUDING voided/deleted orders to get gross tips)
              for (const order of orders) {
                debugOrderCount++; // Increment for every order, regardless of void/delete status

                // CRITICAL FIX: Check BOTH voided AND deleted (Toast has two separate states!)
                // Per Toast docs: "Exclude voided orders/checks AND deleted orders/checks"
                // Also check guestOrderStatus and paymentStatus per Toast docs
                const isVoided = order.voided === true ||
                                order.guestOrderStatus === 'VOIDED' ||
                                order.paymentStatus === 'VOIDED';
                const isDeleted = order.deleted === true;
                const isOrderExcluded = isVoided || isDeleted;

                // Count voided and deleted separately for debugging
                if (order.voided === true || order.guestOrderStatus === 'VOIDED' || order.paymentStatus === 'VOIDED') {
                  totalVoidedOrders++;
                }
                if (isDeleted) totalDeletedOrders++;

                if (!isOrderExcluded) {
                  totalOrdersProcessed++;
                }

                // ENHANCED DEBUG: Log first 5 orders AND all excluded orders
                // Use debugOrderCount to avoid logging ALL orders if none are counted
                if (debugOrderCount <= 5 || isOrderExcluded) {
                  console.log(`\n=== ${isOrderExcluded ? 'EXCLUDED' : 'SAMPLE'} ORDER ${debugOrderCount} (${order.orderNumber}) ===`);
                  console.log('Order fields:', Object.keys(order));
                  console.log('Order voided?', order.voided);
                  console.log('Order guestOrderStatus?', order.guestOrderStatus);
                  console.log('Order paymentStatus?', order.paymentStatus);
                  console.log('Order deleted?', order.deleted);
                  console.log('Order voidDate?', order.voidDate);
                  console.log('Order deletedDate?', order.deletedDate);
                  console.log('isVoided result:', isVoided, `(voided=${order.voided}, guestOrderStatus=${order.guestOrderStatus}, paymentStatus=${order.paymentStatus})`);
                  console.log('isDeleted result:', isDeleted);
                  console.log('isOrderExcluded result:', isOrderExcluded);
                  if (order.checks && order.checks[0]) {
                    console.log('Check fields:', Object.keys(order.checks[0]));
                    console.log('Check voided?', order.checks[0].voided);
                    console.log('Check deleted?', order.checks[0].deleted);
                    console.log('Check voidDate?', order.checks[0].voidDate);
                    if (order.checks[0].payments && order.checks[0].payments[0]) {
                      console.log('Payment fields:', Object.keys(order.checks[0].payments[0]));
                      console.log('Payment refundStatus?', order.checks[0].payments[0].refundStatus);
                      console.log('Payment voided?', order.checks[0].payments[0].voided);
                      console.log('Payment paymentStatus?', order.checks[0].payments[0].paymentStatus);
                      console.log('Payment voidInfo?', order.checks[0].payments[0].voidInfo);
                      console.log('Payment amount?', order.checks[0].payments[0].amount);
                      console.log('Payment tipAmount?', order.checks[0].payments[0].tipAmount);
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
                    // CRITICAL FIX: Check BOTH voided AND deleted at check level
                    // "When an order is deleted, the checks are deleted and inherit the deleted and deletedDate values"
                    const isCheckVoided = check.voided === true;
                    const isCheckDeleted = check.deleted === true;
                    const isCheckExcluded = isCheckVoided || isCheckDeleted;

                    // Track check-level discounts
                    let checkDiscounts = 0;
                    if (check.appliedDiscounts && Array.isArray(check.appliedDiscounts)) {
                      for (const discount of check.appliedDiscounts) {
                        const discountAmount = discount.discountAmount || 0;
                        checkDiscounts += discountAmount;
                        totalDiscounts += discountAmount;
                      }
                    }

                    // Track check-level service charges (NOT payments, but added to net sales)
                    // CRITICAL FIX: Only include NON-GRATUITY service charges per Toast docs
                    // "Gratuity service charges are paid to staff, not added to net sales"
                    if (!isOrderExcluded && !isCheckExcluded && check.appliedServiceCharges && Array.isArray(check.appliedServiceCharges)) {
                      for (const serviceCharge of check.appliedServiceCharges) {
                        const chargeAmount = serviceCharge.chargeAmount || 0;
                        const isGratuity = serviceCharge.gratuity === true;

                        if (isGratuity) {
                          // Gratuity service charge - goes to staff, NOT net sales
                          totalGratuityServiceCharges += chargeAmount;
                        } else {
                          // Non-gratuity service charge - goes to restaurant, add to net sales
                          totalServiceCharges += chargeAmount;
                        }
                      }
                    }

                    // Track selection-level (menu item) sales and voids
                    // CRITICAL: Only process items from NON-VOIDED/DELETED orders/checks
                    if (check.selections && Array.isArray(check.selections)) {
                      for (const selection of check.selections) {
                        const selectionPrice = selection.price || 0;
                        const selectionQuantity = selection.quantity || 1;
                        const selectionTotal = selectionPrice * selectionQuantity;

                        // SIMPLIFIED selection void detection - only check voided boolean
                        const isSelectionVoided = selection.voided === true;

                        // Only count items from non-voided/deleted orders/checks
                        if (!isOrderExcluded && !isCheckExcluded) {
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

                        // Debug logging for all voided/deleted transactions
                        if (isOrderExcluded || isCheckExcluded || isPaymentVoided) {
                          console.log(`VOID/DELETE DETECTED: Order ${order.orderNumber}, Amount: $${amount}, Tip: $${tipAmount}, Type: ${payment.type}`);
                          console.log(`  Reasons: OrderVoid=${isVoided}, OrderDelete=${isDeleted}, CheckVoid=${isCheckVoided}, CheckDelete=${isCheckDeleted}, PaymentVoid=${isPaymentVoided}`);
                          console.log(`  Order data: voided=${order.voided}, deleted=${order.deleted}, voidDate=${order.voidDate}, deletedDate=${order.deletedDate}`);
                          console.log(`  Check data: voided=${check.voided}, deleted=${check.deleted}`);
                          console.log(`  Payment data: refundStatus=${payment.refundStatus}, paymentStatus=${payment.paymentStatus}\n`);
                        }

                        // Only include payment amounts from NON-VOIDED/DELETED orders
                        // Per Toast docs: Exclude both voided AND deleted orders/checks
                        if (!isOrderExcluded && !isCheckExcluded && !isPaymentVoided) {
                          totalNetSales += amount;

                          // Track payment types for debugging
                          const paymentType = payment.type || 'UNKNOWN';
                          if (!paymentTypeBreakdown[paymentType]) {
                            paymentTypeBreakdown[paymentType] = { count: 0, amount: 0, tips: 0 };
                          }
                          paymentTypeBreakdown[paymentType].count++;
                          paymentTypeBreakdown[paymentType].amount += amount;
                          paymentTypeBreakdown[paymentType].tips += tipAmount;
                        }

                        // Handle tips separately - track ALL tips including voided for transparency
                        if (isCreditCardTip && tipAmount > 0) {
                          orderHasTips = true;

                          // Add to gross tips (all tips before voiding)
                          totalCreditTipsGross += tipAmount;

                          // If voided/deleted (order, check, or payment level), add to voided total
                          if (isOrderExcluded || isCheckExcluded || isPaymentVoided) {
                            totalVoidedTips += tipAmount;
                          } else {
                            // Only add to net tips if NOT voided/deleted
                            totalCreditTips += tipAmount;

                            // Track tips on checks with discounts
                            if (checkDiscounts > 0) {
                              totalTipsOnDiscountedChecks += tipAmount;
                            }
                          }
                        }

                        // Track cash sales from non-voided/deleted payments only
                        if (payment.type === 'CASH' && !isOrderExcluded && !isCheckExcluded && !isPaymentVoided) {
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
    // Use payment-based calculation + service charges
    const finalNetSales = totalNetSales + totalServiceCharges;

    console.log(`\n=== SALES SUMMARY COMPLETE ===`);
    console.log(`\nPayment Type Breakdown:`);
    for (const [type, data] of Object.entries(paymentTypeBreakdown)) {
      console.log(`  ${type}: ${data.count} payments, $${data.amount.toFixed(2)} amount, $${data.tips.toFixed(2)} tips`);
    }
    console.log(`\nDEBUG: Total orders from API: ${debugOrderCount}`);
    console.log(`  Orders Processed (active): ${totalOrdersProcessed}`);
    console.log(`  Orders VOIDED: ${totalVoidedOrders}`);
    console.log(`  Orders DELETED: ${totalDeletedOrders}`);
    console.log(`  Total Excluded: ${totalVoidedOrders + totalDeletedOrders} (should match ${debugOrderCount - totalOrdersProcessed})`);
    console.log(`\nSales Calculation Comparison:`);
    console.log(`  Method 1 (from payments): $${totalNetSales.toFixed(2)}`);
    console.log(`  + Non-Gratuity Service Charges: $${totalServiceCharges.toFixed(2)}`);
    console.log(`  (Gratuity Service Charges excluded: $${totalGratuityServiceCharges.toFixed(2)})`);
    console.log(`  = Net Sales: $${finalNetSales.toFixed(2)} ✓ USING THIS`);
    console.log(`  Method 2 (from items): Gross $${totalGrossSales.toFixed(2)} - Discounts $${totalDiscounts.toFixed(2)} = $${calculatedNetSales.toFixed(2)} ✗ BROKEN`);
    console.log(`  Voided Item Sales: $${totalVoidedItemSales.toFixed(2)}`);
    console.log(`\nNet Sales (payments + non-gratuity service charges): $${finalNetSales.toFixed(2)}`);
    console.log(`  Base Payments: $${totalNetSales.toFixed(2)}`);
    console.log(`  Non-Gratuity Service Charges: $${totalServiceCharges.toFixed(2)}`);
    console.log(`Total Discounts: $${totalDiscounts.toFixed(2)}`);
    console.log(`Credit Tips (Gross): $${totalCreditTipsGross.toFixed(2)}`);
    console.log(`Voided Tips: $${totalVoidedTips.toFixed(2)}`);
    console.log(`Tips on Discounted Checks: $${totalTipsOnDiscountedChecks.toFixed(2)}`);
    console.log(`Credit Tips (Net): $${totalCreditTips.toFixed(2)}`);
    console.log(`Cash Sales: $${totalCashSales.toFixed(2)}`);
    console.log(`=== END SUMMARY ===\n`);

    return res.json({
      success: true,
      version: 'v5.0-deleted-orders-gratuity-filter-20251007-0100', // CRITICAL FIXES
      dateRange: {
        start: startDate,
        end: endDate
      },
      netSales: finalNetSales, // Payment-based + NON-gratuity service charges only
      grossSales: totalGrossSales, // For transparency
      voidedItemSales: totalVoidedItemSales, // Track voided item sales
      creditTips: totalCreditTips,
      creditTipsGross: totalCreditTipsGross,
      voidedTips: totalVoidedTips,
      cashSales: totalCashSales,
      discounts: totalDiscounts,
      serviceCharges: totalServiceCharges, // Non-gratuity only
      gratuityServiceCharges: totalGratuityServiceCharges, // Excluded from net sales
      tipsOnDiscountedChecks: totalTipsOnDiscountedChecks,
      businessDatesProcessed: businessDates.length,
      ordersProcessed: totalOrdersProcessed,
      // Debug info - ENHANCED
      debug: {
        totalOrdersFromAPI: debugOrderCount,
        ordersVoided: totalVoidedOrders,
        ordersDeleted: totalDeletedOrders,
        ordersExcluded: totalVoidedOrders + totalDeletedOrders,
        basePayments: totalNetSales, // Before service charges
        serviceChargesNonGratuity: totalServiceCharges,
        serviceChargesGratuity: totalGratuityServiceCharges,
        netSalesFromPayments: finalNetSales, // After adding service charges
        netSalesFromItems: calculatedNetSales, // Broken (3.4x inflated)
        voidedItemSales: totalVoidedItemSales,
        paymentTypeBreakdown: paymentTypeBreakdown
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
