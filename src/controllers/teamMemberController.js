const TeamMember = require('../models/TeamMember');
const cloudinary = require('../config/cloudinary');

// Helper to extract Cloudinary public_id from secure URL
const getPublicId = (url) => {
    try {
        if (!url || !url.includes('/upload/')) return null;
        const parts = url.split('/upload/');
        const pathAndParams = parts[1];
        const pathParts = pathAndParams.split('/');
        
        // Remove version e.g. "v1716942918/" if present
        if (pathParts[0].startsWith('v') && !isNaN(pathParts[0].substring(1))) {
            pathParts.shift();
        }
        
        const fullPath = pathParts.join('/');
        // Strip extension (e.g. .webp)
        return fullPath.substring(0, fullPath.lastIndexOf('.'));
    } catch (e) {
        console.error('Error parsing Cloudinary public ID:', e);
        return null;
    }
};

// @desc    Get all team members
// @route   GET /team-members
// @access  Public
exports.getTeamMembers = async (req, res, next) => {
    try {
        const members = await TeamMember.find().sort({ order: 1, createdAt: 1 });
        res.status(200).json({
            success: true,
            count: members.length,
            data: members,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Create a new team member
// @route   POST /admin/team-member
// @access  Private/Admin
exports.createTeamMember = async (req, res, next) => {
    try {
        const normalizedTeamType = teamType === 'audiovisual' ? 'audioVisual' : teamType;

        const teamMemberData = {
            name,
            position,
            bio,
            detail,
            teamType: normalizedTeamType,
            order: order ? parseInt(order, 10) : 0,
        };

        // Handle image upload from teamUpload.fields([{ name: 'image', maxCount: 1 }])
        if (req.files && req.files.image && req.files.image.length > 0) {
            teamMemberData.image = req.files.image[0].path;
        } else {
            return res.status(400).json({
                success: false,
                message: 'Team member photo/image is required.',
            });
        }

        const member = await TeamMember.create(teamMemberData);

        res.status(201).json({
            success: true,
            data: member,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete a team member
// @route   DELETE /admin/team-member/:id
// @access  Private/Admin
exports.deleteTeamMember = async (req, res, next) => {
    try {
        const member = await TeamMember.findById(req.params.id);

        if (!member) {
            return res.status(404).json({
                success: false,
                message: 'Team member not found',
            });
        }

        // Delete image asset from Cloudinary
        if (member.image) {
            const publicId = getPublicId(member.image);
            if (publicId) {
                console.log(`Destroying Cloudinary image: ${publicId}`);
                await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
            }
        }

        await member.deleteOne();

        res.status(200).json({
            success: true,
            data: {},
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update a team member
// @route   PUT /admin/team-member/:id
// @access  Private/Admin
exports.updateTeamMember = async (req, res, next) => {
    try {
        const { name, position, bio, detail, teamType, order } = req.body;
        const member = await TeamMember.findById(req.params.id);

        if (!member) {
            return res.status(404).json({
                success: false,
                message: 'Team member not found',
            });
        }

        const normalizedTeamType = teamType === 'audiovisual' ? 'audioVisual' : teamType;

        const updateData = {
            name,
            position,
            bio,
            detail,
            teamType: normalizedTeamType,
            order: order ? parseInt(order, 10) : 0,
        };

        // Handle image edit
        if (req.files && req.files.image && req.files.image.length > 0) {
            // Delete old image from Cloudinary
            if (member.image) {
                const publicId = getPublicId(member.image);
                if (publicId) {
                    console.log(`Destroying replaced Cloudinary image: ${publicId}`);
                    await cloudinary.uploader.destroy(publicId, { resource_type: 'image' }).catch(err => {
                        console.error('Failed to destroy replaced image:', err);
                    });
                }
            }
            updateData.image = req.files.image[0].path;
        }

        const updatedMember = await TeamMember.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            data: updatedMember,
        });
    } catch (error) {
        next(error);
    }
};
