const User = require("../models/user");
const Collection = require("../models/collection");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const sendEmail = require("../utils/sendEmail");

const otpRateLimiter = new Map();
const DISABLE_RATE_LIMITER = process.env.DISABLE_RATE_LIMITER === 'true';

const checkForgotPasswordRateLimit = (email, ip) => {
  const now = Date.now();
  const requests = otpRateLimiter.get(email) || [];
  const recentRequests = requests.filter(time => now - time < 15 * 60 * 1000);
  
  const attemptCount = recentRequests.length;
  const isLimited = attemptCount >= 3;
  
  const oldestTime = recentRequests[0] || now;
  const resetTime = new Date(oldestTime + 15 * 60 * 1000).toISOString();

  if (!isLimited) {
    recentRequests.push(now);
    otpRateLimiter.set(email, recentRequests);
  }

  const remainingAttempts = isLimited ? 0 : Math.max(0, 3 - recentRequests.length);

  return {
    isLimited,
    ip,
    email,
    attemptCount: isLimited ? attemptCount : recentRequests.length,
    remainingAttempts,
    resetTime
  };
};


const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || "default_jwt_secret_for_dev_only", {
    expiresIn: process.env.JWT_EXPIRES_IN || "30d",
  });
};

/**
 * Validates email format according to strict production requirements
 */
const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  
  const trimmed = email.trim();
  
  if (/\s/.test(trimmed)) return false;
  
  const parts = trimmed.split('@');
  if (parts.length !== 2) return false;
  
  const [local, domain] = parts;
  if (!local) return false;
  
  if (!domain || !domain.includes('.')) return false;
  
  const domainParts = domain.split('.');
  const tld = domainParts[domainParts.length - 1];
  if (tld.length < 2) return false;
  
  if (domainParts.some(p => p === "")) return false;

  return true;
};

exports.signup = async (req, res) => {
  try {
    let { name, email, password } = req.body;
    console.log("[Signup Flow] Request body received for:", email);

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: "Please provide all required fields" });
    }

    // Validation
    if (!isValidEmail(email)) {
      return res.status(400).json({ success: false, message: "Please enter a valid email address." });
    }

    // Normalization
    email = email.trim().toLowerCase();
    name = name.trim();

    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000;
    const verificationOTP = Math.floor(100000 + Math.random() * 900000).toString();
    console.log("[SIGNUP OTP GENERATED]");
    const verificationOTPExpires = Date.now() + 24 * 60 * 60 * 1000;
    console.log(`[Signup Flow] Verification Token & OTP generated: Token: ${verificationToken.substring(0, 10)}..., OTP: ${verificationOTP}`);

    const user = await User.create({
      name,
      email,
      password,
      role: "student",
      isBlocked: false,
      isVerified: false,
      verificationToken,
      verificationTokenExpires,
      verificationOTP,
      verificationOTPExpires,
    });

    if (!user) {
      return res.status(400).json({ success: false, message: "Failed to create user in database" });
    }
    console.log("[SIGNUP OTP SAVED]");
    console.log("[Signup Flow] User created in database successfully. isVerified: false");

    // Provision default collections
    await Collection.insertMany([
      { name: "General", user: user._id, icon: "sparkles", color: "muted" },
      { name: "Company-wise", user: user._id, icon: "building-2", color: "blue" },
      { name: "DSA", user: user._id, icon: "code-2", color: "good" },
      { name: "DBMS", user: user._id, icon: "database", color: "purple" },
      { name: "OS + CN", user: user._id, icon: "globe", color: "amber" },
    ]);

    const appUrl = process.env.APP_URL || `http://localhost:${process.env.PORT || 5000}`;
    const verificationLink = `${appUrl}/api/auth/verify-email/${verificationToken}`;

    let emailResult;
    try {
      emailResult = await sendEmail({
        email: user.email,
        subject: "Verify Your Email - Placement Prep Tracker",
        text: `Hello ${user.name},\n\nPlease verify your email address by clicking the link below:\n\n${verificationLink}\n\nAlternatively, you can enter the following 6-digit code on the verification screen:\n\nVerification Code: ${verificationOTP}\n\nThis code and link are valid for 24 hours.`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #4f46e5; margin-bottom: 16px;">Email Verification</h2>
            <p>Hello <strong>${user.name}</strong>,</p>
            <p>Thank you for registering on Placement Prep Tracker. Please click the button below to verify your email address and activate your account:</p>
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
      console.log("[SIGNUP EMAIL SENT]");
      if (emailResult && emailResult.messageId) {
        console.log(`[RESEND MESSAGE ID] ${emailResult.messageId}`);
      }
      console.log("[Signup Flow] Verification email sent successfully to:", user.email);
    } catch (emailErr) {
      console.error("[Signup Flow] Email dispatch failed, deleting created user record:", emailErr);
      await User.deleteOne({ _id: user._id });
      await Collection.deleteMany({ user: user._id });

      const isSandbox = emailErr.message && emailErr.message.includes("restricted by the email provider");
      return res.status(isSandbox ? 403 : 500).json({
        success: false,
        message: emailErr.message || "Failed to send verification email.",
        isSandboxError: isSandbox
      });
    }

    res.status(201).json({
      success: true,
      message: "Verification email sent. Please check your inbox.",
      data: {
        email: user.email,
        isVerified: false,
      },
    });
  } catch (err) {
    console.error("[Signup Flow] Error thrown:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to sign up",
    });
  }
};

exports.login = async (req, res) => {
  try {
    let { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide email and password",
      });
    }

    // Validation
    if (!isValidEmail(email)) {
      return res.status(400).json({ success: false, message: "Please enter a valid email address." });
    }

    // Normalization
    email = email.trim().toLowerCase();

    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const isMatch = await user.matchPassword(password);
    
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email address before logging in.",
        isNotVerified: true,
      });
    }

    // Role check validation
    const { expectedRole } = req.body;
    if (expectedRole && user.role !== expectedRole) {
      const msg = user.role === "admin"
        ? "This is an admin account. Please use Admin Login."
        : "This is a student account. Please use Student Login.";
      return res.status(400).json({
        success: false,
        message: msg,
      });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        message: "Your account has been blocked by admin.",
      });
    }

    res.status(200).json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isBlocked: user.isBlocked,
        token: generateToken(user._id),
      },
    });
  } catch (err) {
    console.error("[Auth] Login Error:", err.message);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to log in",
    });
  }
};

exports.getMe = async (req, res) => {
  res.status(200).json({
    success: true,
    data: req.user,
  });
};

exports.getProfile = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      data: req.user,
    });
  } catch (err) {
    console.error("[Auth] Get Profile Error:", err.message);
    res.status(500).json({
      success: false,
      message: "Failed to load profile",
    });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (req.body.name !== undefined) {
      const trimmedName = req.body.name.trim();
      if (!trimmedName) {
        return res.status(400).json({ success: false, message: "Name cannot be empty" });
      }
      user.name = trimmedName;
    }
    
    if (req.body.phoneNumber !== undefined) user.phoneNumber = req.body.phoneNumber.trim();
    if (req.body.bio !== undefined) user.bio = req.body.bio.trim();

    if (user.role === "student") {
      if (req.body.collegeName !== undefined) user.collegeName = req.body.collegeName.trim();
      if (req.body.course !== undefined) user.course = req.body.course.trim();
      if (req.body.branch !== undefined) user.branch = req.body.branch.trim();
      if (req.body.graduationYear !== undefined) user.graduationYear = req.body.graduationYear.trim();
      if (req.body.skills !== undefined) user.skills = req.body.skills.trim();
      if (req.body.linkedinUrl !== undefined) user.linkedinUrl = req.body.linkedinUrl.trim();
      if (req.body.githubUrl !== undefined) user.githubUrl = req.body.githubUrl.trim();
      if (req.body.resumeUrl !== undefined) user.resumeUrl = req.body.resumeUrl.trim();
    } else if (user.role === "admin") {
      if (req.body.department !== undefined) user.department = req.body.department.trim();
      if (req.body.designation !== undefined) user.designation = req.body.designation.trim();
      if (req.body.officeLocation !== undefined) user.officeLocation = req.body.officeLocation.trim();
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: user,
    });
  } catch (err) {
    console.error("[Auth] Update Profile Error:", err.message);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to update profile",
    });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Please fill in all password fields",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "New password and confirm password do not match",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 8 characters long",
      });
    }

    const hasUppercase = /[A-Z]/.test(newPassword);
    const hasLowercase = /[a-z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);

    if (!hasUppercase || !hasLowercase || !hasNumber) {
      return res.status(400).json({
        success: false,
        message: "New password must contain at least one uppercase letter, one lowercase letter, and one number",
      });
    }

    const user = await User.findById(req.user._id).select("+password");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Incorrect current password",
      });
    }

    const isSameAsCurrent = await user.matchPassword(newPassword);
    if (isSameAsCurrent) {
      return res.status(400).json({
        success: false,
        message: "New password cannot be the same as current password",
      });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (err) {
    console.error("[Auth] Change Password Error:", err.message);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to change password",
    });
  }
};

exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;
    console.log("[Email Verification Link Flow] Token received:", token ? token.substring(0, 10) + "..." : "null");
    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpires: { $gt: Date.now() },
    });

    if (!user) {
      console.log("[Email Verification Link Flow] Verification failed: user not found or expired token.");
      return res.redirect("/index.html?verified=false&error=invalid_or_expired_token");
    }

    console.log("[Email Verification Link Flow] User found:", user.email);
    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    user.verificationOTP = undefined;
    user.verificationOTPExpires = undefined;
    await user.save();
    console.log("[Email Verification Link Flow] Email verified successfully. Database updated.");

    res.redirect("/index.html?verified=true");
  } catch (err) {
    console.error("[Email Verification Link Flow] Error thrown:", err);
    res.redirect("/index.html?verified=false&error=server_error");
  }
};

exports.resendVerification = async (req, res) => {
  try {
    let { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: "Please provide an email address." });
    }

    email = email.trim().toLowerCase();
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    if (user.isVerified) {
      return res.status(400).json({ success: false, message: "This account is already verified." });
    }

    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationOTP = Math.floor(100000 + Math.random() * 900000).toString();
    console.log("[SIGNUP OTP GENERATED]");

    user.verificationToken = verificationToken;
    user.verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000;
    user.verificationOTP = verificationOTP;
    user.verificationOTPExpires = Date.now() + 24 * 60 * 60 * 1000;
    await user.save();
    console.log("[SIGNUP OTP SAVED]");

    const appUrl = process.env.APP_URL || `http://localhost:${process.env.PORT || 5000}`;
    const verificationLink = `${appUrl}/api/auth/verify-email/${verificationToken}`;

    let emailResult;
    try {
      emailResult = await sendEmail({
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
      console.log("[SIGNUP EMAIL SENT]");
      if (emailResult && emailResult.messageId) {
        console.log(`[RESEND MESSAGE ID] ${emailResult.messageId}`);
      }
    } catch (emailErr) {
      console.error("[Resend Verification Flow] Email dispatch failed:", emailErr);
      const isSandbox = emailErr.message && emailErr.message.includes("restricted by the email provider");
      return res.status(isSandbox ? 403 : 500).json({
        success: false,
        message: emailErr.message || "Failed to resend verification email.",
        isSandboxError: isSandbox
      });
    }

    res.status(200).json({ success: true, message: "Verification email resent successfully." });
  } catch (err) {
    console.error("[Auth] Resend Verification Error:", err.message);
    res.status(500).json({ success: false, message: err.message || "Failed to resend verification email." });
  }
};

exports.forgotPassword = async (req, res) => {
  console.log("[FORGOT PASSWORD START]");
  try {
    let { email } = req.body;
    console.log("[Forgot Password Flow] Email received:", email);
    if (!email) {
      return res.status(400).json({ success: false, message: "Please provide an email address." });
    }

    email = email.trim().toLowerCase();

    // Check rate limit and log the details
    const rateLimitInfo = checkForgotPasswordRateLimit(email, req.ip);
    console.log(`[Rate Limit Audit] IP: ${rateLimitInfo.ip}, Email: ${rateLimitInfo.email}, Attempt Count: ${rateLimitInfo.attemptCount}, Remaining Attempts: ${rateLimitInfo.remainingAttempts}, Reset Time: ${rateLimitInfo.resetTime}`);

    const isBypassed = DISABLE_RATE_LIMITER || process.env.DISABLE_RATE_LIMITER === 'true';

    if (rateLimitInfo.isLimited && !isBypassed) {
      console.log("[Forgot Password Flow] Request blocked by rate limiting.");
      return res.status(429).json({
        success: false,
        error: "Too Many Requests",
        message: "Too many password reset requests. Please try again after 15 minutes.",
        ip: rateLimitInfo.ip,
        email: rateLimitInfo.email,
        attemptCount: rateLimitInfo.attemptCount,
        remainingAttempts: rateLimitInfo.remainingAttempts,
        resetTime: rateLimitInfo.resetTime
      });
    }

    if (rateLimitInfo.isLimited && isBypassed) {
      console.log(`[Bypass] Rate limit would have blocked (Attempt Count: ${rateLimitInfo.attemptCount}), but rate limiting is disabled for debugging.`);
    }

    const user = await User.findOne({ email });

    if (!user) {
      console.log("[Forgot Password Flow] User email not found in database. Still returning success to prevent enumeration.");
      return res.status(200).json({
        success: true,
        message: "If that email is registered, we have sent a password reset OTP code.",
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log("[FORGOT OTP GENERATED]");
    console.log("[Forgot Password Flow] OTP generated:", otp);

    user.resetPasswordOTP = otp;
    user.resetPasswordOTPExpires = Date.now() + 15 * 60 * 1000;
    await user.save();
    console.log("[FORGOT OTP SAVED]");
    console.log("[Forgot Password Flow] OTP stored successfully in database.");

    console.log("[Forgot Password Flow] Dispatching email...");
    try {
      const emailResult = await sendEmail({
        email: user.email,
        subject: "Password Reset OTP - Placement Prep Tracker",
        text: `Hello ${user.name},\n\nYour password reset verification code is: ${otp}\n\nThis OTP is valid for 15 minutes.`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #4f46e5; margin-bottom: 16px;">Password Reset Code</h2>
            <p>Hello <strong>${user.name}</strong>,</p>
            <p>You requested a password reset. Please use the following 6-digit verification code to complete the process:</p>
            <div style="margin: 24px 0; text-align: center;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; padding: 12px 24px; background-color: #f1f5f9; border-radius: 8px; border: 1px solid #cbd5e1; display: inline-block;">${otp}</span>
            </div>
            <p style="color: #64748b; font-size: 14px;">This code is valid for 15 minutes. If you did not request this, you can safely ignore this email.</p>
          </div>
        `,
      });
      console.log("[FORGOT EMAIL SENT]");
      if (emailResult && emailResult.messageId) {
        console.log(`[RESEND MESSAGE ID] ${emailResult.messageId}`);
      }
      console.log("[Forgot Password Flow] Email sent successfully.");
    } catch (emailErr) {
      console.log("[RESEND EMAIL FAILED]");
      console.error("[Forgot Password Flow] Email dispatch failed:", emailErr);
      throw emailErr;
    }

    res.status(200).json({
      success: true,
      message: "If that email is registered, we have sent a password reset OTP code.",
    });
  } catch (err) {
    console.error("[Forgot Password Flow] Error thrown:", err);
    const isSandbox = err.message && err.message.includes("restricted by the email provider");
    res.status(isSandbox ? 403 : 500).json({
      success: false,
      message: err.message || "Failed to process forgot password request.",
      isSandboxError: isSandbox
    });
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    let { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: "Please provide email and OTP code." });
    }

    email = email.trim().toLowerCase();
    otp = otp.trim();

    const user = await User.findOne({
      email,
      resetPasswordOTP: otp,
      resetPasswordOTPExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ success: false, message: "Invalid or expired OTP code." });
    }

    res.status(200).json({ success: true, message: "OTP code verified successfully." });
  } catch (err) {
    console.error("[Auth] Verify OTP Error:", err.message);
    res.status(500).json({ success: false, message: err.message || "Failed to verify OTP code." });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    let { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ success: false, message: "Please provide all required fields." });
    }

    email = email.trim().toLowerCase();
    otp = otp.trim();

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: "New password must be at least 6 characters long." });
    }

    const user = await User.findOne({
      email,
      resetPasswordOTP: otp,
      resetPasswordOTPExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ success: false, message: "Invalid or expired OTP code." });
    }

    user.password = newPassword;
    user.resetPasswordOTP = undefined;
    user.resetPasswordOTPExpires = undefined;
    await user.save();

    res.status(200).json({ success: true, message: "Password reset successfully. You can now login." });
  } catch (err) {
    console.error("[Auth] Reset Password Error:", err.message);
    res.status(500).json({ success: false, message: err.message || "Failed to reset password." });
  }
};

exports.verifyEmailOtp = async (req, res) => {
  try {
    let { email, otp } = req.body;
    console.log(`[Email Verification OTP Flow] Parameters received: email: ${email}, otp: ${otp}`);
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: "Please provide email and verification code." });
    }

    email = email.trim().toLowerCase();
    otp = otp.trim();

    const user = await User.findOne({
      email,
      verificationOTP: otp,
      verificationOTPExpires: { $gt: Date.now() },
    });

    if (!user) {
      console.log("[Email Verification OTP Flow] Verification failed: invalid or expired OTP code.");
      return res.status(400).json({ success: false, message: "Invalid or expired verification code." });
    }

    console.log("[Email Verification OTP Flow] User found with matching active OTP code:", user.email);
    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    user.verificationOTP = undefined;
    user.verificationOTPExpires = undefined;
    await user.save();
    console.log("[Email Verification OTP Flow] Email verified successfully via OTP. Database updated.");

    res.status(200).json({ success: true, message: "Email verified successfully. You can now login." });
  } catch (err) {
    console.error("[Email Verification OTP Flow] Error thrown:", err);
    res.status(500).json({ success: false, message: err.message || "Failed to verify email code." });
  }
};
