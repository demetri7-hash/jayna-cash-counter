/**
 * Vercel Serverless Function: Process AMEX Receipt Files
 * Handles:
 * - Images: Compress to under 1MB (including HEIC conversion)
 * - HEIC: Convert to JPEG, then compress
 * - PDF/Word/Excel: Save as-is (no conversion)
 * Uploads to Supabase Storage
 */

import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import convert from 'heic-convert';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb' // Allow up to 10MB uploads
    }
  }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('📸 Processing AMEX receipt file...');

    // Initialize Supabase
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { file, fileType, fileName } = req.body;

    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    // Decode base64 file
    let fileBuffer = Buffer.from(file, 'base64');
    let processedBuffer = fileBuffer;
    let finalFileName = fileName || `receipt_${Date.now()}`;
    let contentType = fileType;

    // Detect HEIC files by extension or MIME type
    const isHEIC = fileName?.toLowerCase().endsWith('.heic') ||
                   fileName?.toLowerCase().endsWith('.heif') ||
                   fileType === 'image/heic' ||
                   fileType === 'image/heif';

    // Convert HEIC to JPEG first if needed
    if (isHEIC) {
      console.log('🔄 Converting HEIC to JPEG...');
      fileBuffer = await convertHEICtoJPEG(fileBuffer);
      finalFileName = finalFileName.replace(/\.heic$/i, '.jpg').replace(/\.heif$/i, '.jpg');
      contentType = 'image/jpeg';
      console.log('✅ HEIC converted to JPEG');
    }

    // Process based on file type
    if (fileType.startsWith('image/') || isHEIC) {
      // Compress images to under 1MB
      console.log('🖼️ Compressing image...');
      processedBuffer = await compressImage(fileBuffer);
      finalFileName = finalFileName.replace(/\.[^.]+$/, '.jpg'); // Change extension to .jpg
      contentType = 'image/jpeg';
    } else if (
      fileType === 'application/pdf' ||
      fileType === 'application/msword' ||
      fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      fileType === 'application/vnd.ms-excel' ||
      fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ) {
      // Save PDF/Word/Excel as-is
      console.log('📄 Saving document as-is...');
      processedBuffer = fileBuffer;
    } else {
      return res.status(400).json({
        error: 'Unsupported file type',
        message: 'Please upload images, PDFs, Word documents, or Excel files'
      });
    }

    // Upload to Supabase Storage
    const timestamp = Date.now();
    const uploadFileName = `${timestamp}_${finalFileName}`;

    const { data, error } = await supabase.storage
      .from('amex-receipt-images')
      .upload(uploadFileName, processedBuffer, {
        contentType: contentType,
        cacheControl: '3600'
      });

    if (error) {
      console.error('Error uploading to Supabase:', error);
      throw error;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('amex-receipt-images')
      .getPublicUrl(uploadFileName);

    console.log(`✅ Uploaded file: ${uploadFileName}`);

    return res.json({
      success: true,
      fileUrl: urlData.publicUrl,
      fileName: uploadFileName,
      fileType: contentType,
      fileSize: processedBuffer.length
    });

  } catch (error) {
    console.error('❌ Error processing file:', error);
    return res.status(500).json({
      error: 'Failed to process file',
      details: error.message
    });
  }
}

/**
 * Compress image to under 1MB
 */
async function compressImage(imageBuffer) {
  try {
    let quality = 90;
    let compressed = imageBuffer;

    // Compress until under 1MB
    while (compressed.length > 1024 * 1024 && quality > 10) {
      compressed = await sharp(imageBuffer)
        .jpeg({ quality })
        .resize(1920, 1920, { // Max dimensions
          fit: 'inside',
          withoutEnlargement: true
        })
        .toBuffer();

      quality -= 10;
    }

    console.log(`✅ Compressed to ${(compressed.length / 1024).toFixed(0)}KB at quality ${quality}`);

    return compressed;
  } catch (error) {
    throw new Error(`Image compression failed: ${error.message}`);
  }
}

/**
 * Convert HEIC/HEIF to JPEG
 */
async function convertHEICtoJPEG(heicBuffer) {
  try {
    console.log(`📸 Converting HEIC file (${(heicBuffer.length / 1024).toFixed(0)}KB)...`);

    const outputBuffer = await convert({
      buffer: heicBuffer,
      format: 'JPEG',
      quality: 1 // Max quality for conversion (will compress later)
    });

    console.log(`✅ HEIC converted to JPEG (${(outputBuffer.length / 1024).toFixed(0)}KB)`);
    return Buffer.from(outputBuffer);

  } catch (error) {
    throw new Error(`HEIC conversion failed: ${error.message}`);
  }
}
