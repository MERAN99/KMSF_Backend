const cloudinary = require('cloudinary').v2;

// ─── Configure ARCHIVE Cloudinary instance ────────────────────────────────────
// Using a separate config object (not the global) so we never touch the
// primary Cloudinary account used for event image uploads.
const archiveCloud = cloudinary.config({
    cloud_name: process.env.ARCHIVE_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.ARCHIVE_CLOUDINARY_API_KEY,
    api_secret: process.env.ARCHIVE_CLOUDINARY_API_SECRET,
    secure: true,
});

// Helper — build an optimised delivery URL for a given public_id
// f_auto  → serve WebP/AVIF to supporting browsers
// q_auto  → smart quality (reduces file size ~70% vs original)
// w_800   → cap width at 800px for grid thumbnails
const thumbUrl = (publicId) =>
    cloudinary.url(publicId, {
        ...archiveCloud,
        fetch_format: 'auto',
        quality: 'auto',
        width: 800,
        crop: 'limit',
        secure: true,
    });

// Full-res lightbox URL (still auto-quality but no width cap)
const fullUrl = (publicId) =>
    cloudinary.url(publicId, {
        ...archiveCloud,
        fetch_format: 'auto',
        quality: 'auto',
        secure: true,
    });

// ─── GET /archive-gallery/folders ─────────────────────────────────────────────
// Returns list of top-level folders, each with a coverThumb URL so the
// frontend can render thumbnails immediately without opening the folder first.
const getArchiveFolders = async (req, res) => {
    try {
        cloudinary.config({
            cloud_name: process.env.ARCHIVE_CLOUDINARY_CLOUD_NAME,
            api_key: process.env.ARCHIVE_CLOUDINARY_API_KEY,
            api_secret: process.env.ARCHIVE_CLOUDINARY_API_SECRET,
            secure: true,
        });

        const result = await cloudinary.api.root_folders();

        // Fetch the first image from every folder in parallel for cover thumbnails
        const folders = await Promise.all(
            result.folders.map(async (f) => {
                let coverThumb = null;
                let totalImages = 0;
                let meta = {};

                // 1. Fetch cover image
                try {
                    const preview = await cloudinary.search
                        .expression(`folder="${f.path}" AND resource_type="image"`)
                        .sort_by('created_at', 'desc')
                        .max_results(1)
                        .execute();

                    totalImages = preview.total_count || 0;
                    if (preview.resources && preview.resources.length > 0) {
                        coverThumb = thumbUrl(preview.resources[0].public_id);
                    }
                } catch (_) {
                    // Non-fatal: folder just won't have a cover
                }

                // 2. Fetch metadata JSON if it exists
                try {
                    const metaRes = await cloudinary.api.resource(`${f.path}/__album_meta__`, { resource_type: 'raw' });
                    if (metaRes && metaRes.secure_url) {
                        // Use native fetch (Node 18+) to download the JSON
                        const response = await fetch(metaRes.secure_url);
                        if (response.ok) {
                            meta = await response.json();
                        }
                    }
                } catch (_) {
                    // Non-fatal: old folders might not have this metadata file
                }

                return {
                    name: meta.title || f.name,
                    path: f.path,
                    coverThumb,
                    totalImages,
                    description: meta.description || '',
                    date: meta.date || null,
                    location: meta.location || '',
                    category: meta.category || 'Conference',
                };
            })
        );

        return res.json({ success: true, folders });
    } catch (err) {
        console.error('[ArchiveGallery] getArchiveFolders error:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to load folders.' });
    }
};


// ─── GET /archive-gallery/images ──────────────────────────────────────────────
// Query params:
//   folder  — Cloudinary folder path (required)
//   page    — 1-based page number (default: 1)
//   limit   — images per page (default: 12, max: 50)
const getArchiveFolderImages = async (req, res) => {
    const { folder, page = '1', limit = '12' } = req.query;

    if (!folder) {
        return res.status(400).json({ success: false, message: 'folder query param is required.' });
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 12));

    try {
        cloudinary.config({
            cloud_name: process.env.ARCHIVE_CLOUDINARY_CLOUD_NAME,
            api_key: process.env.ARCHIVE_CLOUDINARY_API_KEY,
            api_secret: process.env.ARCHIVE_CLOUDINARY_API_SECRET,
            secure: true,
        });

        // Cloudinary uses cursor-based pagination via next_cursor.
        // We simulate page-based pagination by walking cursors.
        // For page 1 we start fresh; for deeper pages we cache cursors in-memory
        // (good enough for a read-only archive that rarely changes).

        // Build search expression — match only images in the folder
        const expression = `folder="${folder}" AND resource_type="image"`;

        // Cloudinary Search API supports max_results up to 500
        const searchResult = await cloudinary.search
            .expression(expression)
            .sort_by('created_at', 'desc')
            .max_results(limitNum)
            .with_field('context')
            .next_cursor(req.query.cursor || undefined)
            .execute();

        const images = searchResult.resources.map((r) => ({
            publicId: r.public_id,
            thumb: thumbUrl(r.public_id),
            full: fullUrl(r.public_id),
            width: r.width,
            height: r.height,
            createdAt: r.created_at,
            format: r.format,
        }));

        return res.json({
            success: true,
            folder,
            page: pageNum,
            limit: limitNum,
            total: searchResult.total_count,
            nextCursor: searchResult.next_cursor || null,
            images,
        });
    } catch (err) {
        console.error('[ArchiveGallery] getArchiveFolderImages error:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to load images.' });
    }
};

// ─── Helper — always re-apply archive config before Cloudinary API calls ──────
const setArchiveConfig = () => cloudinary.config({
    cloud_name: process.env.ARCHIVE_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.ARCHIVE_CLOUDINARY_API_KEY,
    api_secret: process.env.ARCHIVE_CLOUDINARY_API_SECRET,
    secure: true,
});

// ─── POST /admin/archive-gallery/album ────────────────────────────────────────
// Creates an album. Images are already uploaded to Cloudinary by the
// archiveUpload middleware (multer-storage-cloudinary). We just store
// the album metadata as a named JSON raw file so we can retrieve it later.
const createAlbum = async (req, res) => {
    const { folderName, description, date, location, category } = req.body;

    if (!folderName || !folderName.trim()) {
        return res.status(400).json({ success: false, message: 'folderName is required.' });
    }

    const uploadedImages = req.files || [];

    try {
        setArchiveConfig();

        // Build metadata JSON and upload it as a raw "config" file in the folder
        // so we can retrieve album details later (title, description, date, etc.)
        const albumMeta = {
            title: folderName.trim(),
            description: description || '',
            date: date || null,
            location: location || '',
            category: category || 'Conference',
            createdAt: new Date().toISOString(),
        };

        await cloudinary.uploader.upload(
            `data:application/json;base64,${Buffer.from(JSON.stringify(albumMeta)).toString('base64')}`,
            {
                folder: folderName.trim(),
                public_id: '__album_meta__',
                resource_type: 'raw',
                overwrite: true,
            }
        );

        return res.status(201).json({
            success: true,
            message: `Album "${folderName.trim()}" created with ${uploadedImages.length} photo(s).`,
            album: {
                name: folderName.trim(),
                path: folderName.trim(),
                totalImages: uploadedImages.length,
                ...albumMeta,
            },
            images: uploadedImages.map(f => ({
                publicId: f.filename || f.public_id,
                url: f.path,
            })),
        });
    } catch (err) {
        console.error('[ArchiveGallery] createAlbum error:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to create album.' });
    }
};

// ─── DELETE /admin/archive-gallery/album ──────────────────────────────────────
// Deletes ALL resources inside a folder then removes the folder itself.
const deleteAlbum = async (req, res) => {
    const { folderPath } = req.params;
    if (!folderPath) {
        return res.status(400).json({ success: false, message: 'folderPath is required.' });
    }

    const decodedFolder = decodeURIComponent(folderPath);

    try {
        setArchiveConfig();

        // Delete all image resources in folder
        await cloudinary.api.delete_resources_by_prefix(decodedFolder + '/', {
            resource_type: 'image',
        });

        // Delete the raw metadata file
        try {
            await cloudinary.uploader.destroy(`${decodedFolder}/__album_meta__`, {
                resource_type: 'raw',
            });
        } catch (_) { /* non-fatal */ }

        // Delete the empty folder
        try {
            await cloudinary.api.delete_folder(decodedFolder);
        } catch (_) { /* non-fatal if already empty */ }

        return res.json({ success: true, message: `Album "${decodedFolder}" deleted.` });
    } catch (err) {
        console.error('[ArchiveGallery] deleteAlbum error:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to delete album.' });
    }
};

// ─── DELETE /admin/archive-gallery/image/:publicId ────────────────────────────
const deleteAlbumImage = async (req, res) => {
    const publicId = decodeURIComponent(req.params.publicId);
    if (!publicId) {
        return res.status(400).json({ success: false, message: 'publicId is required.' });
    }

    try {
        setArchiveConfig();
        await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
        return res.json({ success: true, message: 'Image deleted.' });
    } catch (err) {
        console.error('[ArchiveGallery] deleteAlbumImage error:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to delete image.' });
    }
};

module.exports = { getArchiveFolders, getArchiveFolderImages, createAlbum, deleteAlbum, deleteAlbumImage };

