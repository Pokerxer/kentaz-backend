const cloudinary = require('cloudinary').v2;
const fs = require('fs');

// Configure at call time so env vars are always current (survives server restarts mid-session)
function configure() {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

async function uploadImage(filePath, folder = 'kentaz/products') {
  configure();
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder,
      resource_type: 'auto',
      transformation: [
        { width: 1200, height: 1200, crop: 'limit' },
        { quality: 'auto:good' },
        { fetch_format: 'auto' },
      ],
    });
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    return { url: result.secure_url, publicId: result.public_id };
  } catch (error) {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    throw error;
  }
}

async function deleteImage(publicId) {
  configure();
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Cloudinary deleteImage error:', error.message);
  }
}

async function deleteImages(publicIds) {
  if (!publicIds || publicIds.length === 0) return;
  configure();
  try {
    await cloudinary.api.delete_resources(publicIds);
  } catch (error) {
    console.error('Cloudinary deleteImages error:', error.message);
  }
}

// Produce signed params so the browser can upload directly to Cloudinary,
// bypassing the ~4.5MB Vercel serverless body limit and letting Cloudinary
// ingest/convert formats like HEIC server-side.
function getUploadSignature(folder = 'kentaz/products') {
  configure();
  const timestamp = Math.round(Date.now() / 1000);
  const signature = cloudinary.utils.api_sign_request(
    { folder, timestamp },
    process.env.CLOUDINARY_API_SECRET
  );
  return {
    timestamp,
    signature,
    apiKey: process.env.CLOUDINARY_API_KEY,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    folder,
  };
}

function getOptimizedUrl(url, width = 600) {
  if (!url) return null;
  if (url.includes('cloudinary.com')) {
    return url.replace('/upload/', `/upload/w_${width},q_auto,f_auto/`);
  }
  return url;
}

module.exports = { cloudinary, uploadImage, deleteImage, deleteImages, getOptimizedUrl, getUploadSignature };
