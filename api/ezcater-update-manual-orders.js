/**
 * ONE-TIME FIX: Update manually imported orders to have correct source_type
 */

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'Supabase credentials not configured' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Orders that were manually imported today
    const manualOrderNumbers = ['RCE50F', 'M4C8GY', 'UJV9RP'];

    console.log(`🔧 Updating ${manualOrderNumbers.length} orders to ezCater_manual...`);

    // Update each order
    const results = [];
    for (const orderNumber of manualOrderNumbers) {
      const { data, error } = await supabase
        .from('catering_orders')
        .update({ source_type: 'ezCater_manual' })
        .eq('source_system', 'EZCATER')
        .eq('order_number', orderNumber)
        .select();

      if (error) {
        console.error(`❌ Error updating ${orderNumber}:`, error);
        results.push({ orderNumber, success: false, error: error.message });
      } else {
        console.log(`✅ Updated ${orderNumber} to ezCater_manual`);
        results.push({ orderNumber, success: true, updated: data });
      }
    }

    // Now check which orders remain as 'ezCater' (potentially webhook imports)
    const { data: webhookOrders, error: webhookError } = await supabase
      .from('catering_orders')
      .select('order_number, customer_name, delivery_date, created_at, source_type')
      .eq('source_system', 'EZCATER')
      .eq('source_type', 'ezCater')
      .order('created_at', { ascending: false });

    if (webhookError) {
      console.error('❌ Error checking webhook orders:', webhookError);
    }

    return res.json({
      success: true,
      message: 'Updated manual imports',
      updates: results,
      remaining_webhook_orders: webhookOrders || [],
      summary: {
        manual_imports_updated: results.filter(r => r.success).length,
        potential_webhook_imports: webhookOrders?.length || 0
      }
    });

  } catch (error) {
    console.error('❌ Error:', error);
    return res.status(500).json({
      error: error.message,
      stack: error.stack
    });
  }
}
