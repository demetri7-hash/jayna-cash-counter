// Get order alerts for today and upcoming orders
// Returns which vendors need orders today based on their schedule

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { date } = req.query;
    const checkDate = date || new Date().toISOString().split('T')[0];
    const dayOfWeek = getDayOfWeek(checkDate);

    // Connect to Supabase
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_KEY
    );

    // Get all active order schedules for today
    const { data: schedules, error } = await supabase
      .from('order_schedules')
      .select(`
        *,
        vendors (
          vendor_name,
          order_method,
          order_cutoff_time,
          rep_name,
          rep_phone,
          order_url,
          special_notes,
          priority
        )
      `)
      .eq('order_day', dayOfWeek)
      .eq('active', true);

    if (error) throw error;

    // Get vendors with no schedule (need to be checked manually)
    const { data: allVendors, error: vendorError } = await supabase
      .from('vendors')
      .select('*')
      .eq('active', true);

    if (vendorError) throw vendorError;

    // Find vendors without order schedules
    const scheduledVendorIds = new Set(schedules.map(s => s.vendor_id));
    const unscheduledVendors = allVendors.filter(v => !scheduledVendorIds.has(v.id) && !v.order_days);

    // Format alerts
    const alerts = schedules.map(schedule => ({
      vendorId: schedule.vendor_id,
      vendorName: schedule.vendor_name,
      orderDay: schedule.order_day,
      cutoffTime: schedule.order_cutoff_time,
      deliveryDay: schedule.delivery_day,
      orderMethod: schedule.vendors?.order_method,
      repName: schedule.vendors?.rep_name,
      repPhone: schedule.vendors?.rep_phone,
      orderUrl: schedule.vendors?.order_url,
      specialNotes: schedule.vendors?.special_notes,
      priority: schedule.vendors?.priority || 'normal',
      timeUntilCutoff: calculateTimeUntilCutoff(schedule.order_cutoff_time)
    }));

    // Sort by priority and time until cutoff
    alerts.sort((a, b) => {
      const priorityOrder = { 'high': 0, 'normal': 1, 'low': 2 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return (a.timeUntilCutoff || 999) - (b.timeUntilCutoff || 999);
    });

    // Get upcoming orders (next 3 days)
    const upcomingAlerts = [];
    for (let i = 1; i <= 3; i++) {
      const futureDate = new Date(checkDate);
      futureDate.setDate(futureDate.getDate() + i);
      const futureDayName = getDayOfWeek(futureDate.toISOString().split('T')[0]);

      const { data: futureSchedules } = await supabase
        .from('order_schedules')
        .select('*, vendors (vendor_name, order_cutoff_time, priority)')
        .eq('order_day', futureDayName)
        .eq('active', true);

      if (futureSchedules) {
        futureSchedules.forEach(schedule => {
          upcomingAlerts.push({
            date: futureDate.toISOString().split('T')[0],
            dayName: futureDayName,
            vendorName: schedule.vendor_name,
            cutoffTime: schedule.order_cutoff_time,
            priority: schedule.vendors?.priority || 'normal',
            daysAway: i
          });
        });
      }
    }

    return res.status(200).json({
      success: true,
      date: checkDate,
      dayOfWeek: dayOfWeek,
      todayAlerts: alerts,
      upcomingAlerts: upcomingAlerts,
      unscheduledVendors: unscheduledVendors.map(v => ({
        id: v.id,
        name: v.vendor_name,
        notes: v.special_notes
      }))
    });

  } catch (error) {
    console.error('Order alerts error:', error);
    return res.status(500).json({
      error: 'Failed to fetch order alerts',
      details: error.message
    });
  }
}

function getDayOfWeek(dateString) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const date = new Date(dateString + 'T12:00:00'); // Add time to avoid timezone issues
  return days[date.getDay()];
}

function calculateTimeUntilCutoff(cutoffTime) {
  if (!cutoffTime) return null;

  try {
    const now = new Date();
    const [time, period] = cutoffTime.split(' ');
    let [hours, minutes] = time.split(':').map(Number);

    if (period === 'PM' && hours !== 12) {
      hours += 12;
    } else if (period === 'AM' && hours === 12) {
      hours = 0;
    }

    const cutoff = new Date();
    cutoff.setHours(hours, minutes || 0, 0, 0);

    const diffMs = cutoff - now;
    const diffHours = diffMs / (1000 * 60 * 60);

    return diffHours > 0 ? diffHours : -1; // Negative means cutoff has passed
  } catch (e) {
    return null;
  }
}
