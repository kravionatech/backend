import mongoose from "mongoose";
import slugify from "slugify";

const { Schema, model, models } = mongoose;

const socialLinkSchema = new Schema(
  {
    name: {
      type: String,
      trim: true,
      maxlength: [30, "Social platform name is too long"],
    },
    url: {
      type: String,
      trim: true,
      maxlength: [250, "Social URL is too long"],
    },
  },
  { _id: false },
);

const teamMemberSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [80, "Name should be maximum 80 characters"],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      sparse: true,
      match: [/^\S+@\S+\.\S+$/, "Enter a valid email address"],
    },
    phone: {
      type: String,
      trim: true,
      maxlength: [30, "Phone number is too long"],
    },
    designation: {
      type: String,
      required: [true, "Designation is required"],
      trim: true,
      maxlength: [120, "Designation is too long"],
    },
    department: {
      type: String,
      trim: true,
      maxlength: [80, "Department is too long"],
      default: "General",
    },
    bio: {
      type: String,
      trim: true,
      maxlength: [800, "Bio should be maximum 800 characters"],
    },
    avatar: {
      type: String,
      trim: true,
      maxlength: [300, "Avatar URL is too long"],
    },
    skills: [
      {
        type: String,
        trim: true,
        maxlength: [40, "Skill is too long"],
      },
    ],
    socialLinks: [socialLinkSchema],
    userID: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    order: {
      type: Number,
      default: 0,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
      index: true,
    },
  },
  { timestamps: true },
);

teamMemberSchema.pre("validate", function (next) {
  if (!this.slug && this.name) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  next();
});

teamMemberSchema.index({ status: 1, order: 1, createdAt: -1 });
teamMemberSchema.index({ name: "text", designation: "text", department: "text", skills: "text" });

export const TeamMemberModel =
  models.TeamMember || model("TeamMember", teamMemberSchema);
