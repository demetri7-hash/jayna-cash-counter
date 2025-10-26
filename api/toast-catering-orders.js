/**
 * Vercel Serverless Function: Toast Catering Orders
 * Fetches catering orders from Toast API for upcoming date range
 * and stores them in Supabase database
 *
 * Catering orders identified by:
 * 1. Source field:
 *    - "Invoice"
 *    - "Catering"
 *    - "Catering Online Ordering"
 *    - "Catering Pick Up"
 *
 * 2. "In Store" orders with catering indicators:
 *    - Has deliveryInfo object (catering pickup has customer/delivery details)
 *    - Has promisedDate (scheduled/expected pickup time)
 *    - diningOption contains "CATERING"
 *
 * OPTIMIZATIONS (Oct 2025):
 * - Full pagination support (fetches ALL orders, not just first 100)
 * - Rate limit protection (200ms delay = 5 req/sec, Toast limit compliance)
 * - Retry logic for 429 errors (exponential backoff)
 * - Enhanced catering detection (source + metadata indicators)
 * - Source detection logging for debugging
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

/**
 * Fetch with automatic retry on rate limit errors
 */
async function fetchWithRateLimit(url, options, retryCount = 0) {
  const maxRetries = 3;

  try {
    const response = await fetch(url, options);

    // Handle rate limiting with retry
    if (response.status === 429 && retryCount < maxRetries) {
      const retryAfter = parseInt(response.headers.get('Retry-After') || '5');
      console.log(`⚠️ Rate limited. Waiting ${retryAfter}s before retry ${retryCount + 1}/${maxRetries}...`);

      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
      return fetchWithRateLimit(url, options, retryCount + 1);
    }

    return response;
  } catch (error) {
    // Network error - retry with exponential backoff
    if (retryCount < maxRetries) {
      const delay = Math.min(1000 * Math.pow(2, retryCount), 10000); // Max 10s
      console.log(`⚠️ Network error. Retrying in ${delay}ms (${retryCount + 1}/${maxRetries})...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithRateLimit(url, options, retryCount + 1);
    }
    throw error;
  }
}

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
    const sourceStats = {}; // Track sources for debugging
    let currentDate = new Date(startDate);
    const finalDate = new Date(endDate);

    while (currentDate <= finalDate) {
      const businessDate = currentDate.toISOString().split('T')[0].replace(/-/g, '');

      console.log(`🔍 Fetching orders for ${businessDate}...`);

      // PAGINATION LOOP - Fetch ALL pages, not just first 100
      let page = 1;
      let hasMorePages = true;

      while (hasMorePages) {
        const ordersUrl = `${TOAST_CONFIG.baseUrl}/orders/v2/ordersBulk?businessDate=${businessDate}&pageSize=100&page=${page}`;

        const response = await fetchWithRateLimit(ordersUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Toast-Restaurant-External-ID': TOAST_CONFIG.restaurantGuid,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const orders = await response.json();

          if (Array.isArray(orders) && orders.length > 0) {
            // Log unique sources for debugging
            orders.forEach(o => {
              sourceStats[o.source] = (sourceStats[o.source] || 0) + 1;
            });

            // Filter for catering orders only
            const cateringOrders = orders.filter(order => {
              // Check if order is a catering order by source
              const isCateringBySource =
                order.source === 'Invoice' ||
                order.source === 'Catering' ||
                order.source === 'Catering Online Ordering' ||
                order.source === 'Catering Pick Up';

              // ALSO check for "In Store" orders with catering indicators:
              // - deliveryInfo object exists (catering pickup has delivery details)
              // - promisedDate exists (scheduled/catering orders have expected time)
              // - diningOption contains "CATERING"
              const hasDeliveryInfo = order.deliveryInfo && typeof order.deliveryInfo === 'object' && Object.keys(order.deliveryInfo).length > 0;
              const hasPromisedDate = !!order.promisedDate;
              const hasCateringDiningOption = order.diningOption && typeof order.diningOption === 'string' && order.diningOption.toLowerCase().includes('catering');

              const isCateringPickup = order.source === 'In Store' && (
                hasDeliveryInfo || hasPromisedDate || hasCateringDiningOption
              );

              // Log "In Store" catering pickups for debugging
              if (isCateringPickup) {
                console.log(`🎯 Detected In Store catering pickup - Order ${order.displayNumber || order.guid?.substring(0, 8)}: deliveryInfo=${hasDeliveryInfo}, promisedDate=${hasPromisedDate}, diningOption=${order.diningOption || 'none'}`);
              }

              const isCatering = isCateringBySource || isCateringPickup;

              // Exclude voided/deleted orders
              const isValid = !order.voided && !order.deleted;

              return isCatering && isValid;
            });

            console.log(`✅ Found ${cateringOrders.length} catering orders on ${businessDate} (page ${page})`);
            allCateringOrders.push(...cateringOrders);

            // Check if there are more pages
            hasMorePages = orders.length === 100;
            page++;
          } else {
            hasMorePages = false;
          }
        } else {
          console.error(`❌ Failed to fetch orders for ${businessDate} (page ${page}): ${response.status}`);
          hasMorePages = false;
        }

        // Rate limit protection: 200ms = 5 req/sec (Toast ordersBulk limit)
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    console.log(`📦 Total catering orders found: ${allCateringOrders.length}`);
    console.log(`📊 Source breakdown:`, sourceStats);

    // DEBUG: Log first order structure to understand Toast API response
    if (allCateringOrders.length > 0) {
      const firstOrder = allCateringOrders[0];
      console.log('🔍 DEBUG - First order structure:');
      console.log('Customer object:', JSON.stringify(firstOrder.customer, null, 2));
      console.log('Delivery info:', JSON.stringify(firstOrder.deliveryInfo, null, 2));
      console.log('Checks array:', JSON.stringify(firstOrder.checks, null, 2));
      console.log('Number of guests:', firstOrder.numberOfGuests);
      console.log('Order keys:', Object.keys(firstOrder));
    }

    // Transform orders to catering format
    const cateringData = allCateringOrders.map(order => {
      // Extract delivery info
      const deliveryInfo = order.deliveryInfo || {};

      // CRITICAL: Customer info is INSIDE the checks array, not at order level!
      let customer = {};
      if (order.checks && order.checks.length > 0 && order.checks[0].customer) {
        customer = order.checks[0].customer;
      }

      // Build customer name
      let customerName = 'Unknown';
      if (customer.firstName && customer.lastName) {
        customerName = `${customer.firstName} ${customer.lastName}`;
      } else if (customer.firstName) {
        customerName = customer.firstName;
      } else if (customer.lastName) {
        customerName = customer.lastName;
      }

      // Get phone number and clean it
      let customerPhone = customer.phone || null;
      if (customerPhone && !customerPhone.includes('-') && !customerPhone.includes('(')) {
        // Format phone: 2165011552 -> (216) 501-1552
        customerPhone = `(${customerPhone.substring(0, 3)}) ${customerPhone.substring(3, 6)}-${customerPhone.substring(6)}`;
      }

      // Get email
      const customerEmail = customer.email || null;

      // EXTRACT DELIVERY DATE from promisedDate (scheduled delivery/pickup time), NOT businessDate (order creation date)
      // promisedDate format: "2025-10-25T13:00:00.000+0000" (ISO 8601 with time)
      // Extract just the date portion (YYYY-MM-DD)
      let deliveryDate = null;
      if (order.promisedDate) {
        // Parse promisedDate to get date only (ignore time)
        const promisedDateStr = order.promisedDate.split('T')[0]; // Get "2025-10-25" from "2025-10-25T13:00:00.000+0000"
        deliveryDate = promisedDateStr; // Already in YYYY-MM-DD format
      } else {
        // Fallback to businessDate if no promisedDate (shouldn't happen for catering orders)
        const dateStr = order.businessDate?.toString() || '';
        deliveryDate = dateStr.length === 8
          ? `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`
          : null;
      }

      // Build full delivery address from parts
      let deliveryAddress = null;
      if (deliveryInfo.address1) {
        const parts = [
          deliveryInfo.address1,
          deliveryInfo.address2,
          deliveryInfo.city,
          deliveryInfo.state,
          deliveryInfo.zipCode
        ].filter(Boolean);
        deliveryAddress = parts.join(', ');
      }

      // Calculate TOTAL from checks - use totalAmount (includes tip & fees), NOT amount
      // IMPORTANT: Toast returns amounts in DOLLARS (e.g. 303.55), NOT cents!
      let total = 0;
      if (order.checks && Array.isArray(order.checks)) {
        total = order.checks.reduce((sum, check) => {
          // Use totalAmount (includes tip/service charges) - ALREADY IN DOLLARS
          return sum + (check.totalAmount || check.amount || 0);
        }, 0);
      }

      console.log(`💰 Order ${order.guid?.substring(0, 8)} total: $${total.toFixed(2)}`);

      return {
        // Order IDs
        toast_order_id: order.guid,
        // CRITICAL: Use orderNumber (unique Toast order #), NOT displayNumber (daily sequential 1,2,3...)
        // Fallback to entityId (Toast's unique order number) or first 8 chars of GUID
        order_number: order.orderNumber || order.entityId || `T-${order.guid?.substring(0, 8)}`,

        // Customer info (from check.customer)
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,

        // Delivery info
        delivery_date: deliveryDate,
        delivery_time: order.promisedDate || order.openedDate || null,
        delivery_address: deliveryAddress,
        delivery_notes: deliveryInfo.notes || null,

        // Order details
        source: order.source,
        business_date: order.businessDate,
        headcount: order.numberOfGuests || null,
        total: total, // Already in dollars!

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

    // Save orders to Supabase database (UPSERT to avoid duplicates)
    console.log('💾 Saving orders to Supabase...');

    const ordersToSave = cateringData.map(order => ({
      source_system: 'TOAST',
      source_type: order.source,
      external_order_id: order.toast_order_id,
      order_number: order.order_number,
      customer_name: order.customer_name,
      customer_email: order.customer_email,
      customer_phone: order.customer_phone,
      delivery_date: order.delivery_date,
      delivery_time: order.delivery_time,
      delivery_address: order.delivery_address,
      delivery_notes: order.delivery_notes,
      headcount: order.headcount,
      total_amount: order.total,
      business_date: order.business_date,
      status: order.status,
      order_data: order.order_data,
      last_synced_at: new Date().toISOString()
    }));

    // Use upsert to insert new orders or update existing ones
    const { data: savedOrders, error: saveError } = await supabase
      .from('catering_orders')
      .upsert(ordersToSave, {
        onConflict: 'source_system,external_order_id',
        ignoreDuplicates: false // Update existing orders
      })
      .select();

    if (saveError) {
      console.error('❌ Error saving orders to database:', saveError);
      console.error('Database error details:', JSON.stringify(saveError, null, 2));

      // Return error to user so they know table needs to be created
      return res.status(200).json({
        success: true,
        message: `Found ${cateringData.length} catering orders`,
        data: {
          startDate,
          endDate,
          totalOrders: cateringData.length,
          orders: cateringData,
          savedToDatabase: false,
          databaseError: saveError.message || 'Database table may not exist. Run /sql/create_catering_orders_table.sql in Supabase.',
          sourceStats // Include source breakdown for debugging
        }
      });
    } else {
      console.log(`✅ Saved ${savedOrders?.length || ordersToSave.length} orders to database`);

      // EXTRACT AND SAVE ORDER LINE ITEMS
      console.log('📝 Extracting order line items from Toast orders...');

      const allLineItems = [];

      for (const savedOrder of savedOrders || []) {
        const orderData = savedOrder.order_data;
        if (!orderData || !orderData.checks) continue;

        // Extract line items from each check
        for (const check of orderData.checks) {
          if (!check.selections || !Array.isArray(check.selections)) continue;

          // DEBUG: Log first selection to see structure
          if (check.selections.length > 0) {
            console.log('🔍 DEBUG - First selection structure:');
            console.log('Selection keys:', Object.keys(check.selections[0]));
            console.log('Full selection object:', JSON.stringify(check.selections[0], null, 2));

            // Also log modifiers if they exist
            if (check.selections[0].modifiers && check.selections[0].modifiers.length > 0) {
              console.log('🔍 DEBUG - First modifier structure:');
              console.log('Modifier keys:', Object.keys(check.selections[0].modifiers[0]));
              console.log('Full modifier object:', JSON.stringify(check.selections[0].modifiers[0], null, 2));
            }
          }

          for (const selection of check.selections) {
            // Skip voided items
            if (selection.voided || selection.voidDate) continue;

            // Extract modifiers - try multiple field names
            const modifiers = selection.modifiers && Array.isArray(selection.modifiers)
              ? selection.modifiers.map(mod => ({
                  name: mod.name || mod.displayName || mod.itemName || mod.modifierName || 'Unknown Modifier',
                  price: mod.price || 0,
                  quantity: mod.quantity || 1
                }))
              : [];

            // Build line item - try multiple field names for item name
            const itemName = selection.name ||
                            selection.displayName ||
                            selection.itemName ||
                            selection.menuItemName ||
                            selection.item?.name ||
                            'Unknown Item';

            // CRITICAL: Toast returns TOTAL price in selection.price, NOT unit price!
            // Calculate unit price by dividing total by quantity
            const quantity = selection.quantity || 1;
            const totalPrice = selection.price || 0;
            const unitPrice = totalPrice / quantity;

            const lineItem = {
              order_id: savedOrder.id, // Database ID from saved order
              external_order_id: savedOrder.external_order_id,
              item_guid: selection.itemGuid || selection.guid,
              item_name: itemName,
              quantity: quantity,
              unit_price: unitPrice,  // Calculated from total / quantity
              total_price: totalPrice,  // selection.price is already the total!
              selection_type: selection.selectionType || 'ITEM',
              modifiers: modifiers.length > 0 ? modifiers : null,
              special_requests: selection.specialRequests || null,
              menu_group: selection.menuGroupName || null,
              tax_included: selection.tax ? true : false,
              item_data: selection
            };

            allLineItems.push(lineItem);
          }
        }
      }

      console.log(`📦 Extracted ${allLineItems.length} line items from ${savedOrders?.length || 0} orders`);

      // Delete existing line items for these orders (to avoid duplicates on re-sync)
      if (savedOrders && savedOrders.length > 0) {
        const orderIds = savedOrders.map(o => o.id);
        await supabase
          .from('catering_order_items')
          .delete()
          .in('order_id', orderIds);
      }

      // Save line items to database
      if (allLineItems.length > 0) {
        const { error: itemsError } = await supabase
          .from('catering_order_items')
          .insert(allLineItems);

        if (itemsError) {
          console.error('❌ Error saving order line items:', itemsError);
          console.error('Line items error details:', JSON.stringify(itemsError, null, 2));
        } else {
          console.log(`✅ Saved ${allLineItems.length} order line items to database`);
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: `Found ${cateringData.length} catering orders`,
      data: {
        startDate,
        endDate,
        totalOrders: cateringData.length,
        orders: cateringData,
        savedToDatabase: true,
        sourceStats // Include source breakdown for debugging
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
