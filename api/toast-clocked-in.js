// Toast Clocked In Employees API - Returns currently clocked in employees
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
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
    const { date, token } = req.query;

    if (!date || !token) {
      return res.status(400).json({
        error: 'Missing required parameters: date and token'
      });
    }

    const restaurantId = process.env.TOAST_RESTAURANT_GUID || 'd3efae34-7c2e-4107-a442-49081e624706';
    const toastApiUrl = process.env.TOAST_BASE_URL || 'https://ws-api.toasttab.com';

    console.log(`Fetching clocked-in employees for ${date}`);

    // Date format per Toast docs: yyyy-MM-dd'T'HH:mm:ss.SSS-0000
    const startDateTime = `${date}T00:00:00.000-0000`;
    const endDateTime = `${date}T23:59:59.999-0000`;

    const timeEntriesUrl = `${toastApiUrl}/labor/v1/timeEntries?startDate=${startDateTime}&endDate=${endDateTime}`;

    console.log(`Fetching from: ${timeEntriesUrl}`);

    const timeEntriesResponse = await fetch(timeEntriesUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Toast-Restaurant-External-ID': restaurantId,
        'Content-Type': 'application/json'
      }
    });

    if (!timeEntriesResponse.ok) {
      const errorText = await timeEntriesResponse.text();
      console.error(`Failed to fetch time entries: ${timeEntriesResponse.status}`, errorText);
      return res.status(timeEntriesResponse.status).json({
        error: 'Failed to fetch time entries from Toast',
        details: errorText
      });
    }

    const timeEntries = await timeEntriesResponse.json();
    console.log(`Found ${timeEntries.length} time entries`);

    // Validate response structure
    if (!Array.isArray(timeEntries)) {
      console.error('timeEntries is not an array:', typeof timeEntries);
      return res.status(500).json({
        error: 'Invalid response from Toast API',
        details: 'Time entries response is not an array'
      });
    }

    // Filter for currently clocked in (outDate is null)
    const clockedIn = timeEntries.filter(entry => {
      return entry.inDate && entry.outDate === null;
    });

    console.log(`Currently clocked in: ${clockedIn.length} employees`);

    // Extract employee names and details
    const employees = clockedIn.map(entry => {
      const emp = entry.employeeReference || {};
      return {
        firstName: emp.firstName || '',
        lastName: emp.lastName || '',
        fullName: `${emp.firstName || ''} ${emp.lastName || ''}`.trim(),
        clockInTime: entry.inDate,
        jobReference: entry.jobReference?.name || 'Unknown'
      };
    });

    return res.json({
      success: true,
      date: date,
      clockedIn: employees,
      count: employees.length,
      totalTimeEntries: timeEntries.length
    });

  } catch (error) {
    console.error('Toast clocked-in API error:', error);
    console.error('Error stack:', error.stack);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message,
      stack: error.stack
    });
  }
}
