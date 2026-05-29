const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

// Storage configuration for events (converts and compresses to WebP)
const storage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: 'kmsf-events',
        format: 'webp',
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
        transformation: [{ width: 1200, height: 800, crop: 'limit', quality: 'auto' }],
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

const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const allowedExtensions = /\.(jpg|JPG|jpeg|JPEG|png|PNG|gif|GIF|webp|WEBP)$/;

    if (!allowedMimeTypes.includes(file.mimetype) || !file.originalname.match(allowedExtensions)) {
        req.fileValidationError = 'Only image files are allowed!';
        return cb(new Error('Only image files (jpg, png, gif, webp) are allowed!'), false);
    }
    cb(null, true);
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

const teamUpload = multer({
    storage: teamStorage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

module.exports = {
    upload,
    teamUpload
};
