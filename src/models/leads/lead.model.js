import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

/* ── Activity log (embedded) ─────────────────────────────────────
   Every action taken on a lead (call, email, note, status change)
   is stored as a sub-document so the full timeline lives in one place.
──────────────────────────────────────────────────────────────── */
const activitySchema = new Schema(
  {
    type: {
      type: String,
      enum: ["note", "call", "email", "meeting", "status_change", "other"],
      required: true,
    },
    description: {
      type: String,
      trim: true,
    },
    performedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

/* ── Main Lead schema ────────────────────────────────────────── */
const leadSchema = new Schema(
  {
    /* ── Contact info ── */
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Invalid email address"],
    },
    phone: {
      type: String,
      trim: true,
    },
    company: {
      type: String,
      trim: true,
    },
    designation: {
      type: String,
      trim: true,
    },
    subject: {
      type: String,
      required: [true, "Subject is required"],
      trim: true,
      maxlength: [150, "Subject should be maximum 150 characters"],
    },
    message: {
      type: String,
      required: [true, "Message is required"],
      trim: true,
      maxlength: [3000, "Message should be maximum 3000 characters"],
    },
    leadType: {
      type: String,
      trim: true,
      default: "service-popup",
      enum: ["service-popup", "contact-form", "other"],
    },
    page: {
      type: String,
      trim: true,
      maxlength: [300, "Page should be maximum 300 characters"],
    },
    service: {
      type: String,
      trim: true,
      maxlength: [150, "Service should be maximum 150 characters"],
    },
    budget: {
      type: String,
      trim: true,
      maxlength: [100, "Budget should be maximum 100 characters"],
    },

    /* ── Pipeline ── */
    status: {
      type: String,
      enum: ["New", "Contacted", "Qualified", "Proposal", "Won", "Lost"],
      default: "New",
    },
    source: {
      type: String,
      enum: ["Website", "LinkedIn", "Referral", "Cold Email", "Inbound", "Social Media", "Other"],
      default: "Other",
    },
    score: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    /* ── Deal ── */
    dealValue: {
      type: Number,
      default: 0,
    },
    currency: {
      type: String,
      default: "INR",
    },
    expectedCloseDate: {
      type: Date,
    },

    /* ── Assignment ── */
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    /* ── Notes & timeline ── */
    notes: {
      type: String,
      trim: true,
    },
    activities: [activitySchema],

    /* ── Tags ── */
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],

    /* ── Meta ── */
    isArchived: {
      type: Boolean,
      default: false,
    },
    convertedAt: {
      type: Date,
    },
    lostReason: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/* ── Indexes ─────────────────────────────────────────────────── */
leadSchema.index({ email: 1 }, { unique: true });
leadSchema.index({ status: 1 });
leadSchema.index({ assignedTo: 1 });
leadSchema.index({ source: 1 });
leadSchema.index({ createdAt: -1 });
leadSchema.index({ score: -1 });

/* ── Virtual: formatted deal value ──────────────────────────── */
leadSchema.virtual("formattedDealValue").get(function () {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: this.currency || "INR",
    maximumFractionDigits: 0,
  }).format(this.dealValue || 0);
});

/* ── Pre-save: auto-set convertedAt when status → Won ───────── */
leadSchema.pre("save", function (next) {
  if (this.isModified("status")) {
    if (this.status === "Won" && !this.convertedAt) {
      this.convertedAt = new Date();
    }
    if (this.status !== "Won") {
      this.convertedAt = undefined;
    }
  }
  next();
});

const Lead = models.Lead || model("Lead", leadSchema);

export default Lead;
