// Test script for cache-toast-sales cron job
// Run with: node test-sales-cron.js

import fetch from 'node-fetch';

async function testCronJob() {
  console.log('🧪 Testing Toast sales caching cron job...\n');

  try {
    // Call the deployed endpoint with cron header
    const response = await fetch('https://jayna-cash-counter.vercel.app/api/cron/cache-toast-sales', {
      method: 'GET',
      headers: {
        'x-vercel-cron': '1'  // Simulate Vercel cron request
      }
    });

    const result = await response.json();

    console.log('📊 Response Status:', response.status);
    console.log('📊 Response:', JSON.stringify(result, null, 2));

    if (result.success) {
      console.log('\n✅ SUCCESS! Sales data cached successfully.');
      console.log(`   Date: ${result.date}`);
      console.log(`   Duration: ${result.duration}`);
      console.log(`   Net Sales: $${result.summary.netSales.toFixed(2)}`);
      console.log(`   Credit Tips: $${result.summary.creditTips.toFixed(2)}`);
      console.log(`   Cash Sales: $${result.summary.cashSales.toFixed(2)}`);
    } else {
      console.log('\n❌ FAILED:', result.error);
    }

  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

testCronJob();
