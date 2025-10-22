/**
 * Vercel Serverless Function: Check for Order Updates
 * Compares Toast API orders with database to detect new/updated orders
 *
 * Returns:
 * - newOrders: Orders that don't exist in database yet
 * - updatedOrders: Orders that exist but have changes
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
    const { orders } = req.body; // Array of orders from Toast API

    if (!orders || !Array.isArray(orders)) {
      return res.status(400).json({
        success: false,
        error: 'Orders array is required'
      });
    }

    console.log(`🔍 Checking ${orders.length} orders for updates...`);

    // Get all external order IDs from the incoming orders
    const externalIds = orders.map(o => o.toast_order_id);

    // Fetch existing orders from database
    const { data: existingOrders, error: dbError } = await supabase
      .from('catering_orders')
      .select('*')
      .eq('source_system', 'TOAST')
      .in('external_order_id', externalIds);

    if (dbError) {
      console.error('❌ Database error:', dbError);
      return res.status(500).json({
        success: false,
        error: 'Failed to query database',
        details: dbError.message
      });
    }

    // Create a map of existing orders by external_order_id
    const existingOrdersMap = {};
    (existingOrders || []).forEach(order => {
      existingOrdersMap[order.external_order_id] = order;
    });

    // Categorize orders as new or updated
    const newOrders = [];
    const updatedOrders = [];

    orders.forEach(order => {
      const existing = existingOrdersMap[order.toast_order_id];

      if (!existing) {
        // New order - doesn't exist in database
        newOrders.push(order);
      } else {
        // Existing order - check for changes
        const hasChanges = (
          existing.customer_name !== order.customer_name ||
          existing.customer_phone !== order.customer_phone ||
          existing.customer_email !== order.customer_email ||
          existing.delivery_date !== order.delivery_date ||
          existing.delivery_time !== order.delivery_time ||
          existing.delivery_address !== order.delivery_address ||
          existing.delivery_notes !== order.delivery_notes ||
          existing.headcount !== order.headcount ||
          Math.abs(parseFloat(existing.total_amount) - parseFloat(order.total)) > 0.01 ||
          existing.status !== order.status
        );

        if (hasChanges) {
          updatedOrders.push({
            order: order,
            existing: existing,
            changes: detectChanges(existing, order)
          });
        }
      }
    });

    console.log(`✅ Found ${newOrders.length} new orders, ${updatedOrders.length} updated orders`);

    return res.status(200).json({
      success: true,
      data: {
        newOrders,
        updatedOrders,
        totalChecked: orders.length
      }
    });

  } catch (error) {
    console.error('❌ Error checking for updates:', error);

    return res.status(500).json({
      success: false,
      error: 'Failed to check for order updates',
      details: error.message
    });
  }
}

/**
 * Helper function to detect specific changes between orders
 */
function detectChanges(existing, updated) {
  const changes = [];

  if (existing.customer_name !== updated.customer_name) {
    changes.push({
      field: 'Customer Name',
      old: existing.customer_name,
      new: updated.customer_name
    });
  }

  if (existing.customer_phone !== updated.customer_phone) {
    changes.push({
      field: 'Phone',
      old: existing.customer_phone,
      new: updated.customer_phone
    });
  }

  if (existing.customer_email !== updated.customer_email) {
    changes.push({
      field: 'Email',
      old: existing.customer_email,
      new: updated.customer_email
    });
  }

  if (existing.delivery_date !== updated.delivery_date) {
    changes.push({
      field: 'Delivery Date',
      old: existing.delivery_date,
      new: updated.delivery_date
    });
  }

  if (existing.delivery_time !== updated.delivery_time) {
    changes.push({
      field: 'Delivery Time',
      old: existing.delivery_time,
      new: updated.delivery_time
    });
  }

  if (existing.delivery_address !== updated.delivery_address) {
    changes.push({
      field: 'Address',
      old: existing.delivery_address,
      new: updated.delivery_address
    });
  }

  if (existing.delivery_notes !== updated.delivery_notes) {
    changes.push({
      field: 'Delivery Notes',
      old: existing.delivery_notes,
      new: updated.delivery_notes
    });
  }

  if (existing.headcount !== updated.headcount) {
    changes.push({
      field: 'Headcount',
      old: existing.headcount,
      new: updated.headcount
    });
  }

  if (Math.abs(parseFloat(existing.total_amount) - parseFloat(updated.total)) > 0.01) {
    changes.push({
      field: 'Total Amount',
      old: `$${parseFloat(existing.total_amount).toFixed(2)}`,
      new: `$${parseFloat(updated.total).toFixed(2)}`
    });
  }

  if (existing.status !== updated.status) {
    changes.push({
      field: 'Status',
      old: existing.status,
      new: updated.status
    });
  }

  return changes;
}
