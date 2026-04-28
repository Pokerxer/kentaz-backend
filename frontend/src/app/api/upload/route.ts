import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

// Raise Next.js body size limit to 10 MB (Cloudinary free plan max)
export const config = {
  api: { bodyParser: { sizeLimit: '20mb' } },
};

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: Request) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  if (!cloudName || cloudName === 'your-cloud-name') {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_CONFIGURED', message: 'Cloudinary is not configured' } },
      { status: 503 },
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: { code: 'NO_FILE', message: 'No file provided' } },
        { status: 400 },
      );
    }

    const MAX_SIZE = 20 * 1024 * 1024; // 20 MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { success: false, error: { code: 'FILE_TOO_LARGE', message: 'Image must be under 20 MB' } },
        { status: 413 },
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const result = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: 'kentaz',
          resource_type: 'image',
          transformation: [
            { width: 1200, height: 1200, crop: 'limit' },
            { quality: 'auto:good' },
            { fetch_format: 'auto' },
          ],
        },
        (error, result) => {
          if (error || !result) reject(error ?? new Error('No result from Cloudinary'));
          else resolve(result as { secure_url: string; public_id: string });
        },
      ).end(buffer);
    });

    // Return a normalised shape — same as backend/utils/cloudinary.js uploadImage()
    return NextResponse.json({
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
    });
  } catch (error: any) {
    console.error('[upload] Cloudinary error:', error?.message);
    return NextResponse.json(
      { success: false, error: { code: 'UPLOAD_ERROR', message: error?.message || 'Failed to upload image' } },
      { status: 500 },
    );
  }
}
