const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

// SECURITY NOTE (CVE GHSA-g4mf-96x5-5m2c):
// cloudinary v1 has an argument injection vulnerability via parameters containing '&'.
// This is NOT exploitable here because ALL transformation parameters below are
// hardcoded server-side constants — no user-supplied values reach Cloudinary's API.
// Upgrading to v2 is blocked by multer-storage-cloudinary@4.0.0 requiring cloudinary v1.
// Monitor https://github.com/badunk/multer-storage-cloudinary for a v2-compatible release.

// Dynamic storage that handles both images (webp) and PDFs (raw) in the same upload instance.
// This allows upload.fields() to accept both images and an attached PDF in one request.
const storage = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => {
        if (file.fieldname === 'attachedPdf') {
            return {
                folder: 'kmsf-event-pdfs',
                resource_type: 'raw',
                format: 'pdf',
            };
        }
        // Default: image storage with webp conversion
        return {
            folder: 'kmsf-events',
            format: 'webp',
            allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
            transformation: [{ width: 1200, height: 800, crop: 'limit', quality: 'auto' }],
        };
    },
});

// Storage configuration for team members (converts and compresses to WebP)
const teamStorage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: 'kmsf-team',
        format: 'webp',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        transformation: [{ width: 800, height: 800, crop: 'limit', quality: 'auto' }],
    },
});

// File filter: allows images for standard fields and PDFs for 'attachedPdf' field
const fileFilter = (req, file, cb) => {
    // Allow PDFs for the attachedPdf field
    if (file.fieldname === 'attachedPdf') {
        if (file.mimetype === 'application/pdf' || file.originalname.match(/\.pdf$/i)) {
            return cb(null, true);
        }
        return cb(new Error('Only PDF files are allowed for attachments!'), false);
    }

    // Image validation for all other fields
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const allowedExtensions = /\.(jpg|JPG|jpeg|JPEG|png|PNG|gif|GIF|webp|WEBP)$/;

    if (!allowedMimeTypes.includes(file.mimetype) || !file.originalname.match(allowedExtensions)) {
        req.fileValidationError = 'Only image files are allowed!';
        return cb(new Error('Only image files (jpg, png, gif, webp) are allowed!'), false);
    }
    cb(null, true);
};

const teamFileFilter = (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const allowedExtensions = /\.(jpg|JPG|jpeg|JPEG|png|PNG|gif|GIF|webp|WEBP)$/;
    if (!allowedMimeTypes.includes(file.mimetype) || !file.originalname.match(allowedExtensions)) {
        return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit (covers both images and PDFs)
});

const teamUpload = multer({
    storage: teamStorage,
    fileFilter: teamFileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

module.exports = {
    upload,
    teamUpload,
};
