/**
 * Vercel Serverless Function: Toast Catering Orders
 * Fetches catering orders from Toast API for upcoming date range
 * and stores them in Supabase database
 *
 * Catering orders identified by source field:
 * - "Invoice"
 * - "Catering"
 * - "Catering Online Ordering"
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

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

      // Parse business date to readable format
      const dateStr = order.businessDate?.toString() || '';
      const deliveryDate = dateStr.length === 8
        ? `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`
        : null;

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
      let total = 0;
      if (order.checks && Array.isArray(order.checks)) {
        total = order.checks.reduce((sum, check) => {
          // Use totalAmount (includes tip/service charges) in CENTS
          return sum + (check.totalAmount || check.amount || 0);
        }, 0);
      }

      console.log(`💰 Order ${order.guid?.substring(0, 8)} total: $${(total / 100).toFixed(2)} (${total} cents)`);

      return {
        // Order IDs
        toast_order_id: order.guid,
        order_number: order.displayNumber || order.guid?.substring(0, 8),

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
      // Don't fail the request, just log the error
    } else {
      console.log(`✅ Saved ${savedOrders?.length || ordersToSave.length} orders to database`);
    }

    return res.status(200).json({
      success: true,
      message: `Found ${cateringData.length} catering orders`,
      data: {
        startDate,
        endDate,
        totalOrders: cateringData.length,
        orders: cateringData,
        savedToDatabase: !saveError
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
