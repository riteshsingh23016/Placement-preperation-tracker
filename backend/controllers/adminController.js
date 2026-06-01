const User = require("../models/user");
const Company = require("../models/company");
const Note = require("../models/notes");
const Collection = require("../models/collection");
const Notification = require("../models/notification");
const PlacementDrive = require("../models/placementDrive");
const mongoose = require("mongoose");

// Get global stats for admin dashboard
exports.getStats = async (req, res) => {
  try {
    const totalStudents = await User.countDocuments({ role: "student" });
    const totalApps = await Company.countDocuments();
    const selectedStudents = await Company.countDocuments({ status: "Selected" });
    const rejectedApps = await Company.countDocuments({ status: "Rejected" });
    const scheduledInterviews = await Company.countDocuments({ status: "Interview Scheduled" });
    const totalNotes = await Note.countDocuments();
    const totalDrives = await PlacementDrive.countDocuments();

    // Active apps (Applied, Interview Scheduled, Pending)
    const activeApps = await Company.countDocuments({ 
      status: { $in: ["Applied", "Interview Scheduled", "Pending"] } 
    });

    res.status(200).json({
      success: true,
      data: {
        totalStudents,
        totalApplications: totalApps,
        selectedStudents,
        rejectedApplications: rejectedApps,
        scheduledInterviews,
        activeApplications: activeApps,
        totalNotes,
        totalDrives
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch admin stats" });
  }
};

// Get all users (students)
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find({ role: "student" })
      .select("-password")
      .sort({ createdAt: -1 });

    // Enhance users with application counts
    const enhancedUsers = await Promise.all(users.map(async (user) => {
      const appCount = await Company.countDocuments({ user: user._id });
      const selectedCount = await Company.countDocuments({ user: user._id, status: "Selected" });
      return {
        ...user.toObject(),
        applicationCount: appCount,
        selectedCount: selectedCount
      };
    }));

    res.status(200).json({ success: true, data: enhancedUsers });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch users" });
  }
};

// Toggle block status
exports.toggleBlock = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (user.role === "admin") {
      return res.status(403).json({ success: false, message: "Cannot block an admin" });
    }

    user.isBlocked = !user.isBlocked;
    await user.save();

    res.status(200).json({ 
      success: true, 
      message: `User ${user.isBlocked ? 'blocked' : 'unblocked'} successfully`,
      data: { isBlocked: user.isBlocked }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to update block status" });
  }
};

// Get all applications
exports.getApplications = async (req, res) => {
  try {
    const apps = await Company.find()
      .populate("user", "name email")
      .sort({ appliedDate: -1 });

    res.status(200).json({ success: true, data: apps });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch applications" });
  }
};

// Drive Management
exports.getDrives = async (req, res) => {
  try {
    const drives = await PlacementDrive.find().sort({ driveDate: -1 });
    res.status(200).json({ success: true, data: drives });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch drives" });
  }
};

exports.createDrive = async (req, res) => {
  try {
    const drive = await PlacementDrive.create({
      ...req.body,
      createdBy: req.user._id
    });
    res.status(201).json({ success: true, data: drive, message: "Drive created successfully" });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.updateDrive = async (req, res) => {
  try {
    const drive = await PlacementDrive.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!drive) return res.status(404).json({ success: false, message: "Drive not found" });
    res.status(200).json({ success: true, data: drive, message: "Drive updated successfully" });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.deleteDrive = async (req, res) => {
  try {
    const drive = await PlacementDrive.findByIdAndDelete(req.params.id);
    if (!drive) return res.status(404).json({ success: false, message: "Drive not found" });
    res.status(200).json({ success: true, message: "Drive deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to delete drive" });
  }
};

// Get a specific student's detail
exports.getStudentDetail = async (req, res) => {
  try {
    const student = await User.findOne({ _id: req.params.id, role: "student" }).select("-password");
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }
    res.status(200).json({ success: true, data: student });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch student details" });
  }
};

// Get student's applications
exports.getStudentApplications = async (req, res) => {
  try {
    const apps = await Company.find({ user: req.params.id }).sort({ appliedDate: -1 });
    res.status(200).json({ success: true, data: apps });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch student applications" });
  }
};

// Get student's notes
exports.getStudentNotes = async (req, res) => {
  try {
    const notes = await Note.find({ user: req.params.id }).populate("collectionId").sort({ updatedAt: -1 });
    res.status(200).json({ success: true, data: notes });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch student notes" });
  }
};

// Send notification to a specific student
exports.sendStudentNotification = async (req, res) => {
  try {
    const { title, message, priority } = req.body;
    if (!title || !message) {
      return res.status(400).json({ success: false, message: "Please provide title and message" });
    }
    const student = await User.findOne({ _id: req.params.id, role: "student" });
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    const Notification = require("../models/notification");
    const notification = await Notification.create({
      user: req.params.id,
      type: "system",
      title,
      message,
      priority: priority || "low",
    });

    res.status(201).json({ success: true, message: "Notification sent successfully", data: notification });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to send notification" });
  }
};

// Delete user and cascade delete all their data
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (user.role === "admin") {
      return res.status(403).json({ success: false, message: "Cannot delete an admin" });
    }

    // Cascade delete associated data
    await Company.deleteMany({ user: id });
    await Note.deleteMany({ user: id });
    await Collection.deleteMany({ user: id });
    await Notification.deleteMany({ user: id });

    // Delete the user
    await User.findByIdAndDelete(id);

    res.status(200).json({ 
      success: true, 
      message: "User and all associated data deleted successfully" 
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to delete user" });
  }
};

// Verify a user manually
exports.verifyUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (user.role === "admin") {
      return res.status(403).json({ success: false, message: "Cannot verify an admin" });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    user.verificationOTP = undefined;
    user.verificationOTPExpires = undefined;
    await user.save();

    res.status(200).json({ 
      success: true, 
      message: "User verified successfully",
      data: { isVerified: user.isVerified }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to verify user" });
  }
};

// Get all unverified users with audit details
exports.getUnverifiedUsers = async (req, res) => {
  try {
    const unverifiedUsers = await User.find({ isVerified: false })
      .select("-password")
      .sort({ createdAt: -1 });

    const auditCleanupPatchDate = new Date("2026-06-01T14:01:12Z");

    const enhanced = unverifiedUsers.map(user => {
      const createdBeforePatch = new Date(user.createdAt) < auditCleanupPatchDate;
      const emailDelivered = (user.email || "").toLowerCase().trim() === "riteshthelegend10f@gmail.com";

      return {
        ...user.toObject(),
        createdBeforePatch,
        emailDelivered,
        recoverable: true
      };
    });

    res.status(200).json({ success: true, data: enhanced });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch unverified users" });
  }
};

// Resend verification email for a specific stuck user
exports.resendVerificationForUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    const crypto = require("crypto");
    const sendEmail = require("../utils/sendEmail");

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (user.isVerified) {
      return res.status(400).json({ success: false, message: "User is already verified" });
    }

    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationOTP = Math.floor(100000 + Math.random() * 900000).toString();

    user.verificationToken = verificationToken;
    user.verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000;
    user.verificationOTP = verificationOTP;
    user.verificationOTPExpires = Date.now() + 24 * 60 * 60 * 1000;
    await user.save();

    const appUrl = process.env.APP_URL || `http://localhost:${process.env.PORT || 5000}`;
    const verificationLink = `${appUrl}/api/auth/verify-email/${verificationToken}`;

    try {
      await sendEmail({
        email: user.email,
        subject: "Verify Your Email - Placement Prep Tracker",
        text: `Hello ${user.name},\n\nPlease verify your email address by clicking the link below:\n\n${verificationLink}\n\nAlternatively, you can enter the following 6-digit code on the verification screen:\n\nVerification Code: ${verificationOTP}\n\nThis code and link are valid for 24 hours.`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #4f46e5; margin-bottom: 16px;">Email Verification</h2>
            <p>Hello <strong>${user.name}</strong>,</p>
            <p>Please click the button below to verify your email address and activate your account:</p>
            <div style="margin: 24px 0;">
              <a href="${verificationLink}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Verify Email Address</a>
            </div>
            <p style="margin: 20px 0;">Alternatively, you can verify your account by entering this 6-digit verification code on the verification screen:</p>
            <div style="margin: 24px 0; text-align: center;">
              <span style="font-size: 28px; font-weight: bold; letter-spacing: 4px; padding: 12px 24px; background-color: #f1f5f9; border-radius: 8px; border: 1px solid #cbd5e1; display: inline-block; color: #1e1b4b;">${verificationOTP}</span>
            </div>
            <p style="color: #64748b; font-size: 14px;">This link and code are valid for 24 hours. If the button doesn't work, copy and paste this URL into your browser:</p>
            <p style="color: #64748b; font-size: 14px; word-break: break-all;">${verificationLink}</p>
          </div>
        `,
      });

      res.status(200).json({ success: true, message: "Verification email resent successfully." });
    } catch (emailErr) {
      console.error("[Admin Repair] Email dispatch failed:", emailErr);
      const isSandbox = emailErr.message && emailErr.message.includes("restricted by the email provider");
      res.status(isSandbox ? 403 : 500).json({
        success: false,
        message: emailErr.message || "Failed to resend verification email.",
        isSandboxError: isSandbox
      });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to resend verification email" });
  }
};


