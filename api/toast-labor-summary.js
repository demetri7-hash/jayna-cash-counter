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
    const { startDate, endDate, token } = req.query;

    if (!startDate || !endDate || !token) {
      return res.status(400).json({
        error: 'Missing required parameters: startDate, endDate, and token'
      });
    }

    const restaurantId = process.env.TOAST_RESTAURANT_GUID || 'd3efae34-7c2e-4107-a442-49081e624706';
    const toastApiUrl = process.env.TOAST_BASE_URL || 'https://ws-api.toasttab.com';

    console.log(`Fetching labor summary for ${startDate} to ${endDate}`);

    // Step 1: Fetch all employees
    console.log('Fetching employees...');
    const employeesUrl = `${toastApiUrl}/labor/v1/employees`;

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
        error: 'Failed to fetch employees',
        details: errorText
      });
    }

    const employees = await employeesResponse.json();
    console.log(`Found ${employees.length} employees`);

    // Validate employees response
    if (!Array.isArray(employees)) {
      console.error('employees is not an array:', typeof employees, employees);
      return res.status(500).json({
        error: 'Invalid response from Toast API',
        details: 'Employees response is not an array'
      });
    }

    // Step 2: Fetch time entries for date range
    console.log('Fetching time entries...');

    // Convert dates to Toast API format: yyyy-MM-dd'T'HH:mm:ss.SSS-0000
    // Example from Toast docs: 2018-11-14T01:00:00.000-0000
    const startDateTime = `${startDate}T00:00:00.000-0000`;
    const endDateTime = `${endDate}T23:59:59.999-0000`;

    console.log(`Requesting time entries from ${startDateTime} to ${endDateTime}`);

    const timeEntriesUrl = `${toastApiUrl}/labor/v1/timeEntries?startDate=${startDateTime}&endDate=${endDateTime}`;

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
      console.error(`Request URL was: ${timeEntriesUrl}`);
      return res.status(timeEntriesResponse.status).json({
        error: 'Failed to fetch time entries',
        details: errorText,
        requestUrl: timeEntriesUrl
      });
    }

    const timeEntries = await timeEntriesResponse.json();
    console.log(`Found ${timeEntries.length} time entries`);

    // Validate response structure
    if (!Array.isArray(timeEntries)) {
      console.error('timeEntries is not an array:', typeof timeEntries, timeEntries);
      return res.status(500).json({
        error: 'Invalid response from Toast API',
        details: 'Time entries response is not an array'
      });
    }

    // Step 3: Aggregate labor by employee
    const laborMap = {};
    let debugSample = 0;

    timeEntries.forEach(entry => {
      if (!entry.employeeReference || !entry.employeeReference.guid) {
        return;
      }

      const empGuid = entry.employeeReference.guid;
      const regHours = parseFloat(entry.regularHours) || 0;
      const otHours = parseFloat(entry.overtimeHours) || 0;
      const wage = parseFloat(entry.hourlyWage) || 0;

      // DEBUG: Log first few entries to understand wage structure AND all available fields
      if (debugSample < 3 && (regHours > 0 || otHours > 0)) {
        console.log(`\n=== TIME ENTRY DEBUG #${debugSample + 1} - ALL FIELDS ===`);
        console.log(JSON.stringify(entry, null, 2));
        console.log('Calculated values:', {
          regularPay: regHours * wage,
          overtimePay_at_1_5x: otHours * wage * 1.5,
          overtimePay_at_2x: otHours * wage * 2
        });
        debugSample++;
      }

      if (!laborMap[empGuid]) {
        laborMap[empGuid] = {
          hours: 0,
          regularHours: 0,
          overtimeHours: 0,
          totalPay: 0
        };
      }

      laborMap[empGuid].regularHours += regHours;
      laborMap[empGuid].overtimeHours += otHours;
      laborMap[empGuid].hours += regHours + otHours;

      // Calculate pay: regular hours at base rate, overtime at 1.5x
      laborMap[empGuid].totalPay += (regHours * wage) + (otHours * wage * 1.5);
    });

    // Step 4: Match with employee names and build result
    const result = [];
    let totalLaborCost = 0;

    employees.forEach(emp => {
      const labor = laborMap[emp.guid];

      // Only include employees with hours worked in this period
      if (labor && labor.hours > 0) {
        const firstName = emp.firstName || '';
        const lastName = emp.lastName || '';
        const employeeFullName = `${lastName}, ${firstName}`.trim();

        result.push({
          employee: employeeFullName,
          first: firstName,
          last: lastName,
          hours: parseFloat(labor.hours.toFixed(2)),
          regularHours: parseFloat(labor.regularHours.toFixed(2)),
          overtimeHours: parseFloat(labor.overtimeHours.toFixed(2)),
          totalPay: parseFloat(labor.totalPay.toFixed(2))
        });

        totalLaborCost += labor.totalPay;
      }
    });

    // Sort by last name
    result.sort((a, b) => a.last.localeCompare(b.last));

    // Add total labor cost to result array (like parsePayrollCSV does)
    result.totalLaborCost = parseFloat(totalLaborCost.toFixed(2));

    // Calculate OT discrepancy for debugging
    let totalRegularHours = 0;
    let totalOvertimeHours = 0;
    result.forEach(emp => {
      totalRegularHours += emp.regularHours;
      totalOvertimeHours += emp.overtimeHours;
    });

    console.log(`Labor Summary Complete:`);
    console.log(`- Employees with hours: ${result.length}`);
    console.log(`- Total Regular Hours: ${totalRegularHours.toFixed(2)}`);
    console.log(`- Total Overtime Hours: ${totalOvertimeHours.toFixed(2)}`);
    console.log(`- Total Labor Cost: $${totalLaborCost.toFixed(2)}`);

    return res.json({
      success: true,
      dateRange: {
        start: startDate,
        end: endDate
      },
      employees: result,
      totalLaborCost: result.totalLaborCost,
      employeesCount: result.length,
      timeEntriesProcessed: timeEntries.length,
      debug: {
        totalRegularHours: parseFloat(totalRegularHours.toFixed(2)),
        totalOvertimeHours: parseFloat(totalOvertimeHours.toFixed(2)),
        message: 'Check Vercel logs for TIME ENTRY DEBUG details'
      }
    });

  } catch (error) {
    console.error('Toast labor summary API error:', error);
    console.error('Error stack:', error.stack);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message,
      stack: error.stack
    });
  }
}
