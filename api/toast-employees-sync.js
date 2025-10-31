/**
 * Vercel Serverless Function: Sync Employees from Toast POS to Database
 * Fetches all employees from Toast Labor API and upserts to Supabase
 * Endpoint: GET/POST /api/toast-employees-sync
 */

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('👥 Syncing employees from Toast POS to database...');

    // Initialize Supabase
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Toast API credentials
    const TOAST_BASE_URL = 'https://ws-api.toasttab.com';
    const TOAST_RESTAURANT_GUID = process.env.TOAST_RESTAURANT_GUID;
    const TOAST_CLIENT_ID = process.env.TOAST_CLIENT_ID;
    const TOAST_CLIENT_SECRET = process.env.TOAST_CLIENT_SECRET;

    if (!TOAST_CLIENT_ID || !TOAST_CLIENT_SECRET || !TOAST_RESTAURANT_GUID) {
      throw new Error('Toast API credentials not configured');
    }

    // Get OAuth token
    console.log('🔐 Authenticating with Toast API...');
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

    // Fetch employees from Toast Labor API
    console.log(`📡 Fetching employees from Toast API...`);
    const response = await fetch(`${TOAST_BASE_URL}/labor/v1/employees?restaurantGuid=${TOAST_RESTAURANT_GUID}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Toast-Restaurant-External-ID': TOAST_RESTAURANT_GUID,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Toast API Error:', errorText);
      throw new Error(`Toast API request failed: ${response.status} ${response.statusText}`);
    }

    const employees = await response.json();

    if (!Array.isArray(employees)) {
      throw new Error('Toast API returned invalid data format');
    }

    console.log(`✅ Fetched ${employees.length} employees from Toast`);

    // Process each employee and upsert to Supabase
    let syncedCount = 0;
    let errorCount = 0;
    const errors = [];
    const syncedEmployees = [];

    for (const emp of employees) {
      try {
        // Extract employee data
        const employeeData = {
          toast_guid: emp.guid,
          first_name: emp.firstName || null,
          last_name: emp.lastName || null,
          chosen_name: emp.chosenName || null,
          email: emp.email || null,
          phone: emp.phoneNumber || emp.phoneEmail || null,
          external_employee_id: emp.externalEmployeeId || null,
          job_title: extractJobTitle(emp),
          job_guid: extractJobGuid(emp),
          hourly_wage: extractHourlyWage(emp),
          // Active if NOT deleted AND NOT disabled
          is_active: (emp.deleted === false || emp.deletedDate === null) &&
                     (emp.disabled === false || emp.disabled === null),
          last_synced_from_toast: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        // Upsert to Supabase (update if exists, insert if new)
        const { data, error } = await supabase
          .from('employees')
          .upsert(employeeData, {
            onConflict: 'toast_guid',
            ignoreDuplicates: false
          })
          .select()
          .single();

        if (error) {
          console.error(`❌ Error syncing employee ${emp.firstName} ${emp.lastName}:`, error);
          errorCount++;
          errors.push({
            employee: `${emp.firstName} ${emp.lastName}`,
            error: error.message
          });
        } else {
          syncedCount++;
          syncedEmployees.push({
            id: data.id,
            name: `${data.first_name} ${data.last_name}`.trim(),
            job_title: data.job_title,
            is_active: data.is_active
          });
          console.log(`✅ Synced: ${data.first_name} ${data.last_name} (${data.job_title})`);
        }

      } catch (empError) {
        console.error(`❌ Error processing employee:`, empError);
        errorCount++;
        errors.push({
          employee: `${emp.firstName} ${emp.lastName}`,
          error: empError.message
        });
      }
    }

    console.log(`\n📊 Sync Summary:`);
    console.log(`   ✅ Successfully synced: ${syncedCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);

    return res.status(200).json({
      success: true,
      message: `Employee sync completed`,
      total_employees: employees.length,
      synced: syncedCount,
      errors: errorCount,
      error_details: errors.length > 0 ? errors : undefined,
      employees: syncedEmployees, // Return synced employee list
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Employee sync error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to sync employees from Toast',
      details: error.message
    });
  }
}

/**
 * Extract primary job title from employee's job references
 */
function extractJobTitle(employee) {
  if (!employee.jobReferences || employee.jobReferences.length === 0) {
    return 'Staff';
  }

  // Get first job (primary job)
  const primaryJob = employee.jobReferences[0];
  return primaryJob.jobName || 'Staff';
}

/**
 * Extract job GUID from employee's job references
 */
function extractJobGuid(employee) {
  if (!employee.jobReferences || employee.jobReferences.length === 0) {
    return null;
  }

  const primaryJob = employee.jobReferences[0];
  return primaryJob.guid || null;
}

/**
 * Extract hourly wage from employee data
 * Note: Toast may not always provide wage data depending on permissions
 */
function extractHourlyWage(employee) {
  if (!employee.jobReferences || employee.jobReferences.length === 0) {
    return null;
  }

  const primaryJob = employee.jobReferences[0];

  // Check various possible wage fields
  if (primaryJob.wage) return parseFloat(primaryJob.wage);
  if (primaryJob.hourlyWage) return parseFloat(primaryJob.hourlyWage);
  if (primaryJob.wageCents) return parseFloat(primaryJob.wageCents) / 100;

  return null; // Wage not available
}
