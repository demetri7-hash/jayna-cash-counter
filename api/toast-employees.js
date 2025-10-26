/**
 * Vercel Serverless Function: Fetch Toast Employees
 * Returns list of all employees for autocomplete in incident reports
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const TOAST_BASE_URL = 'https://ws-api.toasttab.com';
    const TOAST_RESTAURANT_GUID = process.env.TOAST_RESTAURANT_GUID;
    const TOAST_CLIENT_ID = process.env.TOAST_CLIENT_ID;
    const TOAST_CLIENT_SECRET = process.env.TOAST_CLIENT_SECRET;

    console.log('📋 Fetching employees from Toast POS...');

    // Get OAuth token
    const tokenResponse = await fetch('https://ws-api.toasttab.com/authentication/v1/authentication/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${TOAST_CLIENT_ID}:${TOAST_CLIENT_SECRET}`).toString('base64')}`
      },
      body: JSON.stringify({
        clientId: TOAST_CLIENT_ID,
        clientSecret: TOAST_CLIENT_SECRET,
        userAccessType: 'TOAST_MACHINE_CLIENT'
      })
    });

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.token?.accessToken;

    if (!accessToken) {
      throw new Error('Failed to get Toast access token');
    }

    // Fetch employees
    const response = await fetch(`${TOAST_BASE_URL}/labor/v1/employees?restaurantGuid=${TOAST_RESTAURANT_GUID}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Toast-Restaurant-External-ID': TOAST_RESTAURANT_GUID,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Toast API error: ${response.status}`);
    }

    const employees = await response.json();

    // Extract employee names (active employees only)
    const employeeNames = employees
      .filter(emp => emp.deletedDate === null && emp.chosenName) // Only active employees with names
      .map(emp => ({
        name: emp.chosenName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim(),
        guid: emp.guid,
        jobTitle: emp.jobTitle || null
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    console.log(`✅ Found ${employeeNames.length} active employees`);

    return res.status(200).json({
      success: true,
      employees: employeeNames
    });

  } catch (error) {
    console.error('❌ Error fetching employees:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch employees',
      details: error.message
    });
  }
}
