import crypto from "crypto";
import { CommentModel } from "../../models/blog/comment.js";
import { PostModel } from "../../models/blog/post.model.js";
import { PostReactionModel } from "../../models/blog/reaction.model.js";

const REACTION_TYPES = ["like", "dislike", "share"];
const VIEW_BOT_PATTERN =
  /bot|crawler|spider|crawling|preview|facebookexternalhit|slurp|bingpreview|whatsapp|telegram|discord|linkedinbot|twitterbot|google-inspectiontool|googlebot|adsbot|mediapartners-google|duckduckbot|baiduspider|yandex|sogou|semrush|ahrefs|mj12bot|dotbot|petalbot|applebot|gptbot|claudebot|perplexitybot/i;

const cleanText = (value = "") => String(value).trim();

const getIpHash = (req) => {
  const rawIp =
    req.headers["x-forwarded-for"]?.split(",")[0] ||
    req.socket?.remoteAddress ||
    "";

  return rawIp
    ? crypto.createHash("sha256").update(rawIp).digest("hex")
    : "";
};

const getVisitorId = (req) =>
  cleanText(req.body?.visitorId || req.headers["x-visitor-id"] || "");

const findPublishedPost = async (slug) =>
  PostModel.findOne({ slug: cleanText(slug).toLowerCase(), status: "published" });

const isLikelyBotRequest = (req) => {
  const userAgent = cleanText(req.headers["user-agent"]);
  const secFetchMode = cleanText(req.headers["sec-fetch-mode"]);
  const secFetchDest = cleanText(req.headers["sec-fetch-dest"]);

  return (
    !userAgent ||
    VIEW_BOT_PATTERN.test(userAgent) ||
    secFetchMode === "navigate" ||
    secFetchDest === "document"
  );
};

const publicCommentSelect = "authorName website comment status likes createdAt";

const getSelectedPostReaction = async (postID, visitorId) => {
  if (!visitorId) return "";

  const reaction = await PostReactionModel.findOne({
    postID,
    visitorId,
    type: { $in: ["like", "dislike"] },
  })
    .select("type")
    .lean();

  return reaction?.type || "";
};

const getEngagementSummary = async (post) => {
  const [reactionCounts, approvedCommentCount] = await Promise.all([
    PostReactionModel.aggregate([
      { $match: { postID: post._id } },
      { $group: { _id: "$type", count: { $sum: 1 } } },
    ]),
    CommentModel.countDocuments({ postID: post._id, status: "approved" }),
  ]);

  const counts = reactionCounts.reduce((acc, item) => {
    acc[item._id] = item.count;
    return acc;
  }, {});

  return {
    views: Math.max(post.views || 0, counts.view || 0, 0),
    likes: Math.max(post.reactions?.like || 0, counts.like || 0, 0),
    dislikes: Math.max(post.reactions?.dislike || 0, counts.dislike || 0, 0),
    shares: Math.max(post.reactions?.share || 0, counts.share || 0, 0),
    commentCount: Math.max(post.commentCount || 0, approvedCommentCount || 0, 0),
  };
};

const handleEngagementError = (error, res) => {
  if (error.name === "ValidationError") {
    const errors = Object.values(error.errors).map((err) => err.message);
    return res.status(400).json({
      success: false,
      message: errors[0],
      errors,
    });
  }

  if (error.code === 11000) {
    return res.status(409).json({
      success: false,
      message: "This action has already been recorded.",
    });
  }

  return res.status(500).json({
    success: false,
    message: error.message || "Unable to update blog engagement.",
  });
};

export const getPostEngagement = async (req, res) => {
  try {
    const { slug } = req.params;
    const visitorId = cleanText(req.query.visitorId);
    const post = await findPublishedPost(slug);

    if (!post) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }

    const [comments, selectedReaction, summary] = await Promise.all([
      CommentModel.find({ postID: post._id, status: "approved" })
        .select(publicCommentSelect)
        .sort({ createdAt: -1 })
        .limit(50)
        .lean(),
      getSelectedPostReaction(post._id, visitorId),
      getEngagementSummary(post),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        postSlug: post.slug,
        isCommentEnabled: post.isCommentEnabled,
        selectedReaction,
        summary,
        comments,
      },
    });
  } catch (error) {
    return handleEngagementError(error, res);
  }
};

export const createPostComment = async (req, res) => {
  try {
    const { slug } = req.params;
    const post = await findPublishedPost(slug);

    if (!post) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }

    if (!post.isCommentEnabled) {
      return res.status(403).json({
        success: false,
        message: "Comments are disabled for this post.",
      });
    }

    const payload = {
      authorName: cleanText(req.body?.authorName || req.body?.name),
      email: cleanText(req.body?.email).toLowerCase(),
      website: cleanText(req.body?.website),
      comment: cleanText(req.body?.comment),
    };

    const comment = await CommentModel.create({
      ...payload,
      postID: post._id,
      postSlug: post.slug,
      ipHash: getIpHash(req),
      userAgent: cleanText(req.headers["user-agent"]).slice(0, 300),
    });

    const updatedPost = await PostModel.findByIdAndUpdate(
      post._id,
      { $inc: { commentCount: 1 } },
      { new: true },
    );
    const summary = await getEngagementSummary(updatedPost || post);

    return res.status(201).json({
      success: true,
      message: "Comment added successfully.",
      data: {
        comment: {
          _id: comment._id,
          authorName: comment.authorName,
          website: comment.website,
          comment: comment.comment,
          status: comment.status,
          likes: comment.likes,
          createdAt: comment.createdAt,
        },
        summary,
      },
    });
  } catch (error) {
    return handleEngagementError(error, res);
  }
};

export const recordPostView = async (req, res) => {
  try {
    const { slug } = req.params;
    const visitorId = getVisitorId(req);

    if (!visitorId) {
      return res.status(400).json({
        success: false,
        message: "Visitor id is required.",
      });
    }

    const post = await findPublishedPost(slug);

    if (!post) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }

    if (isLikelyBotRequest(req)) {
      const summary = await getEngagementSummary(post);

      return res.status(200).json({
        success: true,
        message: "View ignored.",
        data: { summary },
      });
    }

    const existingView = await PostReactionModel.findOne({
      postID: post._id,
      visitorId,
      type: "view",
    });

    if (existingView) {
      const summary = await getEngagementSummary(post);

      return res.status(200).json({
        success: true,
        message: "View already recorded.",
        data: { summary },
      });
    }

    try {
      await PostReactionModel.create({
        postID: post._id,
        postSlug: post.slug,
        visitorId,
        type: "view",
        ipHash: getIpHash(req),
        userAgent: cleanText(req.headers["user-agent"]).slice(0, 300),
      });
    } catch (error) {
      if (error.code === 11000) {
        const summary = await getEngagementSummary(post);

        return res.status(200).json({
          success: true,
          message: "View already recorded.",
          data: { summary },
        });
      }

      throw error;
    }

    const updatedPost = await PostModel.findByIdAndUpdate(
      post._id,
      { $inc: { views: 1 } },
      { new: true },
    );

    const summary = await getEngagementSummary(updatedPost || post);

    return res.status(200).json({
      success: true,
      message: "View recorded successfully.",
      data: { summary },
    });
  } catch (error) {
    return handleEngagementError(error, res);
  }
};

export const reactToPost = async (req, res) => {
  try {
    const { slug } = req.params;
    const type = cleanText(req.body?.type).toLowerCase();
    const shareChannel = cleanText(req.body?.shareChannel || "direct").toLowerCase();
    const visitorId = getVisitorId(req);

    if (!REACTION_TYPES.includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Reaction type must be like, dislike, or share.",
      });
    }

    if (!visitorId) {
      return res.status(400).json({
        success: false,
        message: "Visitor id is required.",
      });
    }

    const post = await findPublishedPost(slug);

    if (!post) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }

    let selectedReaction = "";
    const increment = {};

    if (type === "share") {
      const existingShare = await PostReactionModel.findOne({
        postID: post._id,
        visitorId,
        type: "share",
      });

      if (existingShare) {
        existingShare.shareChannel = shareChannel;
        await existingShare.save();
      } else {
        await PostReactionModel.create({
          postID: post._id,
          postSlug: post.slug,
          visitorId,
          type,
          shareChannel,
          ipHash: getIpHash(req),
          userAgent: cleanText(req.headers["user-agent"]).slice(0, 300),
        });
        increment["reactions.share"] = 1;
      }

      selectedReaction = await getSelectedPostReaction(post._id, visitorId);
    } else {
      const existing = await PostReactionModel.findOne({
        postID: post._id,
        visitorId,
        type: { $in: ["like", "dislike"] },
      });

      if (existing?.type === type) {
        await existing.deleteOne();
        increment[`reactions.${type}`] = -1;
      } else if (existing) {
        const oldType = existing.type;
        existing.type = type;
        existing.postSlug = post.slug;
        existing.ipHash = getIpHash(req);
        existing.userAgent = cleanText(req.headers["user-agent"]).slice(0, 300);
        await existing.save();

        increment[`reactions.${oldType}`] = -1;
        increment[`reactions.${type}`] = 1;
        selectedReaction = type;
      } else {
        try {
          await PostReactionModel.create({
            postID: post._id,
            postSlug: post.slug,
            visitorId,
            type,
            ipHash: getIpHash(req),
            userAgent: cleanText(req.headers["user-agent"]).slice(0, 300),
          });

          increment[`reactions.${type}`] = 1;
          selectedReaction = type;
        } catch (error) {
          if (error.code !== 11000) throw error;
          selectedReaction = await getSelectedPostReaction(post._id, visitorId);
        }
      }
    }

    const updatedPost = Object.keys(increment).length
      ? await PostModel.findByIdAndUpdate(
          post._id,
          { $inc: increment },
          { new: true },
        )
      : post;

    const summary = await getEngagementSummary(updatedPost || post);

    return res.status(200).json({
      success: true,
      message: "Reaction updated successfully.",
      data: {
        selectedReaction,
        summary,
      },
    });
  } catch (error) {
    return handleEngagementError(error, res);
  }
};
