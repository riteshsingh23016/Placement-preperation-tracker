const mongoose = require("mongoose");
const Company = require("../models/company");
const { createInternalNotification } = require("./notificationController");

function parseOptionalDate(value) {
  if (value === undefined || value === null || value === "") return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function parseRequiredAppliedDate(value) {
  if (value === undefined || value === null || value === "") {
    return new Date();
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    return null;
  }
  return d;
}

function validateCreatePayload(body) {
  const errors = {};
  if (!body.companyName || String(body.companyName).trim() === "") {
    errors.companyName = "Company name is required.";
  }
  if (!body.role || String(body.role).trim() === "") {
    errors.role = "Role is required.";
  }
  return errors;
}

function collectUpdateFields(body) {
  const fields = {};
  if (body.companyName !== undefined) fields.companyName = String(body.companyName).trim();
  if (body.role !== undefined) fields.role = String(body.role).trim();
  if (body.package !== undefined) fields.package = String(body.package ?? "").trim();
  if (body.status !== undefined) fields.status = body.status;
  if (body.priority !== undefined) fields.priority = body.priority;
  if (body.notes !== undefined) fields.notes = String(body.notes ?? "");
  if (body.archived !== undefined) fields.archived = Boolean(body.archived);
  if (body.interviewDate !== undefined) {
    fields.interviewDate = parseOptionalDate(body.interviewDate);
  }
  if (body.appliedDate !== undefined) {
    const d = parseRequiredAppliedDate(body.appliedDate);
    if (d === null) fields.appliedDate = undefined;
    else fields.appliedDate = d;
  }
  return fields;
}

exports.getCompanies = async (req, res) => {
  try {
    const companies = await Company.find({ user: req.user._id }).sort({ appliedDate: -1 }).lean().exec();
    return res.status(200).json({
      success: true,
      data: companies,
    });
  } catch (err) {
    console.error("getCompanies:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to load companies.",
      code: "COMPANIES_FETCH_FAILED",
    });
  }
};

exports.createCompany = async (req, res) => {
  try {
    const errors = validateCreatePayload(req.body);
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation failed.",
        errors,
      });
    }

    const interviewDate = parseOptionalDate(req.body.interviewDate);
    const appliedDate = parseRequiredAppliedDate(req.body.appliedDate);
    if (req.body.appliedDate && appliedDate === null) {
      return res.status(400).json({
        success: false,
        message: "Invalid applied date.",
        errors: { appliedDate: "Applied date is invalid." },
      });
    }

    const doc = await Company.create({
      companyName: String(req.body.companyName).trim(),
      role: String(req.body.role).trim(),
      package: String(req.body.package ?? "").trim(),
      status: req.body.status,
      priority: req.body.priority,
      notes: String(req.body.notes ?? ""),
      interviewDate,
      appliedDate: appliedDate || new Date(),
      archived: Boolean(req.body.archived) || false,
      user: req.user._id,
    });

    // Notification for interview
    if (doc.interviewDate || doc.status === "Interview Scheduled") {
      await createInternalNotification({
        userId: req.user._id,
        type: "interview",
        title: "Interview Scheduled",
        message: `Interview for ${doc.companyName} set for ${doc.interviewDate ? new Date(doc.interviewDate).toLocaleDateString() : "TBD"}.`,
        companyId: doc._id,
        priority: doc.priority === "High" ? "high" : "medium",
      });
    }

    return res.status(201).json({
      success: true,
      data: doc.toObject(),
      message: "Company created.",
    });
  } catch (err) {
    if (err.name === "ValidationError") {
      const errors = {};
      Object.keys(err.errors || {}).forEach((k) => {
        errors[k] = err.errors[k].message;
      });
      return res.status(400).json({
        success: false,
        message: "Validation failed.",
        errors,
      });
    }
    console.error("createCompany:", err);
    return res.status(500).json({
      success: false,
      message: "Could not create company.",
      code: "COMPANY_CREATE_FAILED",
    });
  }
};

exports.updateCompany = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid company id.",
        code: "INVALID_ID",
      });
    }

    const updates = collectUpdateFields(req.body);
    if (updates.companyName === "") {
      return res.status(400).json({
        success: false,
        message: "Validation failed.",
        errors: { companyName: "Company name is required." },
      });
    }
    if (updates.role === "") {
      return res.status(400).json({
        success: false,
        message: "Validation failed.",
        errors: { role: "Role is required." },
      });
    }

    const doc = await Company.findOneAndUpdate(
      { _id: id, user: req.user._id },
      { $set: updates },
      { new: true, runValidators: true }
    )
      .lean()
      .exec();

    if (!doc) {
      return res.status(404).json({
        success: false,
        message: "Company not found.",
        code: "NOT_FOUND",
      });
    }

    // Notification for interview status change or date update
    if (updates.status === "Interview Scheduled" || updates.interviewDate) {
      await createInternalNotification({
        userId: req.user._id,
        type: "interview",
        title: "Interview Updated",
        message: `Interview details updated for ${doc.companyName}.`,
        companyId: doc._id,
        priority: doc.priority === "High" ? "high" : "medium",
      });
    }

    return res.status(200).json({
      success: true,
      data: doc,
      message: "Company updated.",
    });
  } catch (err) {
    if (err.name === "ValidationError") {
      const errors = {};
      Object.keys(err.errors || {}).forEach((k) => {
        errors[k] = err.errors[k].message;
      });
      return res.status(400).json({
        success: false,
        message: "Validation failed.",
        errors,
      });
    }
    console.error("updateCompany:", err);
    return res.status(500).json({
      success: false,
      message: "Could not update company.",
      code: "COMPANY_UPDATE_FAILED",
    });
  }
};

exports.deleteCompany = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid company id.",
        code: "INVALID_ID",
      });
    }

    const deleted = await Company.findOneAndDelete({ _id: id, user: req.user._id }).lean().exec();
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Company not found.",
        code: "NOT_FOUND",
      });
    }

    return res.status(200).json({
      success: true,
      data: { id: deleted._id },
      message: "Company removed.",
    });
  } catch (err) {
    console.error("deleteCompany:", err);
    return res.status(500).json({
      success: false,
      message: "Could not delete company.",
      code: "COMPANY_DELETE_FAILED",
    });
  }
};

exports.getAnalytics = async (req, res) => {
  try {
    const userId = req.user._id;

    // 1. Basic Counts
    const stats = await Company.aggregate([
      { $match: { user: userId, archived: false } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          selected: { $sum: { $cond: [{ $eq: ["$status", "Selected"] }, 1, 0] } },
          rejected: { $sum: { $cond: [{ $eq: ["$status", "Rejected"] }, 1, 0] } },
          interviews: { $sum: { $cond: [{ $eq: ["$status", "Interview Scheduled"] }, 1, 0] } },
          pending: { $sum: { $cond: [{ $eq: ["$status", "Pending"] }, 1, 0] } },
          applied: { $sum: { $cond: [{ $eq: ["$status", "Applied"] }, 1, 0] } },
        },
      },
    ]);

    const baseStats = stats[0] || {
      total: 0,
      selected: 0,
      rejected: 0,
      interviews: 0,
      pending: 0,
      applied: 0,
    };

    // Calculate success rate
    const successRate =
      baseStats.selected + baseStats.rejected > 0
        ? Math.round((baseStats.selected / (baseStats.selected + baseStats.rejected)) * 100)
        : 0;

    // Active applications
    const activeApps = baseStats.applied + baseStats.interviews + baseStats.pending;

    // 2. Status Distribution
    const statusDist = await Company.aggregate([
      { $match: { user: userId, archived: false } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // 3. Priority Distribution
    const priorityDist = await Company.aggregate([
      { $match: { user: userId, archived: false } },
      { $group: { _id: "$priority", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // 4. Monthly Trend (last 12 months)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
    twelveMonthsAgo.setDate(1);
    twelveMonthsAgo.setHours(0, 0, 0, 0);

    const monthlyTrend = await Company.aggregate([
      {
        $match: {
          user: userId,
          appliedDate: { $gte: twelveMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$appliedDate" },
            month: { $month: "$appliedDate" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    // 5. Top Companies
    const companyDist = await Company.aggregate([
      { $match: { user: userId, archived: false } },
      { $group: { _id: "$companyName", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          total: baseStats.total,
          selected: baseStats.selected,
          rejected: baseStats.rejected,
          interviews: baseStats.interviews,
          active: activeApps,
          successRate,
        },
        statusDistribution: statusDist,
        priorityDistribution: priorityDist,
        monthlyTrend,
        companyDistribution: companyDist,
      },
    });
  } catch (err) {
    console.error("getAnalytics:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to load analytics.",
    });
  }
};
