import multer from "multer";
import fs from "fs";
import path from "path";

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let folder = "others";

        if (file.mimetype.startsWith("image/")) {
            folder = "images";
        } else if (file.mimetype.startsWith("video/")) {
            folder = "videos";
        } else if (file.mimetype.startsWith("audio/")) {
            folder = "audio";
        } else if (
            file.mimetype === "application/pdf" ||
            file.mimetype.includes("word") ||
            file.mimetype.includes("document") ||
            file.mimetype.includes("sheet") ||
            file.mimetype.includes("presentation") ||
            file.mimetype.includes("text")
        ) {
            folder = "documents";
        }

        const uploadLocation = path.join(
            process.cwd(),
            "public",
            "uploads",
            folder
        );

        if (!fs.existsSync(uploadLocation)) {
            fs.mkdirSync(uploadLocation, { recursive: true });
        }

        cb(null, uploadLocation);
    },

    filename: (req, file, cb) => {
        const uniqueSuffix =
            Date.now() + "-" + Math.round(Math.random() * 1e9);

        cb(
            null,
            `${file.fieldname}-${uniqueSuffix}${path.extname(
                file.originalname
            )}`
        );
    },
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        // Images
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",

        // Videos
        "video/mp4",
        "video/mpeg",
        "video/quicktime",
        "video/x-matroska",
        "video/webm",

        // Audio
        "audio/mpeg",
        "audio/mp3",
        "audio/wav",

        // Documents
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-powerpoint",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "text/plain",
    ];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Unsupported file type"), false);
    }
};

export const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 1024 * 1024 * 1024, // 1 GB
    },
});