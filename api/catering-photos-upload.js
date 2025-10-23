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
    const {
      imageData,
      caption,
      orderType,
      orderDueDate,
      timeDue,
      leaveJaynaAt,
      guestName,
      phoneNumber,
      email,
      deliveryAddress,
      specialNotes
    } = req.body;

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

    // Upload image to Supabase Storage to get a real public URL
    let publicImageUrl = null;
    let storageUploadSucceeded = false;

    try {
      // Convert base64 to buffer
      const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      // Generate unique filename
      const timestamp = Date.now();
      const fileName = `${orderDueDate}_${orderNumber.replace(/\s/g, '_')}_${timestamp}.jpg`;

      console.log(`☁️ Uploading to Supabase Storage: ${fileName}`);
      console.log(`📦 Bucket: catering-photos`);
      console.log(`📏 File size: ${buffer.length} bytes`);

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('catering-photos')
        .upload(fileName, buffer, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
          upsert: true  // Allow overwriting existing files (handles retries)
        });

      if (uploadError) {
        console.error('❌ Storage upload error:', uploadError);
        console.error('❌ Error details:', JSON.stringify(uploadError, null, 2));
        throw uploadError;
      }

      console.log('✅ Upload successful, data:', uploadData);
      storageUploadSucceeded = true;

      // Get public URL - CRITICAL: Bucket must be set to PUBLIC in Supabase dashboard
      const { data: urlData } = supabase.storage
        .from('catering-photos')
        .getPublicUrl(fileName);

      if (!urlData || !urlData.publicUrl) {
        throw new Error('getPublicUrl returned no URL - bucket may not be public');
      }

      publicImageUrl = urlData.publicUrl;
      console.log(`✅ Public URL generated: ${publicImageUrl}`);
      console.log(`🔗 URL length: ${publicImageUrl.length} characters`);

    } catch (storageError) {
      console.error('❌ Storage upload failed:', storageError);
      console.error('❌ Error type:', storageError.name);
      console.error('❌ Error message:', storageError.message);

      // CRITICAL: If upload fails, use base64 as fallback BUT log warning
      console.warn('⚠️ FALLING BACK TO BASE64 - Calendar event will have large URL');
      console.warn('⚠️ To fix: Ensure "catering-photos" bucket is PUBLIC in Supabase dashboard');
      console.warn('⚠️ Settings → Storage → catering-photos → Make Public');

      publicImageUrl = imageData;
    }

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
          imageUrl: publicImageUrl, // Use real URL instead of base64
          orderNumber,
          guestName,
          phoneNumber,
          email,
          deliveryAddress,
          specialNotes
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

    // Insert photo with order metadata, customer info, and calendar event ID
    const { data: photo, error } = await supabase
      .from('catering_photos')
      .insert({
        image_data: imageData, // Keep base64 as backup
        image_url: publicImageUrl, // Store real public URL
        caption: caption || null,
        display_order: nextOrder,
        order_type: orderType,
        order_due_date: orderDueDate,
        time_due: timeDue,
        leave_jayna_at: orderType === 'DELIVERY' ? leaveJaynaAt : null,
        guest_name: guestName,
        phone_number: phoneNumber,
        email: email,
        delivery_address: orderType === 'DELIVERY' ? deliveryAddress : null,
        special_notes: specialNotes,
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
