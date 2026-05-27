const express = require('express');
const router = express.Router();
const {
    getArchiveFolders,
    getArchiveFolderImages,
    createAlbum,
    deleteAlbum,
    deleteAlbumImage,
} = require('../controllers/archiveGalleryController');
const { requireAuth } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/requireAdmin');
const archiveUpload = require('../middleware/archiveUpload');

// ─── Public routes ────────────────────────────────────────────────────────────
// GET /archive-gallery/folders  — list all cloudinary folders (with cover thumbnails)
router.get('/folders', getArchiveFolders);

// GET /archive-gallery/images?folder=xxx&limit=12&cursor=...  — paginated images
router.get('/images', getArchiveFolderImages);

// ─── Admin-only routes ────────────────────────────────────────────────────────
// POST /archive-gallery/album  — create album + upload images (with compression)
router.post(
    '/album',
    requireAuth,
    requireAdmin,
    archiveUpload.array('images', 200),
    createAlbum
);

// DELETE /archive-gallery/album/:folderPath  — delete entire album from Cloudinary
router.delete('/album/:folderPath', requireAuth, requireAdmin, deleteAlbum);

// DELETE /archive-gallery/image/:publicId  — delete a single image
router.delete('/image/:publicId', requireAuth, requireAdmin, deleteAlbumImage);

module.exports = router;

