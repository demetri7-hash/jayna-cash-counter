// Analyze invoice patterns and generate ordering suggestions
// This endpoint processes historical invoice data to identify:
// - Ordering frequency per vendor
// - Average quantities per item
// - Seasonal trends
// - Suggested order quantities based on usage patterns

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { vendorId, startDate, endDate, itemId } = req.body;

    // Connect to Supabase
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_KEY
    );

    // Fetch invoice data for the vendor within date range
    let query = supabase
      .from('invoice_archive')
      .select('*')
      .order('invoice_date', { ascending: true });

    if (vendorId) {
      query = query.eq('vendor_id', vendorId);
    }

    if (startDate) {
      query = query.gte('invoice_date', startDate);
    }

    if (endDate) {
      query = query.lte('invoice_date', endDate);
    }

    const { data: invoices, error } = await query;

    if (error) throw error;

    // Analyze ordering patterns
    const analysis = analyzeOrderingPatterns(invoices);

    // Get current inventory levels
    const { data: inventory, error: invError } = await supabase
      .from('inventory_items')
      .select('*')
      .order('category', { ascending: true });

    if (invError) throw invError;

    // Generate ordering suggestions
    const suggestions = generateOrderSuggestions(analysis, inventory);

    return res.status(200).json({
      success: true,
      analysis,
      suggestions,
      invoiceCount: invoices.length
    });

  } catch (error) {
    console.error('Invoice analysis error:', error);
    return res.status(500).json({
      error: 'Failed to analyze invoices',
      details: error.message
    });
  }
}

function analyzeOrderingPatterns(invoices) {
  const patterns = {
    totalInvoices: invoices.length,
    dateRange: {
      start: invoices[0]?.invoice_date || null,
      end: invoices[invoices.length - 1]?.invoice_date || null
    },
    totalSpent: 0,
    averageInvoiceAmount: 0,
    vendorBreakdown: {},
    frequencyByVendor: {},
    itemFrequency: {}
  };

  // Calculate totals and vendor breakdown
  invoices.forEach(invoice => {
    const amount = parseFloat(invoice.total_amount) || 0;
    patterns.totalSpent += amount;

    const vendor = invoice.vendor_name;
    if (!patterns.vendorBreakdown[vendor]) {
      patterns.vendorBreakdown[vendor] = {
        count: 0,
        totalSpent: 0,
        invoices: []
      };
    }

    patterns.vendorBreakdown[vendor].count++;
    patterns.vendorBreakdown[vendor].totalSpent += amount;
    patterns.vendorBreakdown[vendor].invoices.push({
      date: invoice.invoice_date,
      amount: amount,
      invoiceNumber: invoice.invoice_number
    });
  });

  patterns.averageInvoiceAmount = patterns.totalSpent / patterns.totalInvoices || 0;

  // Calculate ordering frequency (days between orders)
  Object.keys(patterns.vendorBreakdown).forEach(vendor => {
    const vendorInvoices = patterns.vendorBreakdown[vendor].invoices;

    if (vendorInvoices.length > 1) {
      const dates = vendorInvoices.map(inv => new Date(inv.date)).sort((a, b) => a - b);
      const intervals = [];

      for (let i = 1; i < dates.length; i++) {
        const daysDiff = (dates[i] - dates[i - 1]) / (1000 * 60 * 60 * 24);
        intervals.push(daysDiff);
      }

      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;

      patterns.frequencyByVendor[vendor] = {
        averageDaysBetweenOrders: Math.round(avgInterval),
        orderCount: vendorInvoices.length,
        intervals: intervals
      };
    }
  });

  return patterns;
}

function generateOrderSuggestions(analysis, inventory) {
  const suggestions = [];

  // For each inventory item, generate a suggestion
  inventory.forEach(item => {
    const suggestion = {
      itemId: item.id,
      itemName: item.item_name,
      category: item.category,
      currentStock: item.current_on_hand || 0,
      parLevel: item.par_level || 0,
      suggestedOrderQty: 0,
      urgency: 'normal',
      reasoning: []
    };

    // Calculate suggested quantity based on par level
    if (item.par_level && item.current_on_hand !== null) {
      const deficit = item.par_level - item.current_on_hand;

      if (deficit > 0) {
        suggestion.suggestedOrderQty = deficit;
        suggestion.reasoning.push(`${deficit} units needed to reach par level of ${item.par_level}`);

        // Set urgency
        const stockPercentage = (item.current_on_hand / item.par_level) * 100;
        if (stockPercentage < 25) {
          suggestion.urgency = 'critical';
          suggestion.reasoning.push('CRITICAL: Stock below 25% of par');
        } else if (stockPercentage < 50) {
          suggestion.urgency = 'high';
          suggestion.reasoning.push('Stock below 50% of par');
        }
      } else {
        suggestion.reasoning.push('Stock at or above par level');
      }
    } else {
      suggestion.reasoning.push('No par level set or stock data unavailable');
    }

    // Check vendor ordering frequency
    if (item.vendor_name && analysis.frequencyByVendor[item.vendor_name]) {
      const freq = analysis.frequencyByVendor[item.vendor_name];
      suggestion.reasoning.push(`Vendor orders every ${freq.averageDaysBetweenOrders} days on average`);
    }

    suggestions.push(suggestion);
  });

  // Sort by urgency
  const urgencyOrder = { 'critical': 0, 'high': 1, 'normal': 2 };
  suggestions.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);

  return suggestions;
}
