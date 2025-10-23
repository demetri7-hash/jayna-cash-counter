/**
 * Local Script: Backfill Calendar Events
 * Run with: node scripts/backfill-calendar-local.js
 */

import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';

// Credentials (you'll paste these from your .env)
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const GOOGLE_CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function backfillCalendarEvents() {
  try {
    console.log('🔄 Starting calendar events backfill...');

    // Fetch all photos without calendar events
    const { data: photos, error: fetchError } = await supabase
      .from('catering_photos')
      .select('*')
      .is('calendar_event_id', null)
      .not('order_due_date', 'is', null)
      .not('time_due', 'is', null)
      .order('order_due_date', { ascending: true });

    if (fetchError) {
      throw new Error(`Database fetch error: ${fetchError.message}`);
    }

    if (!photos || photos.length === 0) {
      console.log('✅ No photos found that need calendar events');
      return;
    }

    console.log(`📸 Found ${photos.length} photos without calendar events`);

    // Authenticate with Google Calendar
    const formattedPrivateKey = GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');

    const auth = new google.auth.JWT({
      email: GOOGLE_CLIENT_EMAIL,
      key: formattedPrivateKey,
      scopes: ['https://www.googleapis.com/auth/calendar']
    });

    const calendar = google.calendar({ version: 'v3', auth });

    // Process each photo
    let succeeded = 0;
    let failed = 0;

    for (const photo of photos) {
      try {
        // Count same-day orders
        const { data: sameDayOrders } = await supabase
          .from('catering_photos')
          .select('id')
          .eq('order_due_date', photo.order_due_date)
          .lte('id', photo.id)
          .order('id', { ascending: true });

        const orderNumber = `Order #${sameDayOrders?.length || 1}`;

        // Determine event time
        let eventTime = (photo.order_type === 'DELIVERY' && photo.leave_jayna_at)
          ? photo.leave_jayna_at
          : photo.time_due;

        // Ensure time is in HH:MM:SS format
        if (eventTime && eventTime.split(':').length === 2) {
          eventTime = `${eventTime}:00`;
        }

        const eventDateTime = `${photo.order_due_date}T${eventTime}`;

        console.log(`📅 Creating event: ${orderNumber} at ${eventDateTime}`);

        // Build description
        const eventDescription = `🍽️ Catering Order Details

Type: ${photo.order_type || 'N/A'}
Due: ${photo.order_due_date} at ${photo.time_due}
${photo.order_type === 'DELIVERY' ? `Leave Jayna: ${photo.leave_jayna_at}\n` : ''}

Order Photo:
${photo.image_url ? `<img src="${photo.image_url}" style="max-width: 100%; height: auto;" />` : 'No photo available'}`;

        // Create calendar event
        const event = {
          calendarId: 'jaynascans@gmail.com',
          requestBody: {
            summary: orderNumber,
            description: eventDescription,
            start: {
              dateTime: eventDateTime,
              timeZone: 'America/Los_Angeles'
            },
            end: {
              dateTime: eventDateTime,
              timeZone: 'America/Los_Angeles'
            },
            reminders: {
              useDefault: false,
              overrides: [
                { method: 'popup', minutes: 120 }
              ]
            },
            colorId: '11'
          }
        };

        const response = await calendar.events.insert(event);
        const eventId = response.data.id;

        console.log(`✅ Created event ${eventId}`);

        // Update database
        const { error: updateError } = await supabase
          .from('catering_photos')
          .update({ calendar_event_id: eventId })
          .eq('id', photo.id);

        if (updateError) {
          console.error(`⚠️ Failed to update photo ${photo.id}:`, updateError);
        } else {
          succeeded++;
        }

      } catch (photoError) {
        console.error(`❌ Failed to process photo ${photo.id}:`, photoError.message);
        console.error('Photo data:', {
          order_due_date: photo.order_due_date,
          time_due: photo.time_due,
          leave_jayna_at: photo.leave_jayna_at,
          order_type: photo.order_type
        });
        failed++;
      }
    }

    console.log(`\n✅ Backfill complete: ${succeeded} succeeded, ${failed} failed`);

  } catch (error) {
    console.error('❌ Backfill error:', error);
  }
}

backfillCalendarEvents();
