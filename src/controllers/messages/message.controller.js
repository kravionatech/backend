import { MessageModel } from "../../models/messages/message.model.js";

const canManageMessages = (user) =>
  user && (user.role === "admin" || user.role === "super_admin");

const handleMessageError = (error, res) => {
  if (error.name === "ValidationError") {
    const errors = Object.values(error.errors).map((err) => err.message);
    return res.status(400).json({
      success: false,
      message: errors[0],
      errors,
    });
  }

  return res.status(500).json({ message: error.message, success: false });
};

const cleanText = (value) => String(value).trim();

export const createMessage = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, subject, message } = req.body;

    const requiredFields = {
      firstName,
      lastName,
      email,
      phone,
      subject,
      message,
    };

    for (const [field, value] of Object.entries(requiredFields)) {
      if (!value || String(value).trim() === "") {
        return res.status(400).json({
          message: `${field} is required`,
          success: false,
        });
      }
    }

    await MessageModel.create({
      firstName: cleanText(firstName),
      lastName: cleanText(lastName),
      email: cleanText(email).toLowerCase(),
      phone: cleanText(phone),
      subject: cleanText(subject),
      message: cleanText(message),
    });

    return res.status(201).json({
      message: "Message created successfully",
      success: true,
    });
  } catch (error) {
    return handleMessageError(error, res);
  }
};

export const getAllMessages = async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized", success: false });
    if (!canManageMessages(user)) {
      return res.status(403).json({ message: "Forbidden", success: false });
    }

    const { status, page = 1, limit = 10, search } = req.query;
    const query = {};

    if (status) query.status = status;
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { subject: { $regex: search, $options: "i" } },
      ];
    }

    const currentPage = parseInt(page);
    const perPage = parseInt(limit);

    const messages = await MessageModel.find(query)
      .select("-__v")
      .sort({ createdAt: -1 })
      .skip((currentPage - 1) * perPage)
      .limit(perPage);

    const total = await MessageModel.countDocuments(query);

    return res.status(200).json({
      message: messages.length ? "Messages fetched successfully" : "No messages found",
      success: true,
      data: messages,
      pagination: {
        total,
        page: currentPage,
        limit: perPage,
        totalPages: Math.ceil(total / perPage),
      },
    });
  } catch (error) {
    return handleMessageError(error, res);
  }
};

export const getMessageById = async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized", success: false });
    if (!canManageMessages(user)) {
      return res.status(403).json({ message: "Forbidden", success: false });
    }

    const contactMessage = await MessageModel.findById(req.params.id).select("-__v");
    if (!contactMessage) {
      return res.status(404).json({ message: "Message not found", success: false });
    }

    return res.status(200).json({
      message: "Message fetched successfully",
      success: true,
      data: contactMessage,
    });
  } catch (error) {
    return handleMessageError(error, res);
  }
};

export const updateMessage = async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized", success: false });
    if (!canManageMessages(user)) {
      return res.status(403).json({ message: "Forbidden", success: false });
    }

    const isMessage = await MessageModel.findById(req.params.id);
    if (!isMessage) {
      return res.status(404).json({ message: "Message not found", success: false });
    }

    const { firstName, lastName, email, phone, subject, message, status } = req.body;
    const updates = {
      ...(firstName !== undefined && { firstName: cleanText(firstName) }),
      ...(lastName !== undefined && { lastName: cleanText(lastName) }),
      ...(email !== undefined && { email: cleanText(email).toLowerCase() }),
      ...(phone !== undefined && { phone: cleanText(phone) }),
      ...(subject !== undefined && { subject: cleanText(subject) }),
      ...(message !== undefined && { message: cleanText(message) }),
      ...(status !== undefined && { status }),
    };

    const updatedMessage = await MessageModel.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select("-__v");

    return res.status(200).json({
      message: "Message updated successfully",
      success: true,
      data: updatedMessage,
    });
  } catch (error) {
    return handleMessageError(error, res);
  }
};

export const deleteMessage = async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized", success: false });
    if (!canManageMessages(user)) {
      return res.status(403).json({ message: "Forbidden", success: false });
    }

    const isMessage = await MessageModel.findById(req.params.id);
    if (!isMessage) {
      return res.status(404).json({ message: "Message not found", success: false });
    }

    await MessageModel.findByIdAndDelete(req.params.id);

    return res.status(200).json({
      message: "Message deleted successfully",
      success: true,
      data: isMessage,
    });
  } catch (error) {
    return handleMessageError(error, res);
  }
};
