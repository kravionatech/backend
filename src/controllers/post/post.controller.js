import { Auth } from "../../models/auth/auth.models.js";
import { CategoryModel } from "../../models/blog/category.model.js";
import { PostModel } from "../../models/blog/post.model.js";
import slugify from "slugify";

export const createPost = async (req, res) => {
    try {
        const user = req.user;

        if (!user) {
            return res.status(401).json({ message: "Unauthorized", success: false });
        }

        if (user.role === "user" || user.role === "support") {
            return res.status(403).json({
                message: "Forbidden: You do not have permission to create a post",
                success: false,
            });
        }

        const existingUser = await Auth.findById(user.id)
console.log(existingUser)
        if (!existingUser) {
            return res.status(404).json({ message: "User not found", success: false });
        }

        if (!existingUser.isActive) {
            return res.status(403).json({
                message: "Forbidden: Your account is inactive",
                success: false,
            });
        }

        // FIX: categoryID was incorrectly placed outside the destructured object.
        // It is now destructured separately from req.body.
        const {
            title,
            slug,
            content,
            excerpt,
            primaryTopicCluster,
            readingTimeMinutes,
            featuredImage,
            videoEmbedded,
            metaTitle,
            metaDescription,
            keywords,
            focusKeywords,
            semanticKeywords,
            canonicalUrl,
            isNoIndex,
            isNoFollow,
            ogTitle,
            ogDescription,
            twitterTitle,
            twitterDescription,
            faqSchema,
            knowledgeGraph,
            relatedPosts,
            isAccessibleForFree,
            status,
            contentSourceType,
            isCommentEnabled,
            category,       // FIX: moved inside the destructure
        } = req.body;

        // FIX: categoryID added to required-field validation
        const requiredFields = {
            title,
            slug,
            content,
            excerpt,
            primaryTopicCluster,
            readingTimeMinutes,
            featuredImage,
            videoEmbedded,
            metaTitle,
            metaDescription,
            keywords,
            focusKeywords,
            semanticKeywords,
            canonicalUrl,
            isNoIndex,
            isNoFollow,
            ogTitle,
            ogDescription,
            twitterTitle,
            twitterDescription,
            faqSchema,
            knowledgeGraph,
            relatedPosts,
            isAccessibleForFree,
            status,
            contentSourceType,
            isCommentEnabled,
         category
        };

        for (const [field, value] of Object.entries(requiredFields)) {
            if (value === undefined || value === null || value === "") {
                return res.status(400).json({ message: `${field} is required`, success: false });
            }
        }

        const existingPost = await PostModel.findOne({
            $or: [
                { slug: slug.toLowerCase().trim() },
                { title: title.toLowerCase().trim() },
                { keywords: { $in: keywords.map((k) => k.toLowerCase().trim()) } },
            ],
        });

        if (existingPost) {
            return res.status(400).json({ message: "Post already exists", success: false });
        }

        // FIX: removed the $or syntax error (missing comma) and separated the
        // status check into a proper $and condition so it's always enforced.
        const isCategory = await CategoryModel.findOne({
            $and: [
                {
                    $or: [
                        { name: category },
                        { slug: slugify(category.toLowerCase().trim(), { lower: true, strict: true }) },
                    ],
                },
                { status: "published" },
            ],
        });

        if (!isCategory) {
            return res.status(404).json({ message: "Category not found", success: false });
        }

        const post = new PostModel({
            title: title.toLowerCase().trim(),
            slug: slugify(slug.toLowerCase().trim(), { lower: true, strict: true }),
            content: content.trim(),
            excerpt: excerpt.trim(),
            primaryTopicCluster: primaryTopicCluster.trim(),
            readingTimeMinutes: Number(readingTimeMinutes), // FIX: coerce to number
            featuredImage,
            videoEmbedded,
            metaTitle: metaTitle.trim(),
            metaDescription: metaDescription.trim(),
            keywords: keywords.map((k) => k.toLowerCase().trim()),
            focusKeywords: focusKeywords.map((k) => k.toLowerCase().trim()),
            semanticKeywords: semanticKeywords.map((k) => k.toLowerCase().trim()),
            canonicalUrl: canonicalUrl.trim(),
            isNoIndex,
            isNoFollow,
            ogTitle: ogTitle.trim(),
            ogDescription: ogDescription.trim(),
            twitterTitle: twitterTitle.trim(),
            twitterDescription: twitterDescription.trim(),
            faqSchema,
            knowledgeGraph,
            relatedPosts,
            isAccessibleForFree,
            status,
            contentSourceType,
            isCommentEnabled,
            userID: existingUser._id,
            author: {
                name: existingUser.name,
                email: existingUser.email,
                avatar: existingUser.avatar,
                username: existingUser.username,
            },
            categoryID: isCategory._id,
            category: {
                name: isCategory.name,
                slug: isCategory.slug,
                status: isCategory.status,
            },
        });

        await post.save();
        return res.status(201).json({
            message: "Post created successfully",
            success: true,
            data: post,
        });

    } catch (error) {
        return res.status(500).json({ message: error.message, success: false });
    }
};

export const publicPosts = async(req,res)=>{
    try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [posts, totalPosts] = await Promise.all([
        PostModel.find({ status: "published" })
            .select(
                "title slug excerpt author category reaction views featuredImage contentSourceType commentCount"
            )
            .skip(skip)
            .limit(limit),

        PostModel.countDocuments({ status: "published" })
    ]);

    return res.status(200).json({
        success: true,
        message: posts.length ? "Posts found" : "No posts found",
        data: posts,
        pagination: {
            totalPosts,
            currentPage: page,
            totalPages: Math.ceil(totalPosts / limit),
            limit,
            hasNextPage: page < Math.ceil(totalPosts / limit),
            hasPreviousPage: page > 1,
        },
    });

} catch (error) {
    return res.status(500).json({
        success: false,
        message: error.message,
    });
}
}


export const privatePosts = async (req, res) => {
    try {
        const user = req.user;

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }

        const allowedRoles = ["admin", "super_admin", "editor"];

        if (!allowedRoles.includes(user.role)) {
            return res.status(403).json({
                success: false,
                message: "Access Denied",
            });
        }

        const posts = await PostModel.find({
            userID:user.id
        }).select(
                "title slug excerpt author category reaction views featuredImage contentSourceType commentCount createdAt updatedAt status"
            );

        return res.status(200).json({
            success: true,
            message: "Posts fetched successfully",
            data: posts,
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// =========================================
// 4. Delete Post
// ========================================

export const deletePost = async (req, res) => {
    try {
        const user = req.user;

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }

        let post;

        if (user.role === "super_admin") {
            // Super admin can delete any post
            post = await PostModel.findById(req.params.id);
        } else {
            // User can delete only their own post
            post = await PostModel.findOne({
                _id: req.params.id,
                userID: user.id,
            });
        }

        if (!post) {
            return res.status(404).json({
                success: false,
                message: "Post not found or you don't have permission.",
            });
        }

        await post.deleteOne();

        return res.status(200).json({
            success: true,
            message: "Post deleted successfully.",
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// =========================================
// 5.  Update post
// ========================================


// =========================================
// 6.  Public View post
// ========================================
export const singleViewPost = async (req, res) => {
    try {
        const { slug } = req.params;

        if (!slug) {
            return res.status(400).json({
                success: false,
                message: "Slug is required"
            });
        }

        const blog = await PostModel.findOne({ slug });

        if (!blog) {
            return res.status(404).json({
                success: false,
                message: "Blog not found"
            });
        }

        return res.status(200).json({
            success: true,
            data: blog
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
// =========================================
// 7.  Private view post
// ========================================

