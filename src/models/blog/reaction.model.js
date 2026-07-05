import mongoose from "mongoose";

const reactionSchema = new mongoose.Schema(
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
    visitorId: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    type: {
      type: String,
      enum: ["like", "dislike", "share", "view"],
      required: true,
      index: true,
    },
    shareChannel: {
      type: String,
      trim: true,
      maxlength: 40,
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

reactionSchema.index({ postID: 1, visitorId: 1, type: 1 }, { unique: true });
reactionSchema.index({ postID: 1, type: 1 });

export const PostReactionModel =
  mongoose.models.PostReaction ||
  mongoose.model("PostReaction", reactionSchema);
