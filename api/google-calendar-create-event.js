/**
 * Vercel Serverless Function: Create Google Calendar Event
 * Creates catering order events in jaynascans@gmail.com calendar
 *
 * Features:
 * - Dynamic title: "Order #1", "Order #2" based on same-day orders
 * - Event time: leave_jayna_at (delivery) or time_due (pickup)
 * - 2-hour reminder before event
 * - Image embedded in description
 */

import { google } from 'googleapis';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      orderType,
      orderDueDate,
      timeDue,
      leaveJaynaAt,
      imageData,
      orderNumber // "Order #1", "Order #2", etc.
    } = req.body;

    // Validate required fields
    if (!orderDueDate || !timeDue) {
      return res.status(400).json({
        success: false,
        error: 'orderDueDate and timeDue are required'
      });
    }

    if (!orderNumber) {
      return res.status(400).json({
        success: false,
        error: 'orderNumber is required (e.g., "Order #1")'
      });
    }

    // Determine event start time
    // For DELIVERY: use leave_jayna_at (when to leave restaurant)
    // For PICKUP: use time_due (when customer picks up)
    const eventTime = (orderType === 'DELIVERY' && leaveJaynaAt) ? leaveJaynaAt : timeDue;

    // Build ISO datetime string (combine date + time)
    const eventDateTime = `${orderDueDate}T${eventTime}:00`; // e.g., "2025-10-25T14:30:00"

    console.log(`📅 Creating calendar event: ${orderNumber} at ${eventDateTime}`);

    // Authenticate with Google Calendar API using service account
    // Read from separate environment variables (more reliable than single JSON variable)
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY;

    if (!clientEmail || !privateKey) {
      throw new Error('Google service account credentials not configured. Set GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY in Vercel environment variables.');
    }

    // Replace literal \n with actual newlines (Vercel env vars may escape them)
    const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');

    const auth = new google.auth.JWT({
      email: clientEmail,
      key: formattedPrivateKey,
      scopes: ['https://www.googleapis.com/auth/calendar']
    });

    const calendar = google.calendar({ version: 'v3', auth });

    // Build event description with image
    const eventDescription = `
🍽️ Catering Order Details

Type: ${orderType}
Due: ${orderDueDate} at ${timeDue}
${orderType === 'DELIVERY' ? `Leave Jayna: ${leaveJaynaAt}\n` : ''}

Order Photo:
${imageData ? `<img src="${imageData}" style="max-width: 100%; height: auto;" />` : 'No photo available'}
    `.trim();

    // Create calendar event
    const event = {
      calendarId: 'jaynascans@gmail.com',
      requestBody: {
        summary: orderNumber, // "Order #1", "Order #2", etc.
        description: eventDescription,
        start: {
          dateTime: eventDateTime,
          timeZone: 'America/Los_Angeles' // Pacific Time
        },
        end: {
          dateTime: eventDateTime, // Same as start (0-duration event)
          timeZone: 'America/Los_Angeles'
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 120 } // 2 hours before
          ]
        },
        colorId: '11' // Red color for catering orders
      }
    };

    const response = await calendar.events.insert(event);

    console.log(`✅ Calendar event created: ${response.data.id}`);

    return res.status(200).json({
      success: true,
      message: 'Calendar event created successfully',
      data: {
        eventId: response.data.id,
        eventLink: response.data.htmlLink,
        eventDateTime: eventDateTime
      }
    });

  } catch (error) {
    console.error('❌ Calendar event creation error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create calendar event',
      details: error.message
    });
  }
}
