import { CommentModel } from "../../models/blog/comment.js";
import { PostModel } from "../../models/blog/post.model.js";

const COMMENT_STATUSES = ["approved", "pending", "spam", "trash"];
const MODERATOR_ROLES = ["editor", "admin", "super_admin"];

const canModerateComments = (user) =>
  user && MODERATOR_ROLES.includes(user.role);

const toPositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const handleCommentError = (error, res) => {
  if (error.name === "ValidationError") {
    const errors = Object.values(error.errors).map((err) => err.message);
    return res.status(400).json({
      success: false,
      message: errors[0],
      errors,
    });
  }

  return res.status(500).json({
    success: false,
    message: error.message || "Unable to process comments request",
  });
};

export const getAllComments = async (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!canModerateComments(user)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const { status, search, page = 1, limit = 20 } = req.query;
    const currentPage = toPositiveInt(page, 1);
    const perPage = Math.min(toPositiveInt(limit, 20), 100);
    const query = {};

    if (status && COMMENT_STATUSES.includes(status)) {
      query.status = status;
    }

    if (search) {
      const regex = { $regex: String(search).trim(), $options: "i" };
      query.$or = [
        { authorName: regex },
        { email: regex },
        { postSlug: regex },
        { comment: regex },
      ];
    }

    const [comments, total, statusCounts] = await Promise.all([
      CommentModel.find(query)
        .select("+email authorName email website comment status likes postID postSlug createdAt updatedAt")
        .populate({ path: "postID", select: "title slug status" })
        .sort({ createdAt: -1 })
        .skip((currentPage - 1) * perPage)
        .limit(perPage)
        .lean(),
      CommentModel.countDocuments(query),
      CommentModel.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    return res.status(200).json({
      success: true,
      message: comments.length ? "Comments fetched successfully" : "No comments found",
      data: comments,
      counts: statusCounts.map((item) => ({
        label: item._id || "unknown",
        value: item.count,
      })),
      pagination: {
        total,
        page: currentPage,
        limit: perPage,
        totalPages: Math.ceil(total / perPage),
      },
    });
  } catch (error) {
    return handleCommentError(error, res);
  }
};

export const updateComment = async (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!canModerateComments(user)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const { status } = req.body;

    if (!COMMENT_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid comment status",
      });
    }

    const previousComment = await CommentModel.findById(req.params.id).select("status postID");

    if (!previousComment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    const wasApproved = previousComment.status === "approved";
    const willBeApproved = status === "approved";

    previousComment.status = status;
    await previousComment.save();

    if (wasApproved !== willBeApproved) {
      await PostModel.findByIdAndUpdate(previousComment.postID, {
        $inc: { commentCount: willBeApproved ? 1 : -1 },
      });
    }

    const comment = await CommentModel.findById(previousComment._id)
      .select("+email authorName email website comment status likes postID postSlug createdAt updatedAt")
      .populate({ path: "postID", select: "title slug status" })
      .lean();

    return res.status(200).json({
      success: true,
      message: "Comment updated successfully",
      data: comment,
    });
  } catch (error) {
    return handleCommentError(error, res);
  }
};

export const deleteComment = async (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!canModerateComments(user)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const comment = await CommentModel.findById(req.params.id).select("status postID");

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    const shouldReduceCount = comment.status === "approved";
    await comment.deleteOne();

    if (shouldReduceCount) {
      await PostModel.findByIdAndUpdate(comment.postID, {
        $inc: { commentCount: -1 },
      });
    }

    return res.status(200).json({
      success: true,
      message: "Comment deleted successfully",
    });
  } catch (error) {
    return handleCommentError(error, res);
  }
};
