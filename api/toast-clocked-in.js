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

    // STEP 1: Fetch all employees (to get names)
    const employeesUrl = `${toastApiUrl}/labor/v1/employees`;

    console.log('Fetching employees list...');

    const employeesResponse = await fetch(employeesUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Toast-Restaurant-External-ID': restaurantId,
        'Content-Type': 'application/json'
      }
    });

    if (!employeesResponse.ok) {
      const errorText = await employeesResponse.text();
      console.error(`Failed to fetch employees: ${employeesResponse.status}`, errorText);
      return res.status(employeesResponse.status).json({
        error: 'Failed to fetch employees from Toast',
        details: errorText
      });
    }

    const employees = await employeesResponse.json();
    console.log(`Found ${employees.length} employees`);

    // Create employee map by GUID for fast lookup
    const employeeMap = {};
    employees.forEach(emp => {
      employeeMap[emp.guid] = emp;
    });

    // STEP 2: Fetch time entries
    const startDateTime = `${date}T00:00:00.000-0000`;
    const endDateTime = `${date}T23:59:59.999-0000`;
    const timeEntriesUrl = `${toastApiUrl}/labor/v1/timeEntries?startDate=${startDateTime}&endDate=${endDateTime}`;

    console.log(`Fetching time entries from: ${timeEntriesUrl}`);

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

    if (!Array.isArray(timeEntries)) {
      console.error('timeEntries is not an array:', typeof timeEntries);
      return res.status(500).json({
        error: 'Invalid response from Toast API',
        details: 'Time entries response is not an array'
      });
    }

    // STEP 3: Filter for currently clocked in (outDate is null)
    const clockedIn = timeEntries.filter(entry => {
      return entry.inDate && entry.outDate === null;
    });

    console.log(`Currently clocked in: ${clockedIn.length} employees`);

    // STEP 4: Match with employee details
    const clockedInEmployees = clockedIn.map(entry => {
      const empGuid = entry.employeeReference?.guid;
      const employee = employeeMap[empGuid] || {};

      const firstName = employee.firstName || '';
      const lastName = employee.lastName || '';
      const fullName = `${firstName} ${lastName}`.trim();

      return {
        firstName: firstName,
        lastName: lastName,
        fullName: fullName || 'Unknown',
        clockInTime: entry.inDate,
        jobReference: entry.jobReference?.name || 'Unknown',
        guid: empGuid
      };
    });

    return res.json({
      success: true,
      date: date,
      clockedIn: clockedInEmployees,
      count: clockedInEmployees.length,
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
