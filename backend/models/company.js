const mongoose = require("mongoose");

const STATUS_VALUES = [
  "Applied",
  "Interview Scheduled",
  "Selected",
  "Rejected",
  "Pending",
];

const PRIORITY_VALUES = ["High", "Medium", "Low"];

const companySchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      required: [true, "Company name is required"],
      trim: true,
      maxlength: [200, "Company name is too long"],
    },
    role: {
      type: String,
      required: [true, "Role is required"],
      trim: true,
      maxlength: [200, "Role is too long"],
    },
    package: {
      type: String,
      default: "",
      trim: true,
      maxlength: [120, "Package is too long"],
    },
    status: {
      type: String,
      enum: {
        values: STATUS_VALUES,
        message: "Invalid status",
      },
      default: "Applied",
    },
    interviewDate: {
      type: Date,
      default: null,
    },
    priority: {
      type: String,
      enum: {
        values: PRIORITY_VALUES,
        message: "Invalid priority",
      },
      default: "Medium",
    },
    notes: {
      type: String,
      default: "",
      maxlength: [5000, "Notes are too long"],
    },
    appliedDate: {
      type: Date,
      default: () => new Date(),
    },
    archived: {
      type: Boolean,
      default: false,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
  },
  { timestamps: true }
);

companySchema.index({ companyName: 1 });
companySchema.index({ status: 1 });
companySchema.index({ appliedDate: -1 });

const CompanyModel = mongoose.model("Company", companySchema);
CompanyModel.STATUS_VALUES = STATUS_VALUES;
CompanyModel.PRIORITY_VALUES = PRIORITY_VALUES;
module.exports = CompanyModel;
