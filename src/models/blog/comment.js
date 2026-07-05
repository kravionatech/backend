import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    postID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "post",
      required: true,
      index: true,
    },
    postSlug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    authorName: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [80, "Name must be less than 80 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Enter a valid email address"],
      select: false,
    },
    website: {
      type: String,
      trim: true,
      maxlength: [200, "Website URL is too long"],
    },
    comment: {
      type: String,
      required: [true, "Comment is required"],
      trim: true,
      minlength: [3, "Comment must be at least 3 characters"],
      maxlength: [2000, "Comment must be less than 2000 characters"],
    },
    status: {
      type: String,
      enum: ["approved", "pending", "spam", "trash"],
      default: "approved",
      index: true,
    },
    likes: {
      type: Number,
      default: 0,
      min: 0,
    },
    ipHash: {
      type: String,
      select: false,
    },
    userAgent: {
      type: String,
      select: false,
    },
  },
  { timestamps: true },
);

commentSchema.index({ postID: 1, status: 1, createdAt: -1 });
commentSchema.index({ postSlug: 1, status: 1, createdAt: -1 });

export const CommentModel =
  mongoose.models.Comment || mongoose.model("Comment", commentSchema);
