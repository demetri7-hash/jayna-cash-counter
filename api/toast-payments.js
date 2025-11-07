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
        
        const restaurantId = process.env.TOAST_RESTAURANT_GUID || 'd3efae34-7c2e-4107-a442-49081e624706';
        const toastApiUrl = process.env.TOAST_BASE_URL || 'https://ws-api.toasttab.com';

        console.log(`Starting cash calculation for business date: ${businessDate}`);

        // Step 1: Get ALL payment GUIDs for the business date (with pagination and retry logic)
        let allPaymentGuids = [];
        let page = 1;
        let hasMorePages = true;
        const pageSize = 100; // Toast default
        const maxRetries = 3; // Retry failed pages up to 3 times

        console.log(`Fetching payment GUIDs with pagination and retry logic...`);

        while (hasMorePages) {
            const paymentsUrl = `${toastApiUrl}/orders/v2/payments?paidBusinessDate=${businessDate}&pageSize=${pageSize}&page=${page}`;

            console.log(`Fetching page ${page}...`);

            let pageSuccess = false;
            let pageGuids = [];

            // Retry logic for each page
            for (let attempt = 1; attempt <= maxRetries && !pageSuccess; attempt++) {
                try {
                    if (attempt > 1) {
                        console.log(`Retry attempt ${attempt}/${maxRetries} for page ${page}...`);
                        // Exponential backoff: 500ms, 1000ms, 2000ms
                        await new Promise(resolve => setTimeout(resolve, 500 * attempt));
                    }

                    const paymentsResponse = await fetch(paymentsUrl, {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Toast-Restaurant-External-ID': restaurantId,
                            'Content-Type': 'application/json'
                        }
                    });

                    if (!paymentsResponse.ok) {
                        console.error(`Payment GUIDs fetch failed (attempt ${attempt}): ${paymentsResponse.status} ${paymentsResponse.statusText}`);
                        if (attempt === maxRetries) {
                            // Final attempt failed
                            const errorText = await paymentsResponse.text();
                            console.error('Error response:', errorText);
                            return res.status(paymentsResponse.status).json({
                                error: 'Failed to fetch payment GUIDs after retries',
                                details: errorText
                            });
                        }
                        continue; // Try again
                    }

                    pageGuids = await paymentsResponse.json();
                    pageSuccess = true;
                    console.log(`✅ Page ${page} success: Found ${pageGuids.length} payment GUIDs`);

                } catch (error) {
                    console.error(`Error fetching page ${page} (attempt ${attempt}):`, error.message);
                    if (attempt === maxRetries) {
                        return res.status(500).json({
                            error: 'Failed to fetch payment GUIDs after retries',
                            details: error.message
                        });
                    }
                }
            }

            // Process the successfully fetched page
            if (Array.isArray(pageGuids) && pageGuids.length > 0) {
                allPaymentGuids = allPaymentGuids.concat(pageGuids);

                // Check if there are more pages
                if (pageGuids.length === pageSize) {
                    page++;
                    // Rate limit protection between pages
                    await new Promise(resolve => setTimeout(resolve, 300));
                } else {
                    hasMorePages = false;
                }
            } else {
                hasMorePages = false;
            }

            // Safety limit
            if (page > 50) {
                console.warn(`Reached maximum page limit (50 pages = 5000 payments)`);
                hasMorePages = false;
            }
        }

        const paymentGuids = allPaymentGuids;
        console.log(`✅ Total payment GUIDs found across all pages: ${paymentGuids.length}`);
        
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
            const maxPaymentRetries = 2; // Retry individual payments up to 2 times
            let paymentSuccess = false;
            let paymentDetail = null;

            // Retry logic for individual payment detail fetch
            for (let attempt = 1; attempt <= maxPaymentRetries && !paymentSuccess; attempt++) {
                try {
                    if (attempt > 1) {
                        // Small backoff for retries: 200ms, 400ms
                        await new Promise(resolve => setTimeout(resolve, 200 * attempt));
                    }

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
                        if (attempt === maxPaymentRetries) {
                            console.error(`Failed to fetch payment ${paymentGuid} after ${maxPaymentRetries} attempts: ${paymentDetailResponse.status}`);
                            errorCount++;
                        }
                        continue; // Try again
                    }

                    paymentDetail = await paymentDetailResponse.json();
                    paymentSuccess = true;
                    processedCount++;

                } catch (error) {
                    if (attempt === maxPaymentRetries) {
                        console.error(`Error processing payment ${paymentGuid} after ${maxPaymentRetries} attempts:`, error.message);
                        errorCount++;
                    }
                }
            }

            // Process successfully fetched payment
            if (paymentSuccess && paymentDetail) {
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
            }

            // Add a small delay to avoid hitting rate limits
            if (processedCount % 10 === 0) {
                await new Promise(resolve => setTimeout(resolve, 100));
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