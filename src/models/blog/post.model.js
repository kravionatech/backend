import mongoose from "mongoose";

const postSchema = new mongoose.Schema(
  {
    // ==========================================
    // 1. CORE CONTENT & TOPICAL CLUSTERING
    // ==========================================
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [200, "Max 200 characters"],
      minlength: [10, "Min 10 characters"],
      index: true,
      // NOTE: removed `unique` from the original — two genuinely different
      // posts can legitimately share a title (e.g. "Best Laptops 2025" vs
      // "Best Laptops 2026"). Uniqueness is enforced on `slug` instead.
    },

    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
      required: true,
      match: [
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Slug can only contain lowercase letters, numbers, and hyphens",
      ],
      index: true,
    },

    // Automate 301 redirects for changed slugs (now actually populated —
    // see the post('init') + pre('save') hooks below).
    previousSlugs: [
      {
        slug: { type: String },
        addedAt: { type: Date, default: Date.now },
      },
    ],

    content: {
      type: String,
      required: [true, "Content is required"],
      trim: true,
      minlength: [10, "Min 10 characters"],
      maxlength: [20000000, "Max 20000000 characters"],
    },

    excerpt: {
      type: String,
      required: [true, "Excerpt is required"],
      trim: true,
      maxlength: [500, "Max 200 characters"],
      minlength: [10, "Min 10 characters"],
      index: true,
    },

    // ---- AEO: a direct, self-contained answer for voice assistants and
    // "People Also Ask" / featured-snippet boxes. 1-2 sentences, no
    // "as mentioned above" references — it has to stand alone.
    quickAnswer: {
      type: String,
      trim: true,
      maxlength: [320, "Keep the quick answer snippet-sized (~300 chars)"],
    },

    // ---- GEO: standalone, citable facts. AI Overviews / ChatGPT /
    // Perplexity tend to lift bullet-style claims like these almost
    // verbatim when attributing a source.
    keyTakeaways: [{ type: String, trim: true, maxlength: 240 }],

    // ---- AEO: powers an auto-generated table of contents / jump links,
    // and gives crawlers a clean outline of the page (helps sitelinks).
    tableOfContents: [
      {
        heading: { type: String, trim: true },
        anchor: { type: String, trim: true },
        level: { type: Number, min: 2, max: 4, default: 2 },
      },
    ],

    primaryTopicCluster: { type: String, trim: true, index: true },

    // Secondary clusters for pillar-page / topical-authority mapping
    supportingTopicClusters: [{ type: String, trim: true }],

    // Folksonomy tags — distinct from SEO `keywords` below
    tags: [{ type: String, trim: true, lowercase: true }],

    readingTimeMinutes: { type: Number, default: 1 },
    wordCount: { type: Number, default: 0 },

    // ==========================================
    // 2. DETAILED AUTHOR & CATEGORY (E-E-A-T)
    // ==========================================
    userID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    author: {
      name: { type: String, required: true, trim: true },
      email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        match: [/^\S+@\S+\.\S+$/, "Invalid author email"],
      },
      username: { type: String, required: true, trim: true },
      jobTitle: { type: String, trim: true },
      bio: { type: String, trim: true, maxlength: 500 },
      linkedInUrl: { type: String, trim: true },
      sameAs: [{ type: String, trim: true }], // other profile URLs -> schema.org sameAs
      avatar: String,
    },

    // ---- E-E-A-T: who fact-checked / technically reviewed the post, and
    // when. Google explicitly rewards this for YMYL and technical content.
    reviewedBy: {
      name: { type: String, trim: true },
      jobTitle: { type: String, trim: true },
      credentialUrl: { type: String, trim: true },
    },
    lastReviewedAt: { type: Date },
    nextReviewDueAt: { type: Date }, // for scheduling content-freshness audits

    categoryID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },

    category: {
      name: { type: String, required: true, trim: true },
      slug: { type: String, trim: true },
    },

    // ==========================================
    // 3. ENGAGEMENT METRICS
    // ==========================================
    reactions: {
      like: { type: Number, default: 0 },
      dislike: { type: Number, default: 0 },
      share: { type: Number, default: 0 },
    },
    views: { type: Number, default: 0 },

    // ==========================================
    // 4. RESPONSIVE IMAGES & MEDIA
    // ==========================================
    featuredImage: {
      url: { type: String, required: true, trim: true },
      altText: { type: String, required: true, trim: true },
      width: { type: Number },
      height: { type: Number },
      sizeInBytes: { type: Number },
      caption: { type: String, trim: true }, // visible to AI crawlers + screen readers
    },

    gallery: [
      {
        url: { type: String, trim: true },
        altText: { type: String, trim: true },
        caption: { type: String, trim: true },
      },
    ],

    // Video SEO (For Google Video Tab)
    videoEmbedded: {
      hasVideo: { type: Boolean, default: false },
      videoUrl: { type: String, trim: true },
      thumbnailUrl: { type: String, trim: true },
      name: { type: String, trim: true },
      duration: {
        type: String,
        trim: true,
        match: [/^PT(\d+H)?(\d+M)?(\d+S)?$/, "Use ISO 8601 duration, e.g. PT5M30S"],
      },
    },

    // ==========================================
    // 5. DETAILED TECHNICAL SEO & KEYWORDS
    // ==========================================
    metaTitle: {
      type: String,
      trim: true,
      maxlength: [200, "SEO titles max 100 chars"],
      default: function () {
        return this.title ? this.title.slice(0, 120) : "";
      },
    },

    metaDescription: {
      type: String,
      trim: true,
      maxlength: [300, "SEO descriptions max 200 chars"],
      default: function () {
        return this.excerpt ? this.excerpt.slice(0, 300) : "";
      },
    },

    keywords: [{ type: String, trim: true }],
    focusKeywords: [{ type: String, trim: true }],
    semanticKeywords: [{ type: String, trim: true }], // LSI keywords

    canonicalUrl: { type: String, trim: true },
    isNoIndex: { type: Boolean, default: false },
    isNoFollow: { type: Boolean, default: false },

    // ---- which JSON-LD type the frontend should emit (drives rich results)
    schemaType: {
      type: String,
      enum: ["BlogPosting", "Article", "NewsArticle", "HowTo", "Review", "FAQPage"],
      default: "BlogPosting",
    },

    // Escape hatch: hand-author/override JSON-LD per post without a
    // schema migration every time Google adds a new rich-result type.
    structuredDataOverride: { type: mongoose.Schema.Types.Mixed },

    // i18n / hreflang
    language: { type: String, default: "en", trim: true },
    alternateLanguageVersions: [
      {
        language: { type: String, trim: true },
        url: { type: String, trim: true },
      },
    ],

    // ==========================================
    // 6. SOCIAL CARDS (Open Graph & Twitter)
    // ==========================================
    ogTitle: { type: String, trim: true },
    ogDescription: { type: String, trim: true },
    ogImage: { type: String, trim: true },
    twitterTitle: { type: String, trim: true },
    twitterDescription: { type: String, trim: true },
    twitterCard: {
      type: String,
      enum: ["summary", "summary_large_image"],
      default: "summary_large_image",
    },

    // ==========================================
    // 7. RICH SNIPPETS (FAQ) — AEO core
    // ==========================================
    faqSchema: [
      {
        question: { type: String, trim: true },
        answer: { type: String, trim: true },
      },
    ],

    // ==========================================
    // 8. GEO — GENERATIVE ENGINE OPTIMIZATION
    // ==========================================
    // AI Overviews / ChatGPT / Perplexity weigh well-sourced, citable
    // content far more heavily than classic keyword-ranking factors.
    sources: [
      {
        title: { type: String, trim: true },
        url: { type: String, trim: true },
        publisher: { type: String, trim: true },
      },
    ],

    statistics: [
      {
        claim: { type: String, trim: true }, // e.g. "62% of marketers use AI for outlines"
        sourceUrl: { type: String, trim: true },
        year: { type: Number },
      },
    ],

    // Internal Link Sculpting
    relatedPosts: [{ type: mongoose.Schema.Types.ObjectId, ref: "post" }],

    // Paywall / SGE access info
    isAccessibleForFree: { type: Boolean, default: true },

    // ==========================================
    // 9. STATUS, PROVENANCE & GOVERNANCE
    // ==========================================
    status: {
      type: String,
      enum: ["published", "draft", "archived", "scheduled"],
      default: "draft",
    },

    // Separate from createdAt so you can schedule/backdate without lying
    // about when the document actually entered the DB.
    publishedAt: { type: Date },
    scheduledAt: { type: Date },

    // Track AI vs Human content (Google 2026 guidelines)
    contentSourceType: {
      type: String,
      enum: ["Human", "AI-Assisted", "AI-Generated"],
      default: "Human",
    },

    // ==========================================
    // 10. COMMENT SYSTEM & MODERATION
    // ==========================================
    isCommentEnabled: {
      type: Boolean,
      default: true, // Admin can disable comments for controversial posts
    },
    commentCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

// ==========================================
// INDEXES
// ==========================================
postSchema.index({ status: 1, publishedAt: -1 }); // homepage / listing feeds
postSchema.index({ status: 1, scheduledAt: 1 }); // scheduled publishing lookup
postSchema.index({ categoryID: 1, status: 1, publishedAt: -1 }); // category pages
postSchema.index({ tags: 1 });
postSchema.index(
  { title: "text", excerpt: "text", content: "text", keywords: "text", tags: "text" },
  {
    weights: { title: 5, excerpt: 3, keywords: 3, tags: 2, content: 1 },
    name: "PostSearchIndex",
  },
);

// ==========================================
// HOOKS
// ==========================================

// Capture the slug as it exists right after the doc is loaded from the DB,
// so the pre('save') hook below can tell whether it actually changed.
postSchema.post("init", function () {
  this._originalSlug = this.slug;
});

// BUG FIX: featuredImage.altText previously used a field-level `default`
// function reading `this.focusKeywords[0]`. Mongoose evaluates field
// defaults in schema-definition order at document construction — since
// `featuredImage` is defined before `focusKeywords`, that value wasn't
// reliably available yet, so altText silently became `undefined` and
// failed its own `required: true` check. A pre('validate') hook runs
// after every field on the instance has been assigned, so it's safe.
postSchema.pre("validate", function (next) {
  if (!this.featuredImage?.altText && this.focusKeywords?.length) {
    this.featuredImage.altText = this.focusKeywords[0];
  }

  if (this.status === "scheduled" && !this.scheduledAt) {
    this.invalidate("scheduledAt", "Scheduled date is required");
  }

  next();
});

// Track slug history for 301s, auto-stamp publishedAt on first publish,
// and keep wordCount / readingTime in sync with the actual content.
postSchema.pre("save", function (next) {
  if (!this.isNew && this.isModified("slug") && this._originalSlug && this._originalSlug !== this.slug) {
    this.previousSlugs.push({ slug: this._originalSlug });
  }

  if (this.isModified("status") && this.status === "published" && !this.publishedAt) {
    this.publishedAt = new Date();
  }

  if (this.isModified("status") && this.status !== "scheduled") {
    this.scheduledAt = undefined;
  }

  if (this.isModified("content")) {
    const words = this.content.trim().split(/\s+/).filter(Boolean).length;
    this.wordCount = words;
    this.readingTimeMinutes = Math.max(1, Math.round(words / 200)); // ~200 wpm
  }

  next();
});

export const PostModel =
  mongoose.models.post || mongoose.model("post", postSchema);
