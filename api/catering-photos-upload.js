/**
 * Vercel Serverless Function: Upload Catering Photo
 * Stores base64 image in database with auto-incrementing display order
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

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
    const { imageData, caption, orderType, orderDueDate, timeDue, leaveJaynaAt } = req.body;

    if (!imageData) {
      return res.status(400).json({
        success: false,
        error: 'Image data is required'
      });
    }

    // Validate required fields
    if (!orderType) {
      return res.status(400).json({
        success: false,
        error: 'Order type (PICKUP/DELIVERY) is required'
      });
    }

    if (!orderDueDate) {
      return res.status(400).json({
        success: false,
        error: 'Order due date is required'
      });
    }

    if (!timeDue) {
      return res.status(400).json({
        success: false,
        error: 'Time due is required'
      });
    }

    // Validate leaveJaynaAt is provided for DELIVERY orders
    if (orderType === 'DELIVERY' && !leaveJaynaAt) {
      return res.status(400).json({
        success: false,
        error: 'Leave Jayna at time is required for delivery orders'
      });
    }

    console.log('📸 Uploading catering photo...');

    // Get current max display order
    const { data: maxOrder } = await supabase
      .from('catering_photos')
      .select('display_order')
      .order('display_order', { ascending: false })
      .limit(1);

    const nextOrder = (maxOrder && maxOrder.length > 0) ? maxOrder[0].display_order + 1 : 0;

    // Count existing orders on the same date (for dynamic numbering)
    const { data: sameDayOrders, error: countError } = await supabase
      .from('catering_photos')
      .select('id')
      .eq('order_due_date', orderDueDate);

    if (countError) {
      console.error('❌ Error counting same-day orders:', countError);
    }

    const orderNumber = `Order #${(sameDayOrders?.length || 0) + 1}`;
    console.log(`📋 Assigned order number: ${orderNumber} for ${orderDueDate}`);

    // Create Google Calendar event
    let calendarEventId = null;
    try {
      console.log('📅 Creating Google Calendar event...');

      const calendarResponse = await fetch(`${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'}/api/google-calendar-create-event`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          orderType,
          orderDueDate,
          timeDue,
          leaveJaynaAt,
          imageData,
          orderNumber
        })
      });

      const calendarData = await calendarResponse.json();

      if (calendarData.success) {
        calendarEventId = calendarData.data.eventId;
        console.log(`✅ Calendar event created: ${calendarEventId}`);
      } else {
        console.warn(`⚠️ Calendar event creation failed: ${calendarData.error}`);
        // Continue with photo upload even if calendar sync fails
      }
    } catch (calendarError) {
      console.error('❌ Calendar sync error:', calendarError);
      // Continue with photo upload even if calendar sync fails
    }

    // Insert photo with order metadata and calendar event ID
    const { data: photo, error } = await supabase
      .from('catering_photos')
      .insert({
        image_data: imageData,
        image_url: imageData, // For now, store base64 as URL
        caption: caption || null,
        display_order: nextOrder,
        order_type: orderType,
        order_due_date: orderDueDate,
        time_due: timeDue,
        leave_jayna_at: orderType === 'DELIVERY' ? leaveJaynaAt : null,
        calendar_event_id: calendarEventId
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error uploading photo:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to upload photo',
        details: error.message
      });
    }

    console.log(`✅ Photo uploaded successfully (ID: ${photo.id})`);

    return res.status(200).json({
      success: true,
      message: 'Photo uploaded successfully',
      data: {
        ...photo,
        orderNumber,
        calendarSynced: !!calendarEventId
      }
    });

  } catch (error) {
    console.error('❌ Upload error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to upload photo',
      details: error.message
    });
  }
}
