import Lead from "../../models/leads/lead.model.js";

const canManageLeads = (user) =>
  user && (user.role === "admin" || user.role === "super_admin");

const cleanText = (value) => String(value).trim();

const handleLeadError = (error, res) => {
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
      message: "Lead already exists with this email",
    });
  }

  return res.status(500).json({ message: error.message, success: false });
};

export const createLead = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      subject,
      message,
      leadType,
      page,
      service,
      budget,
      company,
    } = req.body;

    const requiredFields = { name, email, phone, subject, message };

    for (const [field, value] of Object.entries(requiredFields)) {
      if (!value || String(value).trim() === "") {
        return res.status(400).json({
          message: `${field} is required`,
          success: false,
        });
      }
    }

    await Lead.create({
      name: cleanText(name),
      email: cleanText(email).toLowerCase(),
      phone: cleanText(phone),
      subject: cleanText(subject),
      message: cleanText(message),
      leadType: leadType ? cleanText(leadType) : "service-popup",
      page: page ? cleanText(page) : "",
      service: service ? cleanText(service) : "",
      budget: budget ? cleanText(budget) : "",
      company: company ? cleanText(company) : "",
      source: "Website",
      notes: cleanText(message),
      tags: [service, leadType, budget].filter(Boolean).map((tag) => cleanText(tag).toLowerCase()),
    });

    return res.status(201).json({
      message: "Lead created successfully",
      success: true,
    });
  } catch (error) {
    return handleLeadError(error, res);
  }
};

export const getAllLeads = async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized", success: false });
    if (!canManageLeads(user)) return res.status(403).json({ message: "Forbidden", success: false });

    const { status, source, leadType, service, page = 1, limit = 10, search } = req.query;
    const query = {};

    if (status) query.status = status;
    if (source) query.source = source;
    if (leadType) query.leadType = leadType;
    if (service) query.service = service;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { company: { $regex: search, $options: "i" } },
        { subject: { $regex: search, $options: "i" } },
        { service: { $regex: search, $options: "i" } },
        { budget: { $regex: search, $options: "i" } },
      ];
    }

    const currentPage = parseInt(page);
    const perPage = parseInt(limit);

    const leads = await Lead.find(query)
      .select("-__v")
      .sort({ createdAt: -1 })
      .skip((currentPage - 1) * perPage)
      .limit(perPage);

    const total = await Lead.countDocuments(query);

    return res.status(200).json({
      message: leads.length ? "Leads fetched successfully" : "No leads found",
      success: true,
      data: leads,
      pagination: {
        total,
        page: currentPage,
        limit: perPage,
        totalPages: Math.ceil(total / perPage),
      },
    });
  } catch (error) {
    return handleLeadError(error, res);
  }
};

export const getLeadById = async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized", success: false });
    if (!canManageLeads(user)) return res.status(403).json({ message: "Forbidden", success: false });

    const lead = await Lead.findById(req.params.id).select("-__v");
    if (!lead) return res.status(404).json({ message: "Lead not found", success: false });

    return res.status(200).json({
      message: "Lead fetched successfully",
      success: true,
      data: lead,
    });
  } catch (error) {
    return handleLeadError(error, res);
  }
};

export const updateLead = async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized", success: false });
    if (!canManageLeads(user)) return res.status(403).json({ message: "Forbidden", success: false });

    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ message: "Lead not found", success: false });

    const allowedFields = [
      "name",
      "email",
      "phone",
      "company",
      "designation",
      "subject",
      "message",
      "leadType",
      "page",
      "service",
      "budget",
      "status",
      "source",
      "score",
      "dealValue",
      "currency",
      "expectedCloseDate",
      "assignedTo",
      "notes",
      "tags",
      "isArchived",
      "lostReason",
    ];

    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = typeof req.body[field] === "string" ? cleanText(req.body[field]) : req.body[field];
      }
    }

    if (updates.email) updates.email = updates.email.toLowerCase();

    const updatedLead = await Lead.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select("-__v");

    return res.status(200).json({
      message: "Lead updated successfully",
      success: true,
      data: updatedLead,
    });
  } catch (error) {
    return handleLeadError(error, res);
  }
};

export const deleteLead = async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized", success: false });
    if (!canManageLeads(user)) return res.status(403).json({ message: "Forbidden", success: false });

    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ message: "Lead not found", success: false });

    await Lead.findByIdAndDelete(req.params.id);

    return res.status(200).json({
      message: "Lead deleted successfully",
      success: true,
      data: lead,
    });
  } catch (error) {
    return handleLeadError(error, res);
  }
};
