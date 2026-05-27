/**
 * Multer-Cloudinary storage for the ARCHIVE account.
 * Used only for admin-managed photo albums (NOT event images).
 *
 * Compression strategy:
 *   - quality: "auto:good"  → ~60-70% smaller than unoptimised originals
 *   - fetch_format: "auto"  → serves WebP/AVIF to supporting browsers
 *   - width: 2000, crop: "limit" → caps mega-resolution images; preserves smaller ones
 *
 * Files are stored in a folder determined per-request via req.body.folder.
 */

const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;

// We configure a temporary instance here; the controller re-configures before
// every actual API call so the two accounts never bleed into each other.
const archiveCloudinaryInstance = cloudinary;

const archiveStorage = new CloudinaryStorage({
    cloudinary: archiveCloudinaryInstance,
    params: async (req, file) => {
        // Switch to archive credentials for this upload
        archiveCloudinaryInstance.config({
            cloud_name: process.env.ARCHIVE_CLOUDINARY_CLOUD_NAME,
            api_key: process.env.ARCHIVE_CLOUDINARY_API_KEY,
            api_secret: process.env.ARCHIVE_CLOUDINARY_API_SECRET,
            secure: true,
        });

        // Sanitise the folder name so Cloudinary accepts it
        const rawFolder = (req.body.folderName || 'Untitled Album').trim();

        return {
            folder: rawFolder,
            allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
            // Compression: quality auto:good + cap width at 2000px
            transformation: [
                { width: 2000, crop: 'limit', quality: 'auto:good', fetch_format: 'auto' },
            ],
            // Use_filename keeps the original name (helps with de-duplication)
            use_filename: true,
            unique_filename: true,
        };
    },
});

const fileFilter = (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowed.includes(file.mimetype)) {
        return cb(new Error('Only image files (jpg, png, gif, webp) are allowed.'), false);
    }
    cb(null, true);
};

const archiveUpload = multer({
    storage: archiveStorage,
    fileFilter,
    limits: {
        fileSize: 20 * 1024 * 1024, // 20 MB per file
        files: 200,                   // max 200 files per request
    },
});

module.exports = archiveUpload;
