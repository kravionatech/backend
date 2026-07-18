/**
 * Kraviona Blog — MongoDB Migration Script
 * =========================================
 * Fixes the following issues across all 27 posts:
 *
 * 1.  author.sameAs []  → populate with LinkedIn + Twitter URLs (ALL 27 posts)
 * 2.  author.linkedInUrl missing → add field
 * 3.  publishedAt missing → fallback to createdAt  (11 posts)
 * 4.  canonicalUrl "undefined/blog/..." → fix to "https://kraviona.com/blog/..." (5 posts)
 * 5.  isNoIndex true on published posts → set false (3 posts — roadmap, ai-essay, web3)
 * 6.  wordCount = 0 → recalculate from content  (10 posts)
 * 7.  readingTimeMinutes = 1 when wordCount=0 → recalculate  (same 10 posts)
 * 8.  tags [] → derive from category + focusKeywords  (21 posts)
 * 9.  featuredImage missing → set placeholder path so schema doesn't break (10 posts)
 * 10. schemaType missing → set "BlogPosting" default
 *
 * Run:
 *   node fix-posts-migration.js
 *
 * Requires MONGO_URI in env or .env file.
 */

import "dotenv/config";
import mongoose from "mongoose";

// ─── Connection ────────────────────────────────────────────────────────────────
const MONGO_URI = process.env.MONGO_URI || process.env.DATABASE_URL;
if (!MONGO_URI) {
  console.error("❌  Set MONGO_URI in your .env file");
  process.exit(1);
}

// ─── Constants ─────────────────────────────────────────────────────────────────
const SITE_URL = "https://kraviona.com";
const AUTHOR_SAME_AS = [
  "https://www.linkedin.com/in/amarkumar96085/",
  "https://twitter.com/KravionaTech",
];
const AUTHOR_LINKEDIN = "https://www.linkedin.com/in/amarkumar96085/";
const FALLBACK_IMAGE_URL =
  "https://kraviona.com/og-image.jpg"; // your real OG fallback

// ─── Helpers ───────────────────────────────────────────────────────────────────
const stripHtml = (str = "") =>
  str.replace(/<[^>]*>?/gm, "").replace(/\s+/g, " ").trim();

const wordCount = (content = "") =>
  stripHtml(content).split(/\s+/).filter(Boolean).length;

const readingTime = (words) => Math.max(1, Math.round(words / 200));

const fixCanonical = (slug) => `${SITE_URL}/blog/${slug}`;

/**
 * Derive tags from whatever the post already has.
 * Priority: existing tags → focusKeywords → category name → slug words
 */
const deriveTags = (post) => {
  if (post.tags && post.tags.length > 0) return post.tags;

  const parts = new Set();

  if (post.focusKeywords?.length) {
    post.focusKeywords.forEach((k) => parts.add(k.toLowerCase().trim()));
  }

  if (post.semanticKeywords?.length) {
    post.semanticKeywords.slice(0, 4).forEach((k) => parts.add(k.toLowerCase().trim()));
  }

  if (post.category?.name) {
    parts.add(post.category.name.toLowerCase().trim());
  }

  // Last resort: meaningful words from slug
  if (parts.size === 0 && post.slug) {
    post.slug
      .split("-")
      .filter((w) => w.length > 3 && !["with", "from", "that", "this", "your"].includes(w))
      .slice(0, 5)
      .forEach((w) => parts.add(w));
  }

  return [...parts].slice(0, 10); // max 10 tags
};

// ─── Schema (minimal — only fields we touch) ───────────────────────────────────
const postSchema = new mongoose.Schema(
  {
    slug: String,
    title: String,
    content: String,
    status: String,
    publishedAt: Date,
    createdAt: Date,
    isNoIndex: Boolean,
    canonicalUrl: String,
    schemaType: String,
    wordCount: Number,
    readingTimeMinutes: Number,
    tags: [String],
    focusKeywords: [String],
    semanticKeywords: [String],
    category: { name: String, slug: String },
    author: {
      name: String,
      email: String,
      username: String,
      sameAs: [String],
      linkedInUrl: String,
      avatar: String,
      bio: String,
      jobTitle: String,
    },
    featuredImage: {
      url: String,
      altText: String,
      width: Number,
      height: Number,
    },
  },
  { strict: false, timestamps: true }
);

// ─── Main ──────────────────────────────────────────────────────────────────────
async function run() {
  await mongoose.connect(MONGO_URI);
  console.log("✅  Connected to MongoDB\n");

  const Post = mongoose.models.post || mongoose.model("post", postSchema);
  const posts = await Post.find({}).lean();
  console.log(`📄  Found ${posts.length} posts\n`);

  let fixed = 0;
  const results = [];

  for (const post of posts) {
    const updates = {};
    const issues = [];

    // 1. author.sameAs
    if (!post.author?.sameAs || post.author.sameAs.length === 0) {
      updates["author.sameAs"] = AUTHOR_SAME_AS;
      issues.push("author.sameAs fixed");
    }

    // 2. author.linkedInUrl
    if (!post.author?.linkedInUrl) {
      updates["author.linkedInUrl"] = AUTHOR_LINKEDIN;
      issues.push("author.linkedInUrl fixed");
    }

    // 3. publishedAt
    if (!post.publishedAt) {
      updates.publishedAt = post.createdAt || new Date();
      issues.push("publishedAt set from createdAt");
    }

    // 4. canonicalUrl — "undefined/blog/..." or missing
    if (
      !post.canonicalUrl ||
      post.canonicalUrl.startsWith("undefined") ||
      post.canonicalUrl.trim() === ""
    ) {
      updates.canonicalUrl = fixCanonical(post.slug);
      issues.push(`canonicalUrl fixed → ${updates.canonicalUrl}`);
    }

    // 5. isNoIndex — should never be true on published posts
    if (post.isNoIndex === true && post.status === "published") {
      updates.isNoIndex = false;
      issues.push("isNoIndex set to false (was blocking Google!)");
    }

    // 6 & 7. wordCount + readingTimeMinutes
    if (!post.wordCount || post.wordCount === 0) {
      const wc = wordCount(post.content || "");
      updates.wordCount = wc;
      updates.readingTimeMinutes = readingTime(wc);
      issues.push(`wordCount recalculated: ${wc} words, ${updates.readingTimeMinutes} min read`);
    }

    // 8. tags
    if (!post.tags || post.tags.length === 0) {
      const derived = deriveTags(post);
      if (derived.length > 0) {
        updates.tags = derived;
        issues.push(`tags derived: [${derived.join(", ")}]`);
      }
    }

    // 9. featuredImage — if URL missing, set fallback so schema doesn't output null
    if (!post.featuredImage?.url) {
      updates["featuredImage.url"] = FALLBACK_IMAGE_URL;
      if (!post.featuredImage?.altText) {
        updates["featuredImage.altText"] =
          post.title || "Kraviona Tech Solutions Blog";
      }
      issues.push("featuredImage.url set to fallback");
    }

    // 10. schemaType default
    if (!post.schemaType) {
      updates.schemaType = "BlogPosting";
      issues.push("schemaType set to BlogPosting");
    }

    // ── Apply updates ──────────────────────────────────────────────────────────
    if (Object.keys(updates).length > 0) {
      await Post.updateOne({ _id: post._id }, { $set: updates });
      fixed++;
      results.push({ slug: post.slug, issues });
      console.log(`✔  ${post.slug}`);
      issues.forEach((i) => console.log(`     → ${i}`));
    } else {
      console.log(`✓  ${post.slug} — no issues`);
    }
  }

  console.log(`\n${"─".repeat(60)}`);
  console.log(`Migration complete: ${fixed}/${posts.length} posts updated`);

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("❌  Migration failed:", err);
  process.exit(1);
});