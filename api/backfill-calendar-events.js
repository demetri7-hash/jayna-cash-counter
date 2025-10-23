/**
 * Vercel Serverless Function: Backfill Calendar Events
 * One-time script to create calendar events for existing catering photos
 *
 * Usage: Call this endpoint once to sync existing photos to Google Calendar
 * GET /api/backfill-calendar-events
 */

import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed. Use GET.' });
  }

  try {
    console.log('🔄 Starting calendar events backfill...');

    // Fetch all photos that don't have a calendar_event_id yet
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
      return res.status(200).json({
        success: true,
        message: 'No photos found that need calendar events',
        data: {
          processed: 0,
          succeeded: 0,
          failed: 0
        }
      });
    }

    console.log(`📸 Found ${photos.length} photos without calendar events`);

    // Authenticate with Google Calendar
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY;

    if (!clientEmail || !privateKey) {
      throw new Error('Google Calendar credentials not configured. Set GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY.');
    }

    const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');

    const auth = new google.auth.JWT({
      email: clientEmail,
      key: formattedPrivateKey,
      scopes: ['https://www.googleapis.com/auth/calendar']
    });

    const calendar = google.calendar({ version: 'v3', auth });

    // Process each photo
    let succeeded = 0;
    let failed = 0;
    const results = [];

    for (const photo of photos) {
      try {
        // Count same-day orders for dynamic numbering
        const { data: sameDayOrders } = await supabase
          .from('catering_photos')
          .select('id')
          .eq('order_due_date', photo.order_due_date)
          .lte('id', photo.id) // Orders up to and including this one
          .order('id', { ascending: true });

        const orderNumber = `Order #${sameDayOrders?.length || 1}`;

        // Determine event time (leave_jayna_at for delivery, time_due for pickup)
        const eventTime = (photo.order_type === 'DELIVERY' && photo.leave_jayna_at)
          ? photo.leave_jayna_at
          : photo.time_due;

        const eventDateTime = `${photo.order_due_date}T${eventTime}:00`;

        // Build event description
        const eventDescription = `
🍽️ Catering Order Details

Type: ${photo.order_type || 'N/A'}
Due: ${photo.order_due_date} at ${photo.time_due}
${photo.order_type === 'DELIVERY' ? `Leave Jayna: ${photo.leave_jayna_at}\n` : ''}

Order Photo:
${photo.image_url ? `<img src="${photo.image_url}" style="max-width: 100%; height: auto;" />` : 'No photo available'}
        `.trim();

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
                { method: 'popup', minutes: 120 } // 2 hours before
              ]
            },
            colorId: '11' // Red color
          }
        };

        const response = await calendar.events.insert(event);
        const eventId = response.data.id;

        console.log(`✅ Created event for photo ${photo.id}: ${orderNumber} (${eventId})`);

        // Update database with calendar_event_id
        const { error: updateError } = await supabase
          .from('catering_photos')
          .update({ calendar_event_id: eventId })
          .eq('id', photo.id);

        if (updateError) {
          console.error(`⚠️ Failed to update photo ${photo.id} with event ID:`, updateError);
          results.push({
            photoId: photo.id,
            orderNumber,
            status: 'partial',
            message: 'Event created but database update failed',
            eventId
          });
        } else {
          succeeded++;
          results.push({
            photoId: photo.id,
            orderNumber,
            status: 'success',
            eventId
          });
        }

      } catch (photoError) {
        console.error(`❌ Failed to process photo ${photo.id}:`, photoError.message);
        failed++;
        results.push({
          photoId: photo.id,
          status: 'failed',
          error: photoError.message
        });
      }
    }

    console.log(`✅ Backfill complete: ${succeeded} succeeded, ${failed} failed`);

    return res.status(200).json({
      success: true,
      message: `Backfill complete: ${succeeded} events created, ${failed} failed`,
      data: {
        processed: photos.length,
        succeeded,
        failed,
        results
      }
    });

  } catch (error) {
    console.error('❌ Backfill error:', error);
    return res.status(500).json({
      success: false,
      error: 'Backfill failed',
      details: error.message
    });
  }
}
