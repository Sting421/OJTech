"use server";

import { v2 as cloudinary } from "cloudinary";

if (!process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME) {
  throw new Error('NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME is not defined');
}

if (!process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY) {
  throw new Error('NEXT_PUBLIC_CLOUDINARY_API_KEY is not defined');
}

if (!process.env.CLOUDINARY_API_SECRET) {
  throw new Error('CLOUDINARY_API_SECRET is not defined');
}

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});


export async function uploadFileToCloudinary(
  base64Data: string,
  folder: 'profile-photos' | 'cvs' | 'employer_logos',
  fileType: string // Add fileType parameter
) {
  try {
    // Validate the base64 string
    if (!base64Data || typeof base64Data !== 'string') {
      throw new Error('Invalid file data');
    }

    const isSVG = fileType === 'image/svg+xml';

    // Upload to Cloudinary with optimizations
    const result = await cloudinary.uploader.upload(base64Data, {
      folder,
      resource_type: isSVG ? 'image' : 'auto', // Explicitly set resource_type for SVG
      quality: 'auto',
      fetch_format: isSVG ? undefined : 'auto', // Remove fetch_format for SVG
      flags: 'attachment',
      ...(folder === 'profile-photos' ? {
        transformation: [
          { width: 500, height: 500, crop: 'fill' },
          { quality: 'auto' },
          { fetch_format: 'auto' }
        ]
      } : {}),
    });

    // Verify upload result
    if (!result || !result.secure_url) {
      throw new Error('Failed to get upload result from Cloudinary');
    }

    return {
      success: true,
      data: {
        secure_url: result.secure_url,
        public_id: result.public_id,
      }
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upload file to Cloudinary'
    };
  }
}

export async function deleteFileFromCloudinary(publicId: string) {
  if (!publicId) {
    return {
      success: false,
      error: 'No public ID provided'
    };
  }

  try {
    const result = await cloudinary.uploader.destroy(publicId);
    
    if (result.result !== 'ok') {
      throw new Error('Failed to delete file from Cloudinary');
    }

    return { success: true };
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete file from Cloudinary'
    };
  }
}
