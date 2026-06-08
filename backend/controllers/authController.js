const User = require("../models/user");
const Collection = require("../models/collection");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const sendEmail = require("../utils/sendEmail");
const PasswordResetRequest = require("../models/PasswordResetRequest");
const Notification = require("../models/notification");
const Validators = require("../utils/validators");

const isValidPassword = (password) => {
  return !Validators.validatePasswordComplexity(password);
};

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
  return !Validators.validateEmail(email);
};

exports.signup = async (req, res) => {
  try {
    let { name, email, password } = req.body;
    console.log("[Signup Flow] Request body received for:", email);

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: "Please provide all required fields" });
    }

    const nameErr = Validators.validateName(name, "Full Name", true);
    if (nameErr) {
      return res.status(400).json({ success: false, message: nameErr });
    }

    const emailErr = Validators.validateEmail(email);
    if (emailErr) {
      return res.status(400).json({ success: false, message: emailErr });
    }

    const passErr = Validators.validatePasswordComplexity(password);
    if (passErr) {
      return res.status(400).json({ success: false, message: passErr });
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

    const user = await User.create({
      name,
      email,
      password,
      role: "student",
      isBlocked: false,
      isVerified: true,
    });

    if (!user) {
      return res.status(400).json({ success: false, message: "Failed to create user in database" });
    }
    console.log("[Signup Flow] User created in database successfully. isVerified: true");

    // Provision default collections
    await Collection.insertMany([
      { name: "General", user: user._id, icon: "sparkles", color: "muted" },
      { name: "Company-wise", user: user._id, icon: "building-2", color: "blue" },
      { name: "DSA", user: user._id, icon: "code-2", color: "good" },
      { name: "DBMS", user: user._id, icon: "database", color: "purple" },
      { name: "OS + CN", user: user._id, icon: "globe", color: "amber" },
    ]);

    res.status(201).json({
      success: true,
      message: "Registration successful. You can now log in.",
      data: {
        email: user.email,
        isVerified: true,
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

    console.log(`[Auth Login] Login email attempt received for: ${email}`);

    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      console.log(`[Auth Login] User not found in database for email: ${email}. adminUserFound: false`);
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }
    const adminUserFound = user.role === "admin";
    console.log(`[Auth Login] User found in database for email: ${email}. adminUserFound: ${adminUserFound}, role: ${user.role}`);

    const isMatch = await user.matchPassword(password);
    console.log(`[Auth Login] Bcrypt password match result for ${email}: ${isMatch}`);
    
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    if (user.role === "admin" && !user.isVerified) {
      console.log(`[Auth Login] Login blocked: Admin user ${email} is unverified.`);
      return res.status(403).json({
        success: false,
        message: "Please verify your email address before logging in.",
        isNotVerified: true,
      });
    }

    // Role check validation
    const { expectedRole } = req.body;
    if (expectedRole) {
      const roleMatches = user.role === expectedRole;
      console.log(`[Auth Login] Role check validation - expectedRole: ${expectedRole}, actualRole: ${user.role}, roleMatches: ${roleMatches}`);
      if (!roleMatches) {
        const msg = user.role === "admin"
          ? "This is an admin account. Please use Admin Login."
          : "This is a student account. Please use Student Login.";
        return res.status(400).json({
          success: false,
          message: msg,
        });
      }
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
      const nameErr = Validators.validateName(req.body.name, "Full Name", true);
      if (nameErr) {
        return res.status(400).json({ success: false, message: nameErr });
      }
      user.name = req.body.name.trim();
    }
    
    if (req.body.phoneNumber !== undefined) {
      const phoneErr = Validators.validatePhoneNumber(req.body.phoneNumber, false);
      if (phoneErr) {
        return res.status(400).json({ success: false, message: phoneErr });
      }
      user.phoneNumber = req.body.phoneNumber.trim();
    }

    if (req.body.bio !== undefined) {
      const bioErr = Validators.validateLongText(req.body.bio, 5000, "Short Bio", false);
      if (bioErr) {
        return res.status(400).json({ success: false, message: bioErr });
      }
      user.bio = req.body.bio.trim();
    }

    if (user.role === "student") {
      const textFields = [
        { name: "collegeName", label: "College Name" },
        { name: "course", label: "Course / Degree" },
        { name: "branch", label: "Branch / Department" },
        { name: "skills", label: "Skills" }
      ];
      for (const field of textFields) {
        if (req.body[field.name] !== undefined) {
          const val = req.body[field.name].trim();
          const txtErr = Validators.validateProfileText(val, field.label, false, 2, 150);
          if (txtErr) {
            return res.status(400).json({ success: false, message: txtErr });
          }
          user[field.name] = val;
        }
      }

      if (req.body.graduationYear !== undefined) {
        const yearErr = Validators.validateGraduationYear(req.body.graduationYear);
        if (yearErr) {
          return res.status(400).json({ success: false, message: yearErr });
        }
        user.graduationYear = req.body.graduationYear.trim();
      }

      const urlFields = [
        { key: "linkedinUrl", label: "LinkedIn URL" },
        { key: "githubUrl", label: "GitHub URL" },
        { key: "resumeUrl", label: "Resume URL" }
      ];
      for (const field of urlFields) {
        if (req.body[field.key] !== undefined) {
          const urlErr = Validators.validateUrl(req.body[field.key], field.label);
          if (urlErr) {
            return res.status(400).json({ success: false, message: urlErr });
          }
          user[field.key] = req.body[field.key].trim();
        }
      }
    } else if (user.role === "admin") {
      const adminTextFields = [
        { name: "department", label: "Department" },
        { name: "designation", label: "Designation" },
        { name: "officeLocation", label: "Office Location" }
      ];
      for (const field of adminTextFields) {
        if (req.body[field.name] !== undefined) {
          const val = req.body[field.name].trim();
          const txtErr = Validators.validateProfileText(val, field.label, false, 2, 150);
          if (txtErr) {
            return res.status(400).json({ success: false, message: txtErr });
          }
          user[field.name] = val;
        }
      }
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

    const passErr = Validators.validatePasswordComplexity(newPassword, "New password");
    if (passErr) {
      return res.status(400).json({
        success: false,
        message: passErr,
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
    let { email, role } = req.body;
    console.log(`[Forgot Password Flow] Email received: ${email}, Role: ${role}`);
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

    // Branching by role: explicit detection, with fallback to user's database role or student
    const targetRole = role || (user ? user.role : "student");
    console.log(`[Forgot Password] Requested Email: ${email}, Requested Role: ${targetRole}`);

    if (targetRole === "admin") {
      if (!user) {
        console.log(`[Forgot Password] Fail! Admin email verification failed for: ${email}. Reason: Admin user not found. Email sent: false`);
        return res.status(404).json({
          success: false,
          message: "Administrator account not found with this email address."
        });
      }

      if (user.role !== "admin") {
        console.log(`[Forgot Password] Fail! Admin email verification failed for: ${email}. Reason: User is not an admin. Matched User Role: ${user.role}. Email sent: false`);
        return res.status(403).json({
          success: false,
          message: "This email address is not registered as an administrator."
        });
      }

      // Admin flow: Email OTP
      const resetPasswordOTP = Math.floor(100000 + Math.random() * 900000).toString();
      user.resetPasswordOTP = resetPasswordOTP;
      user.resetPasswordOTPExpires = Date.now() + 15 * 60 * 1000; // 15 mins validity
      await user.save();

      console.log(`[Forgot Password] Admin OTP generated: ${resetPasswordOTP}`);

      try {
        const message = `Hello Admin ${user.name},\n\nYou requested a password reset. Please enter the following 6-digit verification code to reset your password:\n\nOTP Code: ${resetPasswordOTP}\n\nThis OTP is valid for 15 minutes.`;
        const html = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #4f46e5; margin-bottom: 16px;">Password Reset Request</h2>
            <p>Hello <strong>Admin ${user.name}</strong>,</p>
            <p>You requested a password reset. Please enter the following 6-digit code on the reset password screen to update your credentials:</p>
            <div style="margin: 24px 0; text-align: center;">
              <span style="font-size: 28px; font-weight: bold; letter-spacing: 4px; padding: 12px 24px; background-color: #f1f5f9; border-radius: 8px; border: 1px solid #cbd5e1; display: inline-block; color: #1e1b4b;">${resetPasswordOTP}</span>
            </div>
            <p style="color: #64748b; font-size: 14px;">This code is valid for 15 minutes. If you did not request this, please ignore this email.</p>
          </div>
        `;

        await sendEmail({
          email: user.email,
          subject: "Password Reset OTP - Placement Prep Tracker",
          text: message,
          html: html
        });

        console.log(`[Forgot Password] Success! Admin recovery email sent to: ${user.email}, Matched User Role: ${user.role}, Email sent: true`);
        return res.status(200).json({
          success: true,
          message: "Verification OTP code sent to your email.",
          role: "admin"
        });
      } catch (emailErr) {
        console.error("[Forgot Password] Admin reset email failed:", emailErr);
        const isSandbox = emailErr.message && (
          emailErr.message.includes("restricted by the email provider") ||
          emailErr.message.includes("Sandbox")
        );
        const adminFriendlyMessage = isSandbox
          ? "Email delivery is restricted by the Resend Sandbox. Please verify the admin email (riteshthelegend10f@gmail.com) in your Resend dashboard or use a verified sending domain."
          : (emailErr.message || "Failed to send verification email.");
        return res.status(isSandbox ? 403 : 500).json({
          success: false,
          message: adminFriendlyMessage,
          isSandboxError: isSandbox
        });
      }
    } else {
      // Student flow: Request to Admin
      if (!user) {
        console.log(`[Forgot Password] Fail! Student recovery failed for: ${email}. Reason: Student user not found. Email sent: false`);
        return res.status(404).json({
          success: false,
          message: "Student account not found with this email address."
        });
      }

      if (user.role !== "student") {
        console.log(`[Forgot Password] Fail! Student recovery failed for: ${email}. Reason: User is not a student. Matched User Role: ${user.role}. Email sent: false`);
        return res.status(403).json({
          success: false,
          message: "This email address is not registered as a student."
        });
      }

      // Create Password Reset Request in MongoDB
      await PasswordResetRequest.create({
        user: user._id,
        email: user.email,
        status: "pending"
      });

      // Create Notification for Admin
      const adminUser = await User.findOne({ role: "admin" });
      if (adminUser) {
        await Notification.create({
          user: adminUser._id,
          type: "system",
          title: "Password Reset Request",
          message: `Student ${user.name} (${user.email}) requested a password reset.`,
          priority: "high"
        });
      }

      console.log(`[Forgot Password] Success! Student request logged for: ${user.email}, Matched User Role: ${user.role}, Email sent: false`);

      return res.status(200).json({
        success: true,
        message: "Your password reset request has been submitted to the administrator. Please contact your admin for a temporary password.",
        role: "student"
      });
    }
  } catch (err) {
    console.error("[Forgot Password Flow] Error thrown:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to process forgot password request."
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

    const passErr = Validators.validatePasswordComplexity(newPassword, "Password");
    if (passErr) {
      return res.status(400).json({
        success: false,
        message: passErr,
      });
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

    console.log(`[Auth resetPassword] Password successfully reset for user: ${user.email}, role: ${user.role}. Password was modified by reset flow.`);

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
