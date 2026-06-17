import mongoose, { Schema, model } from "mongoose";

const userSchema = new Schema(
  {
    // ==========================================
    // 1. BASIC INFO (Cleaned & Fixed)
    // ==========================================
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      match: [
        /^[A-Za-z]+(?:\s[A-Za-z]+)*$/,
        "Enter a valid name (alphabets only)",
      ],
      minlength: [3, "Name should be at least 3 characters"],
      maxlength: [50, "Name should be maximum 50 characters"], // Increased slightly for full names
    },

    email: {
      type: String,
      required: [true, "Email ID is required"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/,
        "Enter a valid Email ID",
      ],
    },

    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true,
      match: [
        /^[a-zA-Z0-9_]+$/,
        "Username can only contain letters, numbers, and underscores",
      ],
      minlength: [3, "Username should be at least 3 characters"],
      maxlength: [32, "Username should be maximum 32 characters"],
    },

    phone: {
      type: String,
      required: [true, "Phone number is required"], // FIXED message
      unique: true,
      trim: true,
      
    },

    avatar: {
      // FIXED: Removed duplicate
      type: String,
      validate: {
        validator: function (v) {
          if (!v) return true; // Optional field
          return /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/i.test(v);
        },
        message: (props) => `${props.value} is not a valid URL!`,
      },
      default: "https://api.kraviona.com/avatar.png",
    },

    // ==========================================
    // 2. AUTHENTICATION & SECURITY
    // ==========================================
    password: {
      type: String,
    },

    role: {
      type: String,
      default: "user",
      // 5-role hierarchy matching API_GUIDE.md
      enum: ["super_admin", "admin", "editor", "viewer", "user"],
    },


    isActive: { type: Boolean, default: true },

    // Advanced Security / Brute Force Protection
    loginAttempts: { type: Number, default: 0, select: false },
    lockUntil: { type: Date, select: false },
    lastLoginAt: { type: Date },

    // Password Reset System
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },

    // ==========================================
    // 3. OAUTH / SOCIAL LOGIN (Future Proofing) (google Id and Github ID)
    // ==========================================
  
    authProviders: {
      googleId: { type: String, default: null },
      githubId: { type: String, default: null }, 
    },

    // ==========================================
    // 4. VERIFICATION SYSTEM
    // ==========================================
    isVerified: { type: Boolean, default: false }, 
    verification: {
      emailOtp: { type: String, default: null, select: false },
      emailOtpExpires: {
        type: Date,
        select: false,
        default: function () {
          return new Date(Date.now() + 5 * 60 * 1000);
        },
      },
      phoneOtp: { type: String, default: null, select: false },
      phoneOtpExpires: { type: Date, select: false },
    },

    // ==========================================
    // 5. PUBLIC PROFILE & E-E-A-T (SEO Connection)
    // ==========================================

    profile: {
      bio: { type: String, maxlength: 500, trim: true },
      jobTitle: { type: String, trim: true, maxlength: 100 }, // e.g., "MERN Stack Developer"
      socialLinks: [
        {
          name: {
            type: String,
            trim: true,
            required: [true, "Social platform name is required"],
            minlength: [2, "Platform name must be at least 2 characters"],
            maxlength: [30, "Platform name cannot exceed 30 characters"],
            match: [
              /^[a-zA-Z0-9\s.-]+$/,
              "Platform name can only contain letters, numbers, spaces, dots, and hyphens",
            ],
          },
          url: {
            type: String,
            trim: true,
            required: [true, "Profile URL is required"],
            match: [
              /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/i,
              "Enter a valid URL",
            ],
          },
        },
      ],
    },

    
    // ==========================================
    // 6. PREFERENCES
    // ==========================================
    preferences: {
      theme: {
        type: String,
        enum: ["light", "dark", "system"],
        default: "dark",
      },
      emailNotifications: { type: Boolean, default: true },
    },
  },
  { timestamps: true },
);

// ==========================================
// METHODS & VIRTUALS
// ==========================================

// Virtual for checking if account is locked
userSchema.virtual("isLocked").get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

export const Auth = mongoose.models.User || model("User", userSchema);
