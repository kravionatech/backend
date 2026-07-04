import { Auth } from "../../models/auth/auth.models.js";
import { CategoryModel } from "../../models/blog/category.model.js";
import slugify from "slugify";

export const createCategory = async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized", success: false });
if(user.role ==="user") return res.status(403).json({
  message:"User Not authorized"
})
    const isExist = await Auth.findById(user.id);
    if (!isExist) return res.status(404).json({ message: "User not found", success: false });

    const {
      name, description, slug, status,
      metaTitle, metaDescription, metaKeywords, canonicalUrl,
      ogTitle, ogDescription, ogImage,
      twitterTitle, twitterDescription, twitterImage
    } = req.body;

    if (!name) return res.status(400).json({ message: "Name is required", success: false });
    if (!description) return res.status(400).json({ message: "Description is required", success: false });
    if (!slug) return res.status(400).json({ message: "Slug is required", success: false });

    const isCategory = await CategoryModel.findOne({
      $or: [{ name: name.toLowerCase().trim() }, { slug: slug.toLowerCase().trim() }]
    }).select("name slug");
    if (isCategory) return res.status(409).json({ message: "Category already exists", success: false });

    const category = new CategoryModel({
      name: name.toLowerCase().trim(),
      description: description.trim(),
      slug:slugify(slug.toLowerCase().trim(), { lower: true, strict: true }),
      status: status || "published",
      metaTitle: metaTitle || "",
      metaDescription: metaDescription || "",
      metaKeywords: metaKeywords || [],
      canonicalUrl: canonicalUrl || "",
      ogTitle: ogTitle || "",
      ogDescription: ogDescription || "",
      ogImage: ogImage || "",
      twitterTitle: twitterTitle || "",
      twitterDescription: twitterDescription || "",
      twitterImage: twitterImage || "",
      userID: user.id,
      authorDetails: {
        name: isExist.name,
        email: isExist.email,
        avatar: isExist.avatar,
        username: isExist.username,
      },
      postCount: 0,
    });

    await category.save();
    return res.status(201).json({ message: "Category created successfully", success: true, data: category });
  } catch (error) {
    return res.status(500).json({ message: error.message, success: false });
  }
};

// Public — published only
export const getCategories = async (req, res) => {
  try {
    const categories = await CategoryModel.find({ status: "published" })
      .select("-__v")
      .sort({ createdAt: -1 });
    return res.status(200).json({
      message: categories.length ? "Categories found" : "No categories found",
      success: true,
      data: categories,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message, success: false });
  }
};

// Admin — all categories with pagination + filter
export const getAllCategories = async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized", success: false });

    const { status, page = 1, limit = 10, search } = req.query;
    const query = {
      userID: user.id,
    };
    if (user.role === "user") {
      return res.status(403).json({ message: "Forbidden (Not An Admin)", success: false });
    } else {
      if (user.role === "admin" || user.role === "super_admin" || user.role === "editor") {
        if (status) query.status = status;
        if (search) query.name = { $regex: search, $options: "i" };
        const categories = await CategoryModel.find(query)
          .select("-__v")
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(parseInt(limit));
        
        console.log(categories,"cate");
        

        const total = await CategoryModel.countDocuments(query);
        return res.status(200).json({
          message: categories.length ? "Categories found" : "No categories found",
          success: true,
          data: categories,
          pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(total / limit),
          },
        });
      }
    }

  } catch (error) {
    return res.status(500).json({ message: error.message, success: false });
  }
};

// Get single category by ID or slug
export const getCategoryByIdOrSlug = async (req, res) => {
  try {
    const { id } = req.params;
    const isObjectId = id.match(/^[0-9a-fA-F]{24}$/);
    const category = await CategoryModel.findOne(
      isObjectId ? { _id: id } : { slug: id }
    ).select("-__v");

    if (!category) return res.status(404).json({ message: "Category not found", success: false });
    return res.status(200).json({ message: "Category found", success: true, data: category });
  } catch (error) {
    return res.status(500).json({ message: error.message, success: false });
  }
};

// Update category
export const updateCategory = async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized", success: false });

    const { id } = req.params;
    const category = await CategoryModel.findById(id);
    if (!category) return res.status(404).json({ message: "Category not found", success: false });

    const {
      name, description, slug, status,
      metaTitle, metaDescription, metaKeywords, canonicalUrl,
      ogTitle, ogDescription, ogImage,
      twitterTitle, twitterDescription, twitterImage
    } = req.body;

    // Conflict check — exclude current doc
    if (name || slug) {
      const conflictQuery = { _id: { $ne: id }, $or: [] };
      if (name) conflictQuery.$or.push({ name: name.toLowerCase().trim() });
      if (slug) conflictQuery.$or.push({ slug: slug.toLowerCase().trim() });

      if (conflictQuery.$or.length) {
        const conflict = await CategoryModel.findOne(conflictQuery).select("name slug");
        if (conflict) return res.status(409).json({ message: "Name or slug already in use", success: false });
      }
    }

    const updates = {
      ...(name && { name: name.toLowerCase().trim() }),
      ...(description && { description: description.trim() }),
      ...(slug && { slug: slug.toLowerCase().trim() }),
      ...(status && { status }),
      ...(metaTitle !== undefined && { metaTitle }),
      ...(metaDescription !== undefined && { metaDescription }),
      ...(metaKeywords !== undefined && { metaKeywords }),
      ...(canonicalUrl !== undefined && { canonicalUrl }),
      ...(ogTitle !== undefined && { ogTitle }),
      ...(ogDescription !== undefined && { ogDescription }),
      ...(ogImage !== undefined && { ogImage }),
      ...(twitterTitle !== undefined && { twitterTitle }),
      ...(twitterDescription !== undefined && { twitterDescription }),
      ...(twitterImage !== undefined && { twitterImage }),
    };

    const updated = await CategoryModel.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select("-__v");

    return res.status(200).json({ message: "Category updated successfully", success: true, data: updated });
  } catch (error) {
    return res.status(500).json({ message: error.message, success: false });
  }
};

// Delete category
export const deleteCategory = async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized", success: false });

    const { id } = req.params;
    const category = await CategoryModel.findById(id);
    if (!category) return res.status(404).json({ message: "Category not found", success: false });

    // Optional: block deletion if posts are attached
    if (category.postCount > 0) {
      return res.status(400).json({
        message: `Cannot delete — category has ${category.postCount} post(s) attached`,
        success: false,
      });
    }

    await CategoryModel.findByIdAndDelete(id);
    return res.status(200).json({ message: "Category deleted successfully", success: true });
  } catch (error) {
    return res.status(500).json({ message: error.message, success: false });
  }
};
