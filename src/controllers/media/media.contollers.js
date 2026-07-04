import path from "path";
import fs from "fs";
import { v2 as cloudinary } from "cloudinary";

import { mediaModel } from "../../models/media/media.model.js";
import { Auth } from "../../models/auth/auth.models.js";

export const uploadMedia = async (req, res) => {
    try {
        const user = req.user;
        const files = req.files;
        if (user.role === "user") return res.status(403).json({
            message:"User not authorized"
        })

        if (!files || files.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Choose at least one media file.",
            });
        }

        const isUser = await Auth.findById(user._id || user.id);

        if (!isUser) {
            return res.status(404).json({
                success: false,
                message: "User not found.",
            });
        }

        const uploadedFiles = [];

        for (const file of files) {
            const folder = path.basename(file.destination);

            // Upload to Cloudinary
            const cloudinaryResponse = await cloudinary.uploader.upload(
                file.path,
                {
                    folder: `kravionatech/${folder}`,
                    resource_type: "auto",
                }
            );

            // Delete local file
            if (fs.existsSync(file.path)) {
                fs.unlinkSync(file.path);
            }

            // Save MongoDB
            const media = await mediaModel.create({
                fileName: file.filename,
                originalName: file.originalname,

                fileUrl: cloudinaryResponse.secure_url,
                publicId: cloudinaryResponse.public_id,

                mimeType: file.mimetype,
                extension: path.extname(file.originalname),
                fileSize: file.size,

                mediaType: file.mimetype.startsWith("image/")
                    ? "image"
                    : file.mimetype.startsWith("video/")
                    ? "video"
                    : file.mimetype.startsWith("audio/")
                    ? "audio"
                    : "document",

                width: cloudinaryResponse.width || null,
                height: cloudinaryResponse.height || null,
                duration: cloudinaryResponse.duration || null,

                userID: isUser._id,
                uploadedBy: isUser._id,

                authorDetails: {
                    name: isUser.name,
                    email: isUser.email,
                    username: isUser.username,
                },

                altText: "",
                isDeleted: false,
            });

            uploadedFiles.push(media);
        }

        return res.status(201).json({
            success: true,
            message: "Media uploaded successfully.",
            count: uploadedFiles.length,
            data: uploadedFiles,
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: error.message,
            data: null,
        });
    }
};



export const getMyMedias = async (req, res) => {
    try {
        const user = req.user;

        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const limit = Math.max(parseInt(req.query.limit) || 25, 1);
        const skip = (page - 1) * limit;

        const filter = {
            userID: user.id,
            isDeleted: false,
        };

        const [media, total] = await Promise.all([
            mediaModel
                .find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),

            mediaModel.countDocuments(filter),
        ]);

        return res.status(200).json({
            success: true,
            message: "Media fetched successfully.",
            data: media,

            pagination: {
                totalItems: total,
                currentPage: page,
                perPage: limit,
                totalPages: Math.ceil(total / limit),
                hasNextPage: page * limit < total,
                hasPreviousPage: page > 1,
            },
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
            data: null,
        });
    }
};

export const deleteMedia = async (req, res) => {
    try {
        const user = req.user;
        const media = await mediaModel.findById(req.params.id);

        if (!media || media.isDeleted) {
            return res.status(404).json({
                success: false,
                message: "Media not found.",
            });
        }

        const isOwner = String(media.userID) === String(user.id || user._id);
        const canManageAll = user.role === "admin" || user.role === "super_admin";

        if (!isOwner && !canManageAll) {
            return res.status(403).json({
                success: false,
                message: "You are not allowed to delete this media.",
            });
        }

        if (media.publicId) {
            try {
                await cloudinary.uploader.destroy(media.publicId, {
                    resource_type: media.mediaType === "video" ? "video" : "image",
                });
            } catch (cloudinaryError) {
                console.error("Cloudinary delete failed:", cloudinaryError.message);
            }
        }

        media.isDeleted = true;
        await media.save();

        return res.status(200).json({
            success: true,
            message: "Media deleted successfully.",
            data: media,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
            data: null,
        });
    }
};
