import { Auth } from "../../models/auth/auth.models.js";
import { CategoryModel } from "../../models/blog/category.model.js";
import { CommentModel } from "../../models/blog/comment.js";
import { PostModel } from "../../models/blog/post.model.js";
import { PostReactionModel } from "../../models/blog/reaction.model.js";
import Lead from "../../models/leads/lead.model.js";
import { mediaModel } from "../../models/media/media.model.js";
import { MessageModel } from "../../models/messages/message.model.js";
import { newsLatterModel } from "../../models/newslatter/newslatter.model.js";
import { TeamMemberModel } from "../../models/team/team.model.js";

const ANALYTICS_ROLES = ["admin", "super_admin"];
const DAY_MS = 24 * 60 * 60 * 1000;

const canViewAnalytics = (user) => user && ANALYTICS_ROLES.includes(user.role);

const startOfMonth = (date = new Date()) =>
  new Date(date.getFullYear(), date.getMonth(), 1);

const previousMonthStart = (date = new Date()) =>
  new Date(date.getFullYear(), date.getMonth() - 1, 1);

const dayKey = (date) => date.toISOString().slice(0, 10);

const dayLabel = (date) =>
  date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });

const formatTrendPercent = (current, previous) => {
  if (previous === 0 && current === 0) return 0;
  if (previous === 0) return 100;

  return Math.round(((current - previous) / previous) * 100);
};

const monthCounts = async (Model, match = {}) => {
  const now = new Date();
  const currentStart = startOfMonth(now);
  const previousStart = previousMonthStart(now);

  const [current, previous] = await Promise.all([
    Model.countDocuments({ ...match, createdAt: { $gte: currentStart } }),
    Model.countDocuments({
      ...match,
      createdAt: { $gte: previousStart, $lt: currentStart },
    }),
  ]);

  return {
    current,
    previous,
    percent: formatTrendPercent(current, previous),
  };
};

const groupByField = async (Model, field, match = {}) => {
  const rows = await Model.aggregate([
    { $match: match },
    {
      $group: {
        _id: { $ifNull: [`$${field}`, "Unknown"] },
        value: { $sum: 1 },
      },
    },
    { $sort: { value: -1 } },
  ]);

  return rows.map((row) => ({
    name: String(row._id || "Unknown"),
    value: row.value,
  }));
};

const aggregateByDay = async (Model, days, match = {}) => {
  const startDate = new Date(Date.now() - (days - 1) * DAY_MS);
  startDate.setHours(0, 0, 0, 0);

  const rows = await Model.aggregate([
    { $match: { ...match, createdAt: { $gte: startDate } } },
    {
      $group: {
        _id: {
          $dateToString: {
            format: "%Y-%m-%d",
            date: "$createdAt",
            timezone: "Asia/Kolkata",
          },
        },
        value: { $sum: 1 },
      },
    },
  ]);

  return new Map(rows.map((row) => [row._id, row.value]));
};

const buildTimeline = async (days = 14) => {
  const [leads, messages, posts, comments, subscribers] = await Promise.all([
    aggregateByDay(Lead, days, { isArchived: { $ne: true } }),
    aggregateByDay(MessageModel, days),
    aggregateByDay(PostModel, days),
    aggregateByDay(CommentModel, days, { status: "approved" }),
    aggregateByDay(newsLatterModel, days),
  ]);

  return Array.from({ length: days }, (_, index) => {
    const date = new Date(Date.now() - (days - 1 - index) * DAY_MS);
    date.setHours(0, 0, 0, 0);
    const key = dayKey(date);

    return {
      date: key,
      label: dayLabel(date),
      leads: leads.get(key) || 0,
      messages: messages.get(key) || 0,
      posts: posts.get(key) || 0,
      comments: comments.get(key) || 0,
      subscribers: subscribers.get(key) || 0,
    };
  });
};

const sumField = async (Model, field, match = {}) => {
  const [result] = await Model.aggregate([
    { $match: match },
    { $group: { _id: null, total: { $sum: `$${field}` } } },
  ]);

  return result?.total || 0;
};

const formatBytes = (bytes = 0) => {
  if (!bytes) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );

  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
};

const buildCard = (key, label, total, month, description) => ({
  key,
  label,
  total,
  currentMonth: month.current,
  previousMonth: month.previous,
  trendPercent: month.percent,
  description,
});

export const getDashboardAnalytics = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: "Unauthorized", success: false });
    }

    if (!canViewAnalytics(user)) {
      return res.status(403).json({ message: "Forbidden", success: false });
    }

    const activeMediaMatch = { isDeleted: { $ne: true } };
    const activeLeadsMatch = { isArchived: { $ne: true } };
    const approvedCommentsMatch = { status: "approved" };
    const publishedPostsMatch = { status: "published" };

    const [
      usersTotal,
      activeUsers,
      teamMembersTotal,
      activeTeamMembers,
      postsTotal,
      publishedPosts,
      draftPosts,
      totalPostViews,
      totalPostComments,
      totalPostLikes,
      totalPostDislikes,
      totalPostShares,
      categoriesTotal,
      publishedCategories,
      leadsTotal,
      newLeads,
      wonLeads,
      pipelineValue,
      wonValue,
      messagesTotal,
      unreadMessages,
      subscribersTotal,
      activeSubscribers,
      mediaTotal,
      mediaStorage,
      userMonth,
      postMonth,
      categoryMonth,
      leadMonth,
      messageMonth,
      subscriberMonth,
      mediaMonth,
      commentMonth,
      teamMemberMonth,
      userRoles,
      postStatuses,
      categoryStatuses,
      commentStatuses,
      reactionTypes,
      leadStatuses,
      leadSources,
      messageStatuses,
      mediaTypes,
      timeline,
      recentLeads,
      recentMessages,
      recentPosts,
      recentMedia,
      recentSubscribers,
      topPosts,
    ] = await Promise.all([
      Auth.countDocuments(),
      Auth.countDocuments({ isActive: true }),
      TeamMemberModel.countDocuments(),
      TeamMemberModel.countDocuments({ status: "active" }),
      PostModel.countDocuments(),
      PostModel.countDocuments(publishedPostsMatch),
      PostModel.countDocuments({ status: "draft" }),
      sumField(PostModel, "views"),
      CommentModel.countDocuments(approvedCommentsMatch),
      sumField(PostModel, "reactions.like"),
      sumField(PostModel, "reactions.dislike"),
      sumField(PostModel, "reactions.share"),
      CategoryModel.countDocuments(),
      CategoryModel.countDocuments({ status: "published" }),
      Lead.countDocuments(activeLeadsMatch),
      Lead.countDocuments({ ...activeLeadsMatch, status: "New" }),
      Lead.countDocuments({ ...activeLeadsMatch, status: "Won" }),
      sumField(Lead, "dealValue", {
        ...activeLeadsMatch,
        status: { $nin: ["Lost"] },
      }),
      sumField(Lead, "dealValue", { ...activeLeadsMatch, status: "Won" }),
      MessageModel.countDocuments(),
      MessageModel.countDocuments({ status: "unread" }),
      newsLatterModel.countDocuments(),
      newsLatterModel.countDocuments({ status: "subscriber" }),
      mediaModel.countDocuments(activeMediaMatch),
      sumField(mediaModel, "fileSize", activeMediaMatch),
      monthCounts(Auth),
      monthCounts(PostModel),
      monthCounts(CategoryModel),
      monthCounts(Lead, activeLeadsMatch),
      monthCounts(MessageModel),
      monthCounts(newsLatterModel),
      monthCounts(mediaModel, activeMediaMatch),
      monthCounts(CommentModel, approvedCommentsMatch),
      monthCounts(TeamMemberModel),
      groupByField(Auth, "role"),
      groupByField(PostModel, "status"),
      groupByField(CategoryModel, "status"),
      groupByField(CommentModel, "status"),
      groupByField(PostReactionModel, "type"),
      groupByField(Lead, "status", activeLeadsMatch),
      groupByField(Lead, "source", activeLeadsMatch),
      groupByField(MessageModel, "status"),
      groupByField(mediaModel, "mediaType", activeMediaMatch),
      buildTimeline(14),
      Lead.find(activeLeadsMatch)
        .select("name email company service status source dealValue currency createdAt")
        .sort({ createdAt: -1 })
        .limit(6)
        .lean(),
      MessageModel.find()
        .select("firstName lastName email subject status createdAt")
        .sort({ createdAt: -1 })
        .limit(6)
        .lean(),
      PostModel.find()
        .select("title slug status category views reactions commentCount publishedAt updatedAt createdAt")
        .sort({ updatedAt: -1, createdAt: -1 })
        .limit(6)
        .lean(),
      mediaModel
        .find(activeMediaMatch)
        .select("fileName originalName mediaType fileSize fileUrl createdAt")
        .sort({ createdAt: -1 })
        .limit(6)
        .lean(),
      newsLatterModel
        .find()
        .select("email status createdAt")
        .sort({ createdAt: -1 })
        .limit(6)
        .lean(),
      PostModel.find()
        .select("title slug status category views reactions commentCount publishedAt")
        .sort({ views: -1, updatedAt: -1 })
        .limit(6)
        .lean(),
    ]);

    const conversionRate = leadsTotal
      ? Number(((wonLeads / leadsTotal) * 100).toFixed(1))
      : 0;
    const totalPostReactions =
      totalPostLikes + totalPostDislikes + totalPostShares;
    const totalPostEngagements = totalPostReactions + totalPostComments;
    const postEngagementRate = totalPostViews
      ? Number(((totalPostEngagements / totalPostViews) * 100).toFixed(2))
      : 0;
    const averageViewsPerPublishedPost = publishedPosts
      ? Math.round(totalPostViews / publishedPosts)
      : 0;

    const modelCards = [
      buildCard(
        "users",
        "Users",
        usersTotal,
        userMonth,
        `${activeUsers} active accounts`,
      ),
      buildCard(
        "team",
        "Team",
        teamMembersTotal,
        teamMemberMonth,
        `${activeTeamMembers} active team members`,
      ),
      buildCard(
        "posts",
        "Posts",
        postsTotal,
        postMonth,
        `${publishedPosts} published, ${draftPosts} drafts`,
      ),
      buildCard(
        "categories",
        "Categories",
        categoriesTotal,
        categoryMonth,
        `${publishedCategories} published categories`,
      ),
      buildCard(
        "comments",
        "Comments",
        totalPostComments,
        commentMonth,
        "Tracked from post comment counters",
      ),
      buildCard(
        "media",
        "Media",
        mediaTotal,
        mediaMonth,
        `${formatBytes(mediaStorage)} stored`,
      ),
      buildCard(
        "leads",
        "Leads",
        leadsTotal,
        leadMonth,
        `${newLeads} new, ${wonLeads} won`,
      ),
      buildCard(
        "messages",
        "Messages",
        messagesTotal,
        messageMonth,
        `${unreadMessages} unread messages`,
      ),
      buildCard(
        "newsletters",
        "Newsletters",
        subscribersTotal,
        subscriberMonth,
        `${activeSubscribers} active subscribers`,
      ),
    ];

    return res.status(200).json({
      success: true,
      message: "Dashboard analytics fetched successfully",
      data: {
        generatedAt: new Date().toISOString(),
        access: {
          role: user.role,
        },
        summary: {
          usersTotal,
          activeUsers,
          teamMembersTotal,
          activeTeamMembers,
          postsTotal,
          publishedPosts,
          draftPosts,
          totalPostViews,
          totalPostComments,
          totalPostLikes,
          totalPostDislikes,
          totalPostShares,
          totalPostReactions,
          totalPostEngagements,
          postEngagementRate,
          averageViewsPerPublishedPost,
          categoriesTotal,
          publishedCategories,
          leadsTotal,
          newLeads,
          wonLeads,
          conversionRate,
          pipelineValue,
          wonValue,
          messagesTotal,
          unreadMessages,
          subscribersTotal,
          activeSubscribers,
          mediaTotal,
          mediaStorage,
          mediaStorageLabel: formatBytes(mediaStorage),
        },
        modelCards,
        timeline,
        breakdowns: {
          userRoles,
          postStatuses,
          categoryStatuses,
          commentStatuses,
          reactionTypes,
          leadStatuses,
          leadSources,
          messageStatuses,
          mediaTypes,
        },
        recent: {
          leads: recentLeads,
          messages: recentMessages,
          posts: recentPosts,
          media: recentMedia,
          subscribers: recentSubscribers,
        },
        topPosts,
      },
    });
  } catch (error) {
    console.error("[ANALYTICS_DASHBOARD_ERROR]", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Unable to fetch dashboard analytics",
    });
  }
};
