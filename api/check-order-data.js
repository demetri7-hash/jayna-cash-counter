/**
 * Check what data is stored for a specific order
 */

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get both orders to compare
    const { data: orders, error } = await supabase
      .from('catering_orders')
      .select('id, order_number, customer_name, order_data')
      .eq('source_system', 'EZCATER')
      .order('created_at', { ascending: false })
      .limit(2);

    if (error) throw error;

    return res.status(200).json({
      success: true,
      orders: orders.map(o => ({
        id: o.id,
        order_number: o.order_number,
        customer_name: o.customer_name,
        orderCustomer: o.order_data?.orderCustomer,
        contact: o.order_data?.event?.contact
      })),
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
