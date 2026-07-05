import bcrypt from "bcryptjs";
import { Auth } from "../../models/auth/auth.models.js";

const USER_ROLES = ["super_admin", "admin", "editor", "viewer", "user"];
const MANAGER_ROLES = ["admin", "super_admin"];

const canManageUsers = (user) => user && MANAGER_ROLES.includes(user.role);
const isSuperAdmin = (user) => user?.role === "super_admin";

const cleanText = (value) => String(value || "").trim();

const toBoolean = (value, fallback = false) => {
  if (value === undefined || value === null) return fallback;
  return Boolean(value);
};

const sanitizeUser = (user) => {
  if (!user) return null;
  const object = typeof user.toObject === "function" ? user.toObject() : user;
  delete object.password;
  delete object.loginAttempts;
  delete object.lockUntil;
  delete object.passwordResetToken;
  delete object.passwordResetExpires;
  return object;
};

const handleUserError = (error, res) => {
  if (error.name === "ValidationError") {
    const errors = Object.values(error.errors).map((err) => err.message);
    return res.status(400).json({
      success: false,
      message: errors[0],
      errors,
    });
  }

  if (error.code === 11000) {
    const field = Object.keys(error.keyValue || {})[0] || "field";
    return res.status(409).json({
      success: false,
      message: `${field} already exists`,
    });
  }

  return res.status(500).json({
    success: false,
    message: error.message || "Unable to process users request",
  });
};

const validatePassword = (password) => {
  if (!password || password.length < 8) {
    return "Password must be at least 8 characters long";
  }

  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

  if (!passwordRegex.test(password)) {
    return "Password must contain uppercase, lowercase, number and special character";
  }

  return "";
};

export const getAllUsers = async (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!canManageUsers(user)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const { role, status, search, page = 1, limit = 50 } = req.query;
    const currentPage = Math.max(Number.parseInt(page, 10) || 1, 1);
    const perPage = Math.min(Math.max(Number.parseInt(limit, 10) || 50, 1), 100);
    const query = {};

    if (role && USER_ROLES.includes(role)) query.role = role;
    if (status === "active") query.isActive = true;
    if (status === "inactive") query.isActive = false;

    if (search) {
      const regex = { $regex: cleanText(search), $options: "i" };
      query.$or = [
        { name: regex },
        { email: regex },
        { username: regex },
        { phone: regex },
        { "profile.jobTitle": regex },
      ];
    }

    const [users, total, roleCounts] = await Promise.all([
      Auth.find(query)
        .select("-password -loginAttempts -lockUntil -passwordResetToken -passwordResetExpires")
        .sort({ createdAt: -1 })
        .skip((currentPage - 1) * perPage)
        .limit(perPage)
        .lean(),
      Auth.countDocuments(query),
      Auth.aggregate([
        { $group: { _id: "$role", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    return res.status(200).json({
      success: true,
      message: users.length ? "Users fetched successfully" : "No users found",
      data: users,
      counts: roleCounts.map((item) => ({
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
    return handleUserError(error, res);
  }
};

export const createUser = async (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!canManageUsers(user)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const {
      name,
      email,
      username,
      phone,
      password,
      role = "user",
      avatar,
      isActive = true,
      isVerified = true,
      profile = {},
      preferences = {},
    } = req.body;

    if (!USER_ROLES.includes(role)) {
      return res.status(400).json({ success: false, message: "Invalid role" });
    }

    if (role === "super_admin" && !isSuperAdmin(user)) {
      return res.status(403).json({
        success: false,
        message: "Only super admin can create a super admin",
      });
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.status(400).json({ success: false, message: passwordError });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const createdUser = await Auth.create({
      name: cleanText(name),
      email: cleanText(email).toLowerCase(),
      username: cleanText(username),
      phone: cleanText(phone),
      password: hashedPassword,
      role,
      avatar: avatar ? cleanText(avatar) : undefined,
      isActive: toBoolean(isActive, true),
      isVerified: toBoolean(isVerified, true),
      profile: {
        bio: cleanText(profile.bio),
        jobTitle: cleanText(profile.jobTitle),
        socialLinks: Array.isArray(profile.socialLinks) ? profile.socialLinks : [],
      },
      preferences: {
        theme: preferences.theme || "dark",
        emailNotifications: preferences.emailNotifications ?? true,
      },
    });

    return res.status(201).json({
      success: true,
      message: "User created successfully",
      data: sanitizeUser(createdUser),
    });
  } catch (error) {
    return handleUserError(error, res);
  }
};

export const updateUser = async (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!canManageUsers(user)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const targetUser = await Auth.findById(req.params.id);

    if (!targetUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (targetUser.role === "super_admin" && !isSuperAdmin(user)) {
      return res.status(403).json({
        success: false,
        message: "Only super admin can update a super admin",
      });
    }

    const allowedFields = ["name", "email", "username", "phone", "avatar"];
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        targetUser[field] =
          field === "email" ? cleanText(req.body[field]).toLowerCase() : cleanText(req.body[field]);
      }
    }

    if (req.body.role !== undefined) {
      if (!USER_ROLES.includes(req.body.role)) {
        return res.status(400).json({ success: false, message: "Invalid role" });
      }

      if (req.body.role === "super_admin" && !isSuperAdmin(user)) {
        return res.status(403).json({
          success: false,
          message: "Only super admin can assign super admin role",
        });
      }

      targetUser.role = req.body.role;
    }

    if (req.body.isActive !== undefined) {
      targetUser.isActive = toBoolean(req.body.isActive, targetUser.isActive);
    }

    if (req.body.isVerified !== undefined) {
      targetUser.isVerified = toBoolean(req.body.isVerified, targetUser.isVerified);
    }

    if (req.body.profile) {
      targetUser.profile = {
        ...(targetUser.profile?.toObject?.() || targetUser.profile || {}),
        bio: cleanText(req.body.profile.bio),
        jobTitle: cleanText(req.body.profile.jobTitle),
        socialLinks: Array.isArray(req.body.profile.socialLinks)
          ? req.body.profile.socialLinks
          : targetUser.profile?.socialLinks || [],
      };
    }

    if (req.body.preferences) {
      targetUser.preferences = {
        ...(targetUser.preferences?.toObject?.() || targetUser.preferences || {}),
        ...req.body.preferences,
      };
    }

    if (req.body.password) {
      const passwordError = validatePassword(req.body.password);
      if (passwordError) {
        return res.status(400).json({ success: false, message: passwordError });
      }
      targetUser.password = await bcrypt.hash(req.body.password, 12);
    }

    await targetUser.save();

    return res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: sanitizeUser(targetUser),
    });
  } catch (error) {
    return handleUserError(error, res);
  }
};

export const deleteUser = async (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!canManageUsers(user)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    if (String(user.id) === String(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "You cannot delete your own account",
      });
    }

    const targetUser = await Auth.findById(req.params.id);

    if (!targetUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (targetUser.role === "super_admin" && !isSuperAdmin(user)) {
      return res.status(403).json({
        success: false,
        message: "Only super admin can delete a super admin",
      });
    }

    await targetUser.deleteOne();

    return res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    return handleUserError(error, res);
  }
};
