const mongoose = require("mongoose");
const Company = require("../models/company");

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
