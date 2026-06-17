import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Category name is required"],
      unique: true,
      trim: true,
      minlength: [3, "Category name must be at least 3 characters long"],
      maxlength: [50, "Category name must be less than 50 characters long"],
      match: [
        /^[a-zA-Z0-9\s]+$/,
        "Category name can only contain letters, numbers, and spaces",
      ],
      index: true,
      lowercase: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [
        200,
        "Category description must be less than 200 characters long",
      ],
    },

    slug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      unique: true,
      match: [
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Slug can only contain lowercase letters, numbers, and hyphens",
      ],
      default: function () {
        return this.name.toLowerCase().replace(/\s+/g, "-");
      },
    },

    userID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    authorDetails: {
      name: {
        type: String,
        required: true,
        trim: true,
        maxlength: [32, "Author name must be less than 32 characters long"],
      },
      email: {
        type: String,
        required: true,
        trim: true,
        maxlength: [64, "Author email must be less than 64 characters long"],
        match: [
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
          "Author email must be a valid email address",
        ],
      },
      avatar: String,

      username: {
        type: String,
        required: true,
        trim: true,
        maxlength: [32, "Author username must be less than 32 characters long"],
        match: [
          /^[a-zA-Z0-9_]+$/,
          "Author username can only contain letters, numbers, and underscores",
        ],
      },
    },

    status: {
      type: String,
      enum: ["published", "draft", "archived"],
      default: "published",
    },

    postCount: {
      type: Number,
      default: 0,
      min: [0, "Post count cannot be negative"],
    },

    // Add any additional fields as needed, such as SEO metadata, parent category reference, etc.
    metaTitle: {
      type: String,
      trim: true,
      maxlength: [60, "Meta title must be less than 60 characters"],
    },

    metaDescription: {
      type: String,
      trim: true,
      maxlength: [160, "Meta description must be less than 160 characters"],
    },

    metaKeywords: {
      type: [String],
      default: [],
    },

    canonicalUrl: {
      type: String,
      trim: true,
    },

    ogTitle: {
      type: String,
      trim: true,
    },

    ogDescription: {
      type: String,
      trim: true,
    },

    ogImage: {
      type: String,
      trim: true,
    },

    twitterTitle: {
      type: String,
      trim: true,
    },

    twitterDescription: {
      type: String,
      trim: true,
    },

    twitterImage: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

export const CategoryModel = mongoose.model("Category", categorySchema);
