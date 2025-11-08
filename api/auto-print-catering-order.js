/**
 * Auto-Print Catering Order
 * Automatically prints both Order PDF and Prep List PDF when a new catering order is added
 * Called by webhook handlers and manual import functions
 */

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
    const { order_id, source_system } = req.body;

    if (!order_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing order_id parameter'
      });
    }

    console.log(`🖨️ AUTO-PRINT: Starting auto-print for order ${order_id} (${source_system || 'UNKNOWN'})...`);

    const results = {
      order_id,
      source_system,
      order_print: null,
      prep_list_print: null,
      timestamp: new Date().toISOString()
    };

    // STEP 1: Print Order PDF
    try {
      console.log(`📄 Printing order PDF for ${order_id}...`);

      const orderResponse = await fetch(`${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}/api/print-toast-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ order_id })
      });

      const orderResult = await orderResponse.json();

      if (orderResult.success) {
        console.log(`✅ Order PDF sent to printer: ${orderResult.messageId}`);
        results.order_print = {
          success: true,
          messageId: orderResult.messageId
        };
      } else {
        console.error(`❌ Order PDF print failed: ${orderResult.error}`);
        results.order_print = {
          success: false,
          error: orderResult.error
        };
      }
    } catch (error) {
      console.error(`❌ Error printing order PDF:`, error);
      results.order_print = {
        success: false,
        error: error.message
      };
    }

    // STEP 2: Print Prep List PDF
    try {
      console.log(`📋 Printing prep list PDF for ${order_id}...`);

      const prepResponse = await fetch(`${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}/api/print-prep-list-new`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ order_id })
      });

      const prepResult = await prepResponse.json();

      if (prepResult.success) {
        console.log(`✅ Prep list PDF sent to printer: ${prepResult.messageId}`);
        results.prep_list_print = {
          success: true,
          messageId: prepResult.messageId
        };
      } else {
        console.error(`❌ Prep list PDF print failed: ${prepResult.error}`);
        results.prep_list_print = {
          success: false,
          error: prepResult.error
        };
      }
    } catch (error) {
      console.error(`❌ Error printing prep list PDF:`, error);
      results.prep_list_print = {
        success: false,
        error: error.message
      };
    }

    // SUMMARY
    const bothSucceeded = results.order_print?.success && results.prep_list_print?.success;
    const oneSucceeded = results.order_print?.success || results.prep_list_print?.success;

    if (bothSucceeded) {
      console.log(`✅ AUTO-PRINT COMPLETE: Both PDFs sent to printer for order ${order_id}`);
      return res.json({
        success: true,
        message: 'Both order and prep list sent to printer successfully',
        results
      });
    } else if (oneSucceeded) {
      console.log(`⚠️  AUTO-PRINT PARTIAL: Only one PDF sent successfully for order ${order_id}`);
      return res.json({
        success: true,
        message: 'Partial success - only one PDF sent to printer',
        results
      });
    } else {
      console.log(`❌ AUTO-PRINT FAILED: Both PDFs failed for order ${order_id}`);
      return res.json({
        success: false,
        message: 'Both prints failed',
        results
      });
    }

  } catch (error) {
    console.error('❌ Auto-print error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
}
