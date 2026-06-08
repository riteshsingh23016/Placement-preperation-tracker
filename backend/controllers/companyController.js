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

  // Company Name
  const companyName = (body.companyName || "").trim();
  if (!companyName) {
    errors.companyName = "Company name is required.";
  } else if (companyName.length < 2 || companyName.length > 100) {
    errors.companyName = "Company name must be between 2 and 100 characters.";
  } else if (/^[+-]?\d+(\.\d+)?$/.test(companyName)) {
    errors.companyName = "Company name cannot contain only numbers.";
  } else if (!/^[a-zA-Z0-9\s&.\-']+$/.test(companyName)) {
    errors.companyName = "Company name contains invalid characters.";
  } else if (!/[a-zA-Z0-9]/.test(companyName)) {
    errors.companyName = "Company name cannot consist only of special characters.";
  }

  // Job Role
  const role = (body.role || "").trim();
  if (!role) {
    errors.role = "Job role is required.";
  } else if (role.length < 2 || role.length > 80) {
    errors.role = "Job role must be between 2 and 80 characters.";
  } else if (/^[+-]?\d+(\.\d+)?$/.test(role)) {
    errors.role = "Job role cannot contain only numbers.";
  } else if (!/[a-zA-Z0-9]/.test(role)) {
    errors.role = "Job role cannot consist only of special characters.";
  }

  // Package
  const pkg = (body.package || "").trim();
  if (pkg) {
    const num = Number(pkg);
    if (isNaN(num) || !/^\d+(\.\d+)?$/.test(pkg)) {
      errors.package = "Package must be a valid positive number.";
    } else if (num <= 0) {
      errors.package = "Package must be greater than 0.";
    } else if (num > 100) {
      errors.package = "Package must not exceed 100 LPA.";
    }
  }

  // Interview Date
  if (body.interviewDate) {
    const selectedDate = new Date(body.interviewDate);
    if (isNaN(selectedDate.getTime())) {
      errors.interviewDate = "Invalid interview date.";
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selectedSOD = new Date(selectedDate);
      selectedSOD.setHours(0, 0, 0, 0);
      if (selectedSOD < today) {
        errors.interviewDate = "Interview date cannot be in the past.";
      }
    }
  }

  // Status
  const allowedStatuses = ["Applied", "Interview Scheduled", "Selected", "Rejected"];
  if (body.status && !allowedStatuses.includes(body.status)) {
    errors.status = "Invalid status.";
  }

  // Priority
  const allowedPriorities = ["High", "Medium", "Low"];
  if (body.priority && !allowedPriorities.includes(body.priority)) {
    errors.priority = "Invalid priority.";
  }

  // Notes
  const notes = (body.notes || "").trim();
  const hasScript = /<script\b[^>]*>|javascript:|on\w+\s*=/i.test(notes);
  if (hasScript) {
    errors.notes = "Notes contain forbidden script content.";
  } else if (notes.length > 1000) {
    errors.notes = "Notes must not exceed 1000 characters.";
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
  if (body.notes !== undefined) fields.notes = String(body.notes ?? "").replace(/<[^>]*>/g, '').trim();
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
      notes: String(req.body.notes ?? "").replace(/<[^>]*>/g, '').trim(),
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

    const company = await Company.findOne({ _id: id, user: req.user._id });
    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found.",
        code: "NOT_FOUND",
      });
    }

    const updates = collectUpdateFields(req.body);

    // Merge updates with existing values to validate final state
    const merged = {
      companyName: updates.companyName !== undefined ? updates.companyName : company.companyName,
      role: updates.role !== undefined ? updates.role : company.role,
      package: updates.package !== undefined ? updates.package : company.package,
      status: updates.status !== undefined ? updates.status : company.status,
      priority: updates.priority !== undefined ? updates.priority : company.priority,
      notes: updates.notes !== undefined ? updates.notes : company.notes,
    };

    // Only validate interviewDate if it is being modified/sent
    if (req.body.interviewDate !== undefined) {
      merged.interviewDate = req.body.interviewDate;
    }

    const errors = validateCreatePayload(merged);
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation failed.",
        errors,
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
      { $match: { user: userId } }, // Include archived in totals
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

exports.seedDemoData = async (req, res) => {
  try {
    const userId = req.user._id;

    // Check if demo data already exists to prevent duplicates
    const existingDemo = await Company.findOne({ user: userId, isDemo: true });
    if (existingDemo) {
      return res.status(400).json({
        success: false,
        message: "Demo data already exists for this user.",
      });
    }

    const companiesToSeed = [
      "TCS", "TCS", "TCS", "TCS", "TCS",
      "Infosys", "Infosys", "Infosys", "Infosys",
      "Wipro", "Wipro", "Wipro",
      "Cognizant", "Cognizant",
      "Accenture", "Accenture",
      "Zoho", "IBM"
    ];

    const roles = ["SDE", "Full Stack Developer", "Backend Engineer", "Frontend Developer", "Data Analyst", "DevOps Intern"];
    const statuses = ["Applied", "Interview Scheduled", "Selected", "Rejected", "Pending"];
    const priorities = ["High", "Medium", "Low"];

    const demoRecords = [];
    const now = new Date();

    const distribution = [
      { monthsAgo: 7, count: 2 },
      { monthsAgo: 6, count: 2 },
      { monthsAgo: 5, count: 3 },
      { monthsAgo: 4, count: 2 },
      { monthsAgo: 3, count: 3 },
      { monthsAgo: 2, count: 2 },
      { monthsAgo: 1, count: 2 },
      { monthsAgo: 0, count: 2 }
    ];

    let companyIdx = 0;

    for (const item of distribution) {
      for (let i = 0; i < item.count; i++) {
        const appliedDate = new Date(now);
        appliedDate.setMonth(now.getMonth() - item.monthsAgo);
        appliedDate.setDate(Math.floor(Math.random() * 25) + 1);

        let status = "Applied";
        if (item.monthsAgo > 3) {
          status = Math.random() > 0.4 ? "Rejected" : "Selected";
        } else if (item.monthsAgo > 1) {
          status = Math.random() > 0.5 ? "Interview Scheduled" : "Applied";
        } else {
          status = statuses[Math.floor(Math.random() * statuses.length)];
        }

        let interviewDate = null;
        if (status === "Interview Scheduled") {
          interviewDate = new Date(appliedDate);
          interviewDate.setDate(appliedDate.getDate() + 14);
        }

        const companyName = companiesToSeed[companyIdx % companiesToSeed.length];
        demoRecords.push({
          companyName: companyName,
          role: roles[Math.floor(Math.random() * roles.length)],
          package: `${Math.floor(Math.random() * 10) + 8}-${Math.floor(Math.random() * 15) + 15} LPA`,
          status: status,
          priority: priorities[Math.floor(Math.random() * priorities.length)],
          notes: `Demo data for ${companyName}. This is a sample application record.`,
          appliedDate: appliedDate,
          interviewDate: interviewDate,
          user: userId,
          isDemo: true
        });

        companyIdx++;
      }
    }

    await Company.insertMany(demoRecords);

    return res.status(201).json({
      success: true,
      message: `Successfully seeded ${demoRecords.length} demo records.`,
      data: { count: demoRecords.length }
    });
  } catch (err) {
    console.error("seedDemoData:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to seed demo data.",
    });
  }
};

exports.clearDemoData = async (req, res) => {
  try {
    const userId = req.user._id;
    const result = await Company.deleteMany({ user: userId, isDemo: true });

    return res.status(200).json({
      success: true,
      message: `Successfully removed ${result.deletedCount} demo records.`,
      data: { count: result.deletedCount }
    });
  } catch (err) {
    console.error("clearDemoData:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to clear demo data.",
    });
  }
};
