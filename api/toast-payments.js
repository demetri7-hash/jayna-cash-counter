export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const { businessDate, token } = req.query;
        
        if (!businessDate || !token) {
            return res.status(400).json({ 
                error: 'Missing required parameters: businessDate and token' 
            });
        }
        
        const restaurantId = process.env.TOAST_RESTAURANT_ID;
        const toastApiUrl = process.env.TOAST_API_URL;
        
        if (!restaurantId || !toastApiUrl) {
            return res.status(500).json({ 
                error: 'Missing Toast API configuration' 
            });
        }
        
        console.log(`Starting cash calculation for business date: ${businessDate}`);
        
        // Step 1: Get payment GUIDs for the business date
        const paymentsUrl = `${toastApiUrl}/orders/v2/payments?paidBusinessDate=${businessDate}`;
        
        console.log(`Fetching payment GUIDs from: ${paymentsUrl}`);
        
        const paymentsResponse = await fetch(paymentsUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Toast-Restaurant-External-ID': restaurantId,
                'Content-Type': 'application/json'
            }
        });
        
        if (!paymentsResponse.ok) {
            console.error(`Payment GUIDs fetch failed: ${paymentsResponse.status} ${paymentsResponse.statusText}`);
            const errorText = await paymentsResponse.text();
            console.error('Error response:', errorText);
            return res.status(paymentsResponse.status).json({ 
                error: 'Failed to fetch payment GUIDs',
                details: errorText 
            });
        }
        
        const paymentGuids = await paymentsResponse.json();
        console.log(`Found ${paymentGuids.length} payment GUIDs`);
        
        if (paymentGuids.length === 0) {
            return res.json({
                success: true,
                businessDate: businessDate,
                totalPaymentGuids: 0,
                totalCashPayments: 0,
                totalCashAmount: 0,
                cashPayments: [],
                message: 'No payments found for this business date'
            });
        }
        
        // Step 2: Fetch individual payment details and filter for cash payments
        let cashPayments = [];
        let totalCashAmount = 0;
        let processedCount = 0;
        let errorCount = 0;
        
        console.log('Starting to fetch individual payment details...');
        
        for (const paymentGuid of paymentGuids) {
            try {
                const paymentDetailUrl = `${toastApiUrl}/orders/v2/payments/${paymentGuid}`;
                
                const paymentDetailResponse = await fetch(paymentDetailUrl, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Toast-Restaurant-External-ID': restaurantId,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!paymentDetailResponse.ok) {
                    console.error(`Failed to fetch payment ${paymentGuid}: ${paymentDetailResponse.status}`);
                    errorCount++;
                    continue;
                }
                
                const paymentDetail = await paymentDetailResponse.json();
                processedCount++;
                
                // Filter for cash payments that are not voided
                if (paymentDetail.type === 'CASH' && paymentDetail.paymentStatus !== 'VOIDED') {
                    const amount = paymentDetail.amount || 0;
                    const tipAmount = paymentDetail.tipAmount || 0;
                    const totalAmount = amount + tipAmount;
                    
                    cashPayments.push({
                        guid: paymentDetail.guid,
                        amount: amount,
                        tipAmount: tipAmount,
                        totalAmount: totalAmount,
                        paidDate: paymentDetail.paidDate,
                        paymentStatus: paymentDetail.paymentStatus,
                        orderGuid: paymentDetail.orderGuid,
                        checkGuid: paymentDetail.checkGuid
                    });
                    
                    totalCashAmount += totalAmount;
                    console.log(`Cash payment found: $${totalAmount} (Payment: $${amount}, Tip: $${tipAmount})`);
                }
                
                // Add a small delay to avoid hitting rate limits
                if (processedCount % 10 === 0) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
                
            } catch (error) {
                console.error(`Error processing payment ${paymentGuid}:`, error);
                errorCount++;
            }
        }
        
        console.log(`Payment processing complete: ${processedCount} processed, ${errorCount} errors`);
        console.log(`Total cash amount: $${totalCashAmount}`);
        
        return res.json({
            success: true,
            businessDate: businessDate,
            totalPaymentGuids: paymentGuids.length,
            processedPayments: processedCount,
            errorCount: errorCount,
            totalCashPayments: cashPayments.length,
            totalCashAmount: totalCashAmount,
            cashPayments: cashPayments
        });
        
    } catch (error) {
        console.error('Toast payments API error:', error);
        return res.status(500).json({ 
            error: 'Internal server error',
            details: error.message 
        });
    }
}