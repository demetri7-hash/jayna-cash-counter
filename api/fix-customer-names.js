/**
 * Fix customer names for existing EZCater orders
 * Extracts from event.contact.name field
 */

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🔧 Fixing customer names for EZCater orders...');

    // Get all EZCater orders with null customer_name
    const { data: orders, error: fetchError } = await supabase
      .from('catering_orders')
      .select('id, order_number, customer_name, order_data')
      .eq('source_system', 'EZCATER')
      .is('customer_name', null);

    if (fetchError) throw fetchError;

    console.log(`Found ${orders.length} orders with missing customer names`);

    const updates = [];

    for (const order of orders) {
      const contactName = order.order_data?.event?.contact?.name;

      if (contactName) {
        console.log(`  Updating order ${order.order_number}: ${contactName}`);

        const { error: updateError } = await supabase
          .from('catering_orders')
          .update({ customer_name: contactName })
          .eq('id', order.id);

        if (updateError) {
          console.error(`  ❌ Failed to update ${order.order_number}:`, updateError);
          updates.push({ order_number: order.order_number, success: false, error: updateError.message });
        } else {
          updates.push({ order_number: order.order_number, success: true, customer_name: contactName });
        }
      } else {
        console.log(`  ⚠️  No contact name found for order ${order.order_number}`);
        updates.push({ order_number: order.order_number, success: false, error: 'No contact name in order data' });
      }
    }

    const successCount = updates.filter(u => u.success).length;
    console.log(`✅ Updated ${successCount}/${orders.length} orders`);

    return res.status(200).json({
      success: true,
      message: `Fixed customer names for ${successCount}/${orders.length} orders`,
      updates: updates,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
