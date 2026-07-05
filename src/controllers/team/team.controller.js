import slugify from "slugify";
import { TeamMemberModel } from "../../models/team/team.model.js";

const MANAGER_ROLES = ["admin", "super_admin", "editor"];
const TEAM_STATUSES = ["active", "inactive"];

const canManageTeam = (user) => user && MANAGER_ROLES.includes(user.role);
const cleanText = (value) => String(value || "").trim();

const handleTeamError = (error, res) => {
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
      message: "Team member already exists with this slug or email",
    });
  }

  return res.status(500).json({
    success: false,
    message: error.message || "Unable to process team request",
  });
};

const normalizeArray = (value) =>
  Array.isArray(value)
    ? value.map((item) => cleanText(item)).filter(Boolean)
    : [];

const normalizeSocialLinks = (links) =>
  Array.isArray(links)
    ? links
        .map((link) => ({
          name: cleanText(link.name),
          url: cleanText(link.url),
        }))
        .filter((link) => link.name || link.url)
    : [];

const buildTeamPayload = (body) => ({
  name: cleanText(body.name),
  slug: body.slug ? slugify(cleanText(body.slug), { lower: true, strict: true }) : undefined,
  email: body.email ? cleanText(body.email).toLowerCase() : undefined,
  phone: cleanText(body.phone),
  designation: cleanText(body.designation),
  department: cleanText(body.department) || "General",
  bio: cleanText(body.bio),
  avatar: cleanText(body.avatar),
  skills: normalizeArray(body.skills),
  socialLinks: normalizeSocialLinks(body.socialLinks),
  userID: body.userID || undefined,
  order: Number(body.order || 0),
  isFeatured: Boolean(body.isFeatured),
  status: TEAM_STATUSES.includes(body.status) ? body.status : "active",
});

export const getAllTeamMembers = async (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!canManageTeam(user)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const { status, department, search, page = 1, limit = 50 } = req.query;
    const currentPage = Math.max(Number.parseInt(page, 10) || 1, 1);
    const perPage = Math.min(Math.max(Number.parseInt(limit, 10) || 50, 1), 100);
    const query = {};

    if (status && TEAM_STATUSES.includes(status)) query.status = status;
    if (department) query.department = { $regex: cleanText(department), $options: "i" };
    if (search) {
      const regex = { $regex: cleanText(search), $options: "i" };
      query.$or = [
        { name: regex },
        { email: regex },
        { designation: regex },
        { department: regex },
        { skills: regex },
      ];
    }

    const [members, total, statusCounts] = await Promise.all([
      TeamMemberModel.find(query)
        .populate({ path: "userID", select: "name email role avatar isActive" })
        .sort({ order: 1, createdAt: -1 })
        .skip((currentPage - 1) * perPage)
        .limit(perPage)
        .lean(),
      TeamMemberModel.countDocuments(query),
      TeamMemberModel.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    return res.status(200).json({
      success: true,
      message: members.length ? "Team members fetched successfully" : "No team members found",
      data: members,
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
    return handleTeamError(error, res);
  }
};

export const createTeamMember = async (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!canManageTeam(user)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const member = await TeamMemberModel.create(buildTeamPayload(req.body));

    return res.status(201).json({
      success: true,
      message: "Team member created successfully",
      data: member,
    });
  } catch (error) {
    return handleTeamError(error, res);
  }
};

export const updateTeamMember = async (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!canManageTeam(user)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const member = await TeamMemberModel.findById(req.params.id);

    if (!member) {
      return res.status(404).json({ success: false, message: "Team member not found" });
    }

    const payload = buildTeamPayload(req.body);
    Object.entries(payload).forEach(([key, value]) => {
      if (value !== undefined) member[key] = value;
    });

    await member.save();

    const updatedMember = await TeamMemberModel.findById(member._id)
      .populate({ path: "userID", select: "name email role avatar isActive" })
      .lean();

    return res.status(200).json({
      success: true,
      message: "Team member updated successfully",
      data: updatedMember,
    });
  } catch (error) {
    return handleTeamError(error, res);
  }
};

export const deleteTeamMember = async (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!canManageTeam(user)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const member = await TeamMemberModel.findById(req.params.id);

    if (!member) {
      return res.status(404).json({ success: false, message: "Team member not found" });
    }

    await member.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Team member deleted successfully",
    });
  } catch (error) {
    return handleTeamError(error, res);
  }
};
