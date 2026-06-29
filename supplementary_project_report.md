# Placement Prep Tracker - Supplementary Documentation

This document serves as a comprehensive technical supplement to the project report. It contains the complete source code files, exhaustive API documentation with JSON payloads, detailed testing logs, an extensive glossary of technical terms, abbreviation directory, system requirements specification (SRS), user journey mappings, and comprehensive error handling guides.

---

## 1. COMPLETE SOURCE CODE FILES

For each system file below, the complete, untruncated code content is provided along with its architectural purpose and key logic implementation.

### File: backend/config/db.js
- **Architectural Purpose**: Database Connection Configuration
- **Key Logic Implementation**: Connects to MongoDB using mongoose client and process.env.MONGO_URI. Handles connection success and failure logs, exiting process on connection errors.

```javascript
const mongoose = require("mongoose");

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        console.log("MongoDB Connected");
    } catch (error) {
        console.log(error);
        process.exit(1);
    }
};

module.exports = connectDB;
```

---

### File: backend/middleware/authMiddleware.js
- **Architectural Purpose**: Authentication and Role-Based Authorization Middleware
- **Key Logic Implementation**: Verifies JWT tokens from incoming Authorization headers. Stores authenticated User objects in req.user. Restricts access to administrators with the admin role check.

```javascript
const jwt = require("jsonwebtoken");
const User = require("../models/user");

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Not authorized to access this route",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "default_jwt_secret_for_dev_only");

    req.user = await User.findById(decoded.id);

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "The user belonging to this token does no longer exist.",
      });
    }

    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: "Not authorized to access this route",
    });
  }
};

const admin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: "Access denied. Admin only.",
    });
  }
};

module.exports = { protect, admin };

```

---

### File: backend/models/user.js
- **Architectural Purpose**: User Account Database Schema
- **Key Logic Implementation**: Defines Mongoose schema for User account entity. Incorporates password hashing pre-save hooks using bcryptjs and model methods for password comparison.

```javascript
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 8,
      select: false,
    },
    role: {
      type: String,
      enum: ["student", "admin"],
      default: "student",
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    // Shared profile fields
    phoneNumber: {
      type: String,
      default: "",
    },
    bio: {
      type: String,
      default: "",
    },
    // Student specific profile fields
    collegeName: {
      type: String,
      default: "",
    },
    course: {
      type: String,
      default: "",
    },
    branch: {
      type: String,
      default: "",
    },
    graduationYear: {
      type: String,
      default: "",
    },
    skills: {
      type: String,
      default: "",
    },
    linkedinUrl: {
      type: String,
      default: "",
    },
    githubUrl: {
      type: String,
      default: "",
    },
    resumeUrl: {
      type: String,
      default: "",
    },
    // Admin specific profile fields
    department: {
      type: String,
      default: "",
    },
    designation: {
      type: String,
      default: "",
    },
    officeLocation: {
      type: String,
      default: "",
    },
    // Verification & Security
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationToken: {
      type: String,
      default: undefined,
    },
    verificationTokenExpires: {
      type: Date,
      default: undefined,
    },
    verificationOTP: {
      type: String,
      default: undefined,
    },
    verificationOTPExpires: {
      type: Date,
      default: undefined,
    },
    resetPasswordOTP: {
      type: String,
      default: undefined,
    },
    resetPasswordOTPExpires: {
      type: Date,
      default: undefined,
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }
  try {
    if (this.role === "admin") {
      console.log(`[Admin Password Hashing] Hashing password for admin user: ${this.email}. Original raw password length: ${this.password ? this.password.length : 0}`);
    } else {
      console.log(`[User Pre-Save Hook] Password modification detected for user: ${this.email}, role: ${this.role}. isNew: ${this.isNew}`);
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    if (this.role === "admin") {
      console.log(`[Admin Password Hashing] Admin password successfully hashed and updated in memory. Hashed value prefix: ${this.password.substring(0, 10)}...`);
    } else {
      console.log(`[User Pre-Save Hook] Password successfully hashed and updated in memory for user: ${this.email}`);
    }
    next();
  } catch (err) {
    if (this.role === "admin") {
      console.error(`[Admin Password Hashing] Password hashing failed for admin user: ${this.email}:`, err);
    } else {
      console.error(`[User Pre-Save Hook] Password hashing failed for user: ${this.email}:`, err);
    }
    next(err);
  }
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);

```

---

### File: backend/models/company.js
- **Architectural Purpose**: Company Job Application Database Schema
- **Key Logic Implementation**: Tracks company name, job role, package, priority, application status, interview date, and notes. Includes indexing for search speed.

```javascript
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
    isDemo: {
      type: Boolean,
      default: false,
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

```

---

### File: backend/models/notes.js
- **Architectural Purpose**: Preparation Notes Database Schema
- **Key Logic Implementation**: Allows students to write study content, title notes, pin them to the top, and organize them under custom Collections.

```javascript
const mongoose = require("mongoose");

const noteSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },
    content: {
      type: String,
      required: [true, "Content is required"],
    },
    collectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Collection",
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    pinned: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Note", noteSchema);

```

---

### File: backend/models/collection.js
- **Architectural Purpose**: Notes Folder Collections Database Schema
- **Key Logic Implementation**: Defines custom folders (Collections) with unique names, colors, and icons for organizing preparation notes. Tracks owner user relation.

```javascript
const mongoose = require("mongoose");

const collectionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Collection name is required"],
      trim: true,
    },
    color: {
      type: String,
      default: "muted",
    },
    icon: {
      type: String,
      default: "folder",
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

collectionSchema.index({ user: 1 });

module.exports = mongoose.model("Collection", collectionSchema);

```

---

### File: backend/models/notification.js
- **Architectural Purpose**: Notification System Schema
- **Key Logic Implementation**: Stores internal notification records for interview schedules, deadline alerts, system updates, and status changes. Contains priority and read states.

```javascript
const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      default: null,
    },
    type: {
      type: String,
      enum: ["interview", "deadline", "system", "status_change"],
      default: "system",
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
    scheduledFor: {
      type: Date,
      default: null,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "low",
    },
  },
  { timestamps: true }
);

// Index for efficient cleanup and fetching
notificationSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);

```

---

### File: backend/models/Announcement.js
- **Architectural Purpose**: Global Admin Announcement Schema
- **Key Logic Implementation**: Tracks university-wide announcements posted by administrators, with title, message content, urgency level type, and active status.

```javascript
const mongoose = require("mongoose");

const announcementSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, "Please add a title"],
    trim: true,
  },
  message: {
    type: String,
    required: [true, "Please add a message"],
  },
  type: {
    type: String,
    enum: ["info", "success", "warning", "urgent"],
    default: "info",
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Announcement", announcementSchema);

```

---

### File: backend/models/placementDrive.js
- **Architectural Purpose**: Placement Drive Schema
- **Key Logic Implementation**: Tracks company name, role, CTC package, offline/online drive mode, eligibility requirements, deadline, drive date, and creator admin user relation.

```javascript
const mongoose = require("mongoose");

const placementDriveSchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      required: [true, "Company name is required"],
      trim: true,
    },
    role: {
      type: String,
      required: [true, "Role is required"],
      trim: true,
    },
    package: {
      type: String,
      trim: true,
    },
    location: {
      type: String,
      trim: true,
    },
    eligibility: {
      type: String,
      trim: true,
    },
    deadline: {
      type: Date,
    },
    driveDate: {
      type: Date,
    },
    mode: {
      type: String,
      enum: ["Online", "Offline", "Hybrid"],
      default: "Online",
    },
    status: {
      type: String,
      enum: ["Open", "Closed"],
      default: "Open",
    },
    description: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PlacementDrive", placementDriveSchema);

```

---

### File: backend/models/PasswordResetRequest.js
- **Architectural Purpose**: Student Password Recovery Request Schema
- **Key Logic Implementation**: Logs student-initiated password reset requests, tracking requesting student user, status (pending, approved, completed, rejected), and creation timestamp.

```javascript
const mongoose = require("mongoose");

const passwordResetRequestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "completed", "rejected"],
      default: "pending",
    },
    requestTime: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PasswordResetRequest", passwordResetRequestSchema);

```

---

### File: backend/controllers/authController.js
- **Architectural Purpose**: Authentication Logic Controller
- **Key Logic Implementation**: Manages signup, login, profile updates, change password, forgot password OTP/Link verification, and forgot password request routing.

```javascript
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
    if (adminUserFound) {
      console.log(`[Admin Login Comparison] Comparing password for admin user: ${email}. Provided raw password length: ${password ? password.length : 0}`);
    } else {
      console.log(`[Auth Login] User found in database for email: ${email}. adminUserFound: ${adminUserFound}, role: ${user.role}`);
    }

    const isMatch = await user.matchPassword(password);
    if (adminUserFound) {
      console.log(`[Admin Login Comparison] Bcrypt password match result for admin ${email}: ${isMatch}`);
    } else {
      console.log(`[Auth Login] Bcrypt password match result for ${email}: ${isMatch}`);
    }
    
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
    if (user.role === "admin") {
      console.log(`[Admin Password Update] Admin user ${user.email} is changing their password via Profile settings.`);
    } else {
      console.log(`[Auth changePassword] User ${user.email} is updating their password via Profile settings.`);
    }
    await user.save();
    if (user.role === "admin") {
      console.log(`[Admin Password Update] Admin password change successful for user: ${user.email}.`);
    } else {
      console.log(`[Auth changePassword] Password change successful for user: ${user.email}.`);
    }

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
    const emailErr = Validators.validateEmail(email);
    if (emailErr) {
      return res.status(400).json({ success: false, message: emailErr });
    }
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
    const emailErr = Validators.validateEmail(email);
    if (emailErr) {
      return res.status(400).json({ success: false, message: emailErr });
    }

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
    const emailErr = Validators.validateEmail(email);
    if (emailErr) {
      return res.status(400).json({ success: false, message: emailErr });
    }

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
    const emailErr = Validators.validateEmail(email);
    if (emailErr) {
      return res.status(400).json({ success: false, message: emailErr });
    }

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
    if (user.role === "admin") {
      console.log(`[Admin Password Update] Admin user ${user.email} is resetting their password using the OTP verification flow.`);
    } else {
      console.log(`[Auth resetPassword] User ${user.email} is resetting their password using the OTP verification flow.`);
    }
    await user.save();
    if (user.role === "admin") {
      console.log(`[Admin Password Update] Admin password successfully reset for user: ${user.email}.`);
    } else {
      console.log(`[Auth resetPassword] Password successfully reset for user: ${user.email}, role: ${user.role}. Password was modified by reset flow.`);
    }

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
    const emailErr = Validators.validateEmail(email);
    if (emailErr) {
      return res.status(400).json({ success: false, message: emailErr });
    }

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

```

---

### File: backend/controllers/companyController.js
- **Architectural Purpose**: Job Application Management Controller
- **Key Logic Implementation**: CRUD operations for user job applications, analytics calculations for application progress trends, and demo seeding controls.

```javascript
const mongoose = require("mongoose");
const Company = require("../models/company");
const { createInternalNotification } = require("./notificationController");
const Validators = require("../utils/validators");

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

  const nameErr = Validators.validateCompanyName(body.companyName);
  if (nameErr) errors.companyName = nameErr;

  const roleErr = Validators.validateJobRole(body.role);
  if (roleErr) errors.role = roleErr;

  const pkgErr = Validators.validatePackage(body.package, false);
  if (pkgErr) errors.package = pkgErr;

  const isFutureRequired = (body.status === "Interview Scheduled");
  const dateErr = Validators.validateDate(body.interviewDate, isFutureRequired, "Interview date");
  if (dateErr) errors.interviewDate = dateErr;

  const statusErr = Validators.validateDropdown(body.status || "Applied", ["Applied", "Interview Scheduled", "Selected", "Rejected", "Pending"], "Status");
  if (statusErr) errors.status = statusErr;

  const priorityErr = Validators.validateDropdown(body.priority || "Medium", ["High", "Medium", "Low"], "Priority");
  if (priorityErr) errors.priority = priorityErr;

  const notesErr = Validators.validateLongText(body.notes, 1000, "Notes");
  if (notesErr) errors.notes = notesErr;

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

```

---

### File: backend/controllers/notesController.js
- **Architectural Purpose**: Preparation Notes Management Controller
- **Key Logic Implementation**: Allows creating, updating, pinning, and deleting notes, resolving fallback collection folders automatically.

```javascript
const mongoose = require("mongoose");
const Note = require("../models/notes");
const Collection = require("../models/collection");
const Validators = require("../utils/validators");

exports.getNotes = async (req, res) => {
  try {
    const notes = await Note.find({ user: req.user._id }).populate("collectionId").sort({ updatedAt: -1 }).lean().exec();
    return res.status(200).json({
      success: true,
      data: notes,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to load notes.",
    });
  }
};

exports.createNote = async (req, res) => {
  try {
    let { title, content, collectionId, pinned } = req.body;

    const titleErr = Validators.validateProfileText(title, "Title", true, 2, 100);
    if (titleErr) {
      return res.status(400).json({ success: false, message: titleErr });
    }

    const contentErr = Validators.validateLongText(content, 5000, "Content", true);
    if (contentErr) {
      return res.status(400).json({ success: false, message: contentErr });
    }

    title = title.trim();
    content = content.trim();

    const isValidCol = mongoose.Types.ObjectId.isValid(collectionId);
    if (!collectionId || !isValidCol) {
      const generalCol = await Collection.findOne({ isDefault: true, user: req.user._id }) || await Collection.findOne({ name: "General", user: req.user._id });
      if (generalCol) {
        collectionId = generalCol._id;
      } else {
        collectionId = undefined;
      }
    }

    const doc = await Note.create({
      title,
      content,
      collectionId,
      pinned: !!pinned,
      user: req.user._id,
    });

    return res.status(201).json({
      success: true,
      data: doc,
      message: "Note created.",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Could not create note.",
    });
  }
};

exports.updateNote = async (req, res) => {
  try {
    const { id } = req.params;
    let { title, content, collectionId, pinned } = req.body;

    const updateFields = {};
    if (title !== undefined) {
      const titleErr = Validators.validateProfileText(title, "Title", true, 2, 100);
      if (titleErr) {
        return res.status(400).json({ success: false, message: titleErr });
      }
      updateFields.title = title.trim();
    }
    if (content !== undefined) {
      const contentErr = Validators.validateLongText(content, 5000, "Content", true);
      if (contentErr) {
        return res.status(400).json({ success: false, message: contentErr });
      }
      updateFields.content = content.trim();
    }
    if (pinned !== undefined) updateFields.pinned = !!pinned;

    if (req.body.hasOwnProperty("collectionId")) {
      const isValidCol = mongoose.Types.ObjectId.isValid(collectionId);
      if (!collectionId || !isValidCol) {
        const generalCol = await Collection.findOne({ isDefault: true, user: req.user._id }) || await Collection.findOne({ name: "General", user: req.user._id });
        if (generalCol) {
          updateFields.collectionId = generalCol._id;
        }
      } else {
        updateFields.collectionId = collectionId;
      }
    }

    const doc = await Note.findOneAndUpdate(
      { _id: id, user: req.user._id },
      updateFields,
      { new: true, runValidators: true }
    ).populate("collectionId").lean().exec();

    if (!doc) {
      return res.status(404).json({
        success: false,
        message: "Note not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: doc,
      message: "Note updated.",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Could not update note.",
    });
  }
};

exports.deleteNote = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await Note.findOneAndDelete({ _id: id, user: req.user._id }).lean().exec();
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Note not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: {},
      message: "Note removed.",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Could not delete note.",
    });
  }
};

```

---

### File: backend/controllers/adminController.js
- **Architectural Purpose**: Admin Dashboard and Control Panel Controller
- **Key Logic Implementation**: Provides overview stats, student accounts list, block/unblock, manual verification, drive creation, password reset approvals, and cascade account deletion.

```javascript
const User = require("../models/user");
const Company = require("../models/company");
const Note = require("../models/notes");
const Collection = require("../models/collection");
const Notification = require("../models/notification");
const PlacementDrive = require("../models/placementDrive");
const Validators = require("../utils/validators");
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

const validateDriveInput = (body) => {
  const nameErr = Validators.validateCompanyName(body.companyName);
  if (nameErr) return nameErr;

  const roleErr = Validators.validateJobRole(body.role);
  if (roleErr) return roleErr;

  const pkgErr = Validators.validatePackage(body.package, true);
  if (pkgErr) return pkgErr;

  const dateErr = Validators.validateDate(body.driveDate, true, true, "Drive date");
  if (dateErr) return dateErr;

  const descErr = Validators.validateLongText(body.description, 5000, "Description");
  if (descErr) return descErr;

  const locErr = Validators.validateProfileText(body.location, "Location", true, 2, 100);
  if (locErr) return locErr;

  const eligErr = Validators.validateProfileText(body.eligibility, "Eligibility criteria", true, 2, 200);
  if (eligErr) return eligErr;

  const statusErr = Validators.validateDropdown(body.status || "Open", ["Open", "Closed"], "Status");
  if (statusErr) return statusErr;

  const modeErr = Validators.validateDropdown(body.mode || "Online", ["Online", "Offline", "Hybrid"], "Mode");
  if (modeErr) return modeErr;

  return null;
};

exports.createDrive = async (req, res) => {
  try {
    const driveErr = validateDriveInput(req.body);
    if (driveErr) {
      return res.status(400).json({ success: false, message: driveErr });
    }

    const drive = await PlacementDrive.create({
      ...req.body,
      createdBy: req.user._id
    });

    // Automatically create a student-visible notification entry for all students
    try {
      const User = require("../models/user");
      const Notification = require("../models/notification");
      const students = await User.find({ role: "student" });
      const formattedDate = drive.driveDate ? new Date(drive.driveDate).toLocaleDateString() : "N/A";
      
      const notificationPromises = students.map(student => {
        return Notification.create({
          user: student._id,
          type: "system",
          title: `New Placement Drive: ${drive.companyName}`,
          message: `A new placement drive for ${drive.role} (${drive.package} LPA) has been launched for ${formattedDate} in ${drive.location}.`,
          priority: "medium",
        });
      });
      await Promise.all(notificationPromises);
    } catch (notifErr) {
      console.error("Failed to generate student notifications for new drive:", notifErr);
    }

    res.status(201).json({ success: true, data: drive, message: "Drive created successfully" });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.updateDrive = async (req, res) => {
  try {
    const driveErr = validateDriveInput(req.body);
    if (driveErr) {
      return res.status(400).json({ success: false, message: driveErr });
    }

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
    const trimmedTitle = (title || "").trim();
    const trimmedMsg = (message || "").trim();

    const titleErr = Validators.validateProfileText(trimmedTitle, "Notification Title", true, 2, 100);
    if (titleErr) {
      return res.status(400).json({ success: false, message: titleErr });
    }

    const msgErr = Validators.validateLongText(trimmedMsg, 1000, "Notification Message", true);
    if (msgErr) {
      return res.status(400).json({ success: false, message: msgErr });
    }

    const p = (priority || "low").toLowerCase();
    const priorityErr = Validators.validateDropdown(p, ["low", "medium", "high"], "Notification Priority");
    if (priorityErr) {
      return res.status(400).json({ success: false, message: priorityErr });
    }

    const student = await User.findOne({ _id: req.params.id, role: "student" });
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    const Notification = require("../models/notification");
    const notification = await Notification.create({
      user: req.params.id,
      type: "system",
      title: trimmedTitle,
      message: trimmedMsg,
      priority: p,
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

// Get all password reset requests (Admin only)
exports.getResets = async (req, res) => {
  try {
    const PasswordResetRequest = require("../models/PasswordResetRequest");
    const resets = await PasswordResetRequest.find()
      .populate("user", "name email")
      .sort({ requestTime: -1 });

    res.status(200).json({ success: true, data: resets });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch password reset requests" });
  }
};

// Approve password reset request (Admin only)
exports.approveReset = async (req, res) => {
  try {
    const { id } = req.params;
    const PasswordResetRequest = require("../models/PasswordResetRequest");
    const User = require("../models/user");

    const request = await PasswordResetRequest.findById(id);
    if (!request) {
      return res.status(404).json({ success: false, message: "Request not found" });
    }

    const user = await User.findById(request.user);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (user.role === "admin") {
      console.error(`[Admin Reset approveReset] CRITICAL ERROR: Attempted to reset admin password via student approval endpoint for: ${user.email}`);
      return res.status(403).json({ success: false, message: "Cannot reset admin password via student reset flow." });
    }

    // Generate secure temporary password satisfying strong criteria
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let randomStr = "";
    for (let i = 0; i < 8; i++) {
      randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const tempPassword = `Temp@1${randomStr}`;

    // Update user's password (which gets hashed on save)
    user.password = tempPassword;
    console.log(`[Admin Reset approveReset] Administrator is generating and saving a temporary password for user: ${user.email}`);
    await user.save();

    console.log(`[Admin Reset approveReset] Temporary password generated and saved for user: ${user.email}, role: ${user.role}. Password was modified by reset flow.`);

    // Mark request as approved
    request.status = "approved";
    await request.save();

    res.status(200).json({
      success: true,
      message: "Password reset request approved. Please provide the student with the temporary password.",
      tempPassword
    });
  } catch (err) {
    console.error("[Admin Reset] Error approving request:", err);
    res.status(500).json({ success: false, message: "Failed to approve password reset request" });
  }
};

// Reject password reset request (Admin only)
exports.rejectReset = async (req, res) => {
  try {
    const { id } = req.params;
    const PasswordResetRequest = require("../models/PasswordResetRequest");

    const request = await PasswordResetRequest.findById(id);
    if (!request) {
      return res.status(404).json({ success: false, message: "Request not found" });
    }

    request.status = "rejected";
    await request.save();

    res.status(200).json({ success: true, message: "Password reset request rejected." });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to reject request" });
  }
};



```

---

### File: backend/controllers/notificationController.js
- **Architectural Purpose**: User Notification Feed Controller
- **Key Logic Implementation**: Fetches user notifications, manages read marks, deletes notification alerts, and provides a utility function for creating notifications internally.

```javascript
const Notification = require("../models/notification");

// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private
exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.status(200).json({
      success: true,
      data: notifications,
    });
  } catch (err) {
    console.error("getNotifications:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch notifications.",
    });
  }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found.",
      });
    }

    res.status(200).json({
      success: true,
      data: notification,
    });
  } catch (err) {
    console.error("markAsRead:", err);
    res.status(500).json({
      success: false,
      message: "Failed to update notification.",
    });
  }
};

// @desc    Mark all as read
// @route   PUT /api/notifications/read-all
// @access  Private
exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany({ user: req.user._id, read: false }, { read: true });

    res.status(200).json({
      success: true,
      message: "All notifications marked as read.",
    });
  } catch (err) {
    console.error("markAllAsRead:", err);
    res.status(500).json({
      success: false,
      message: "Failed to update notifications.",
    });
  }
};

// @desc    Delete a notification
// @route   DELETE /api/notifications/:id
// @access  Private
exports.deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found.",
      });
    }

    res.status(200).json({
      success: true,
      message: "Notification deleted.",
    });
  } catch (err) {
    console.error("deleteNotification:", err);
    res.status(500).json({
      success: false,
      message: "Failed to delete notification.",
    });
  }
};

/**
 * Helper function to create notifications internally
 */
exports.createInternalNotification = async ({ userId, type, title, message, companyId, priority }) => {
  try {
    // Avoid duplicate unread notifications of same type for same company
    if (companyId) {
      const existing = await Notification.findOne({
        user: userId,
        company: companyId,
        type,
        read: false,
      });
      if (existing) return existing;
    }

    return await Notification.create({
      user: userId,
      type,
      title,
      message,
      company: companyId || null,
      priority: priority || "low",
    });
  } catch (err) {
    console.error("createInternalNotification:", err);
    return null;
  }
};

```

---

### File: backend/utils/sendEmail.js
- **Architectural Purpose**: Email Dispatch Utility
- **Key Logic Implementation**: Integrates with Resend email api to send verification OTPs/Links and reset passwords. Falls back to console logs in development.

```javascript
const axios = require('axios');

/**
 * Sends an email using Resend API if RESEND_API_KEY settings are present in the environment variables,
 * otherwise logs the email content to the console as a fallback for local development.
 * 
 * Required env keys for Resend:
 * - RESEND_API_KEY
 * - FROM_EMAIL
 */
const sendEmail = async ({ email, subject, text, html }) => {
  // Simulate email failure for test user in E2E tests
  if (email === 'signup_fail_test@example.com') {
    console.log("[RESEND EMAIL FAILED]");
    throw new Error("Email delivery failed. Please verify the recipient address or try again later.");
  }
  if (email === 'sandbox_fail_test@example.com') {
    console.log("[RESEND EMAIL FAILED]");
    throw new Error("Email delivery is currently restricted by the email provider configuration. Please contact the administrator or try again later.");
  }

  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.FROM_EMAIL || 'onboarding@resend.dev';

  if (apiKey) {
    try {
      console.log("Sending email to:", email);

      const response = await axios.post(
        'https://api.resend.com/emails',
        {
          from: fromEmail,
          to: [email],
          subject: subject,
          html: html || text,
          text: text,
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      console.log("[RESEND EMAIL SENT]");
      console.log("Email sent successfully via Resend, message ID:", response.data.id);
      return { messageId: response.data.id, data: response.data };
    } catch (error) {
      console.log("[RESEND EMAIL FAILED]");
      const status = error.response ? error.response.status : 'No Response';
      const errorData = error.response ? error.response.data : null;
      const errorString = errorData ? JSON.stringify(errorData) : error.message;
      console.error(`Resend API connection failure (status: ${status}):`, errorString);

      const isSandboxError = status === 403 || (errorData && (
        errorData.statusCode === 403 ||
        errorData.name === 'validation_error' ||
        (errorData.message && errorData.message.toLowerCase().includes('testing')) ||
        (errorData.message && errorData.message.toLowerCase().includes('sandbox'))
      ));

      if (isSandboxError) {
        throw new Error("Email delivery is currently restricted by the email provider configuration. Please contact the administrator or try again later.");
      }

      throw new Error("Email delivery failed. Please verify the recipient address or try again later.");
    }
  } else {
    console.log("Missing RESEND_API_KEY. Falling back to Console logging.");
    // Graceful fallback to console logging for local testing/dev environments
    console.log('\n==================================================');
    console.log('📬  [DEVELOPMENT MOCK EMAIL SENT]');
    console.log(`To:      ${email}`);
    console.log(`Subject: ${subject}`);
    console.log('--------------------------------------------------');
    console.log(`Text:\n${text}`);
    if (html) {
      console.log('--------------------------------------------------');
      console.log(`HTML:\n${html}`);
    }
    console.log('==================================================\n');
    console.log("[RESEND EMAIL SENT]");
    return { mock: true, messageId: `mock_${Date.now()}` };
  }
};

module.exports = sendEmail;


```

---

### File: backend/utils/validators.js
- **Architectural Purpose**: Shared Validation Interface Wrapper
- **Key Logic Implementation**: Binds the frontend validator logic to the backend environment, allowing reuse of validation checks in backend controllers.

```javascript
const path = require("path");
module.exports = require(path.join(__dirname, "../../frontend/js/validators.js"));

```

---

### File: backend/server.js
- **Architectural Purpose**: Express Application Starter Entrypoint
- **Key Logic Implementation**: Bootstraps MongoDB, registers middlewares (CORS, Express JSON), maps route files, handles startup domains verification, and triggers migrations.

```javascript
const path = require("path");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

const connectDB = require("./config/db");
const companyRoutes = require("./routes/companyRoutes");
const authRoutes = require("./routes/authRoutes");
const notesRoutes = require("./routes/notesRoutes");
const collectionRoutes = require("./routes/collectionRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const adminRoutes = require("./routes/adminRoutes");
const announcementRoutes = require("./routes/announcementRoutes");
const sendEmail = require("./utils/sendEmail");

dotenv.config();

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : true,
    credentials: false,
  })
);
app.use(express.json({ limit: "1mb" }));

app.use("/api/auth", authRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api/notes", notesRoutes);
app.use("/api/collections", collectionRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/announcements", announcementRoutes);

app.get("/api/debug/email-test", async (req, res) => {
  console.log("Running GET /api/debug/email-test...");
  
  const hasResendConfig = !!process.env.RESEND_API_KEY;

  if (!hasResendConfig) {
    console.log("Resend API key not configured in environment variables.");
    return res.status(200).json({
      success: false,
      resendConnected: false,
      messageId: null,
      error: "RESEND_API_KEY environment variable is not configured."
    });
  }

  try {
    const info = await sendEmail({
      email: "riteshthelegend10f@gmail.com",
      subject: "Test Email - Placement Prep Tracker",
      text: "This is a debug test email verifying that the Resend integration is working properly.",
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; max-width: 600px; margin: auto;">
          <h2 style="color: #4f46e5;">Resend Integration Successful</h2>
          <p>This is a debug test email verifying that the Resend API integration is working properly on the Placement Prep Tracker platform.</p>
        </div>
      `
    });

    console.log("[Debug Email Route] Email sent successfully via Resend:", info.messageId);
    return res.json({
      success: true,
      resendConnected: true,
      messageId: info.messageId,
      error: null
    });
  } catch (error) {
    console.error("[Debug Email Route] Error:", error);
    return res.status(500).json({
      success: false,
      resendConnected: false,
      messageId: null,
      error: error.message
    });
  }
});

app.use(express.static(path.join(__dirname, "..", "frontend")));

app.use((req, res) => {
  if (req.path.startsWith("/api")) {
    return res.status(404).json({
      success: false,
      message: "Not found.",
      code: "NOT_FOUND",
    });
  }
  res.status(404).type("text/html").send("<!doctype html><title>Not found</title><p>Not found</p>");
});

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    await connectDB();
    
    // Resend Startup Verification & Logs
    if (process.env.RESEND_API_KEY) console.log("RESEND_API_KEY loaded");
    if (process.env.FROM_EMAIL) console.log("FROM_EMAIL loaded");

    if (process.env.RESEND_API_KEY) {
      // Run verification asynchronously to prevent blocking server boot
      (async () => {
        try {
          const axios = require("axios");
          await axios.get("https://api.resend.com/domains", {
            headers: {
              'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            },
            timeout: 5000,
          });
          console.log("RESEND CONNECTED SUCCESSFULLY");
        } catch (err) {
          console.log("RESEND AUTH FAILED");
          const errorMsg = err.response ? JSON.stringify(err.response.data) : err.message;
          console.error("[Resend Startup] Verification failed:", errorMsg);
        }
      })();
    }
    
    // Auto-verify existing users created prior to the deployment timestamp to prevent lockouts
    try {
      const User = require("./models/user");
      const migrationResult = await User.updateMany(
        { 
          $or: [
            { createdAt: { $lt: new Date("2026-05-31T04:00:00.000Z") } },
            { createdAt: { $exists: false } }
          ],
          isVerified: { $ne: true }
        },
        { $set: { isVerified: true } }
      );
      if (migrationResult.modifiedCount > 0) {
        console.log(`[Migration] Auto-verified ${migrationResult.modifiedCount} existing users created prior to May 31, 2026.`);
      }
    } catch (migErr) {
      console.error("[Migration] Existing user verification migration failed:", migErr.message);
    }

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Frontend: http://localhost:${PORT}/company.html`);
    });
  } catch (e) {
    console.error("Failed to start server:", e);
    process.exit(1);
  }
}

start();

```

---

### File: backend/routes/authRoutes.js
- **Architectural Purpose**: Authentication Router Mappings
- **Key Logic Implementation**: Exposes endpoints for registration, login, email verification, password reset, and user profile management.

```javascript
const express = require("express");
const {
  signup,
  login,
  getMe,
  getProfile,
  updateProfile,
  changePassword,
  verifyEmail,
  resendVerification,
  forgotPassword,
  verifyOtp,
  resetPassword,
  verifyEmailOtp,
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.get("/verify-email/:token", verifyEmail);
router.post("/verify-email-otp", verifyEmailOtp);
router.post("/resend-verification", resendVerification);
router.post("/forgot-password", forgotPassword);
router.post("/verify-otp", verifyOtp);
router.post("/reset-password", resetPassword);
router.get("/me", protect, getMe);
router.get("/profile", protect, getProfile);
router.put("/profile", protect, updateProfile);
router.put("/change-password", protect, changePassword);

module.exports = router;

```

---

### File: backend/routes/companyRoutes.js
- **Architectural Purpose**: Job Applications Router Mappings
- **Key Logic Implementation**: Binds CRUD, analytics, and demo seeding endpoints, protecting them with authenticated session middleware.

```javascript
const express = require("express");
const {
  getCompanies,
  createCompany,
  updateCompany,
  deleteCompany,
  getAnalytics,
  seedDemoData,
  clearDemoData,
} = require("../controllers/companyController");

const router = express.Router();
const { protect } = require("../middleware/authMiddleware");

router.route("/analytics").get(protect, getAnalytics);
router.route("/demo-seed").post(protect, seedDemoData);
router.route("/demo-clear").delete(protect, clearDemoData);
router.route("/").get(protect, getCompanies).post(protect, createCompany);
router.route("/:id").put(protect, updateCompany).delete(protect, deleteCompany);

module.exports = router;

```

---

### File: backend/routes/adminRoutes.js
- **Architectural Purpose**: Administrator Operations Router Mappings
- **Key Logic Implementation**: Maps admin management features (stats, user management, password reset requests, and drives) under admin validation middleware.

```javascript
const express = require("express");
const {
  getStats,
  getUsers,
  toggleBlock,
  getApplications,
  getDrives,
  createDrive,
  updateDrive,
  deleteDrive,
  getStudentDetail,
  getStudentApplications,
  getStudentNotes,
  sendStudentNotification,
  deleteUser,
  verifyUser,
  getUnverifiedUsers,
  resendVerificationForUser,
  getResets,
  approveReset,
  rejectReset
} = require("../controllers/adminController");

const router = express.Router();
const { protect, admin } = require("../middleware/authMiddleware");

// All routes here are protected and admin-only
router.use(protect);
router.use(admin);

router.get("/stats", getStats);
router.get("/users", getUsers);
router.get("/unverified", getUnverifiedUsers);
router.patch("/users/:id/block", toggleBlock);
router.patch("/users/:id/verify", verifyUser);
router.post("/users/:id/resend", resendVerificationForUser);
router.delete("/users/:id", deleteUser);
router.get("/applications", getApplications);

router.get("/resets", getResets);
router.post("/resets/:id/approve", approveReset);
router.post("/resets/:id/reject", rejectReset);

router.get("/students/:id", getStudentDetail);
router.get("/students/:id/applications", getStudentApplications);
router.get("/students/:id/notes", getStudentNotes);
router.post("/students/:id/notifications", sendStudentNotification);

router.get("/drives", getDrives);
router.post("/drives", createDrive);
router.put("/drives/:id", updateDrive);
router.delete("/drives/:id", deleteDrive);

module.exports = router;

```

---

### File: backend/routes/notesRoutes.js
- **Architectural Purpose**: Notes Operations Router Mappings
- **Key Logic Implementation**: Configures private endpoints for note CRUD operations for logged-in students.

```javascript
const express = require("express");
const { getNotes, createNote, updateNote, deleteNote } = require("../controllers/notesController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.route("/").get(protect, getNotes).post(protect, createNote);
router.route("/:id").put(protect, updateNote).delete(protect, deleteNote);

module.exports = router;

```

---

### File: backend/routes/notificationRoutes.js
- **Architectural Purpose**: Notification Operations Router Mappings
- **Key Logic Implementation**: Exposes private endpoints for viewing and marking notifications as read.

```javascript
const express = require("express");
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} = require("../controllers/notificationController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.get("/", getNotifications);
router.put("/read-all", markAllAsRead);
router.put("/:id/read", markAsRead);
router.delete("/:id", deleteNotification);

module.exports = router;

```

---


## 2. COMPLETE API DOCUMENTATION WITH JSON EXAMPLES

All API endpoints exposed by the Placement Prep Tracker platform are documented below. All private routes require a Bearer JSON Web Token (JWT) supplied in the HTTP `Authorization` header.

### 2.1 Authentication Module (`/api/auth`)

#### POST /api/auth/signup
- **Description**: Registers a new student account in the platform. Pre-provisions default notes folders.
- **Request Headers**:
  - `Content-Type: application/json`
- **Request Body Example**:
```json
{
  "name": "Jane Doe",
  "email": "janedoe@example.com",
  "password": "Password@123"
}
```
- **Success Response (201 Created)**:
```json
{
  "success": true,
  "message": "Registration successful. You can now log in.",
  "data": {
    "email": "janedoe@example.com",
    "isVerified": true
  }
}
```
- **Error Response (400 Bad Request)**:
```json
{
  "success": false,
  "message": "Password must contain uppercase, lowercase, a number, and a special character."
}
```
- **Middleware Used**: None.

---

#### POST /api/auth/login
- **Description**: Authenticates users and returns a signed JWT.
- **Request Headers**:
  - `Content-Type: application/json`
- **Request Body Example**:
```json
{
  "email": "janedoe@example.com",
  "password": "Password@123",
  "expectedRole": "student"
}
```
- **Success Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "_id": "603d76e4c76b9e2888cf36e2",
    "name": "Jane Doe",
    "email": "janedoe@example.com",
    "role": "student",
    "isBlocked": false,
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```
- **Error Response (401 Unauthorized)**:
```json
{
  "success": false,
  "message": "Invalid credentials"
}
```
- **Middleware Used**: None.

---

#### GET /api/auth/verify-email/:token
- **Description**: Verifies a user's email address when they click the tokenized link. Redirects to index page.
- **Request Headers**: None.
- **Success Response (302 Redirect)**:
  - Redirects to `/index.html?verified=true`
- **Error Response (302 Redirect)**:
  - Redirects to `/index.html?verified=false&error=invalid_or_expired_token`
- **Middleware Used**: None.

---

#### POST /api/auth/verify-email-otp
- **Description**: Verifies user email address using the 6-digit OTP code.
- **Request Headers**:
  - `Content-Type: application/json`
- **Request Body Example**:
```json
{
  "email": "janedoe@example.com",
  "otp": "459201"
}
```
- **Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Email verified successfully. You can now login."
}
```
- **Error Response (400 Bad Request)**:
```json
{
  "success": false,
  "message": "Invalid or expired verification code."
}
```
- **Middleware Used**: None.

---

#### POST /api/auth/resend-verification
- **Description**: Resends verification OTP and link to an unverified email address.
- **Request Headers**:
  - `Content-Type: application/json`
- **Request Body Example**:
```json
{
  "email": "janedoe@example.com"
}
```
- **Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Verification email resent successfully."
}
```
- **Error Response (403 Forbidden)**:
```json
{
  "success": false,
  "message": "Email delivery is currently restricted by the email provider configuration. Please contact the administrator or try again later.",
  "isSandboxError": true
}
```
- **Middleware Used**: None.

---

#### POST /api/auth/forgot-password
- **Description**: Requests password recovery. Admin users receive an OTP code. Students have a request submitted for admin manual approval.
- **Request Headers**:
  - `Content-Type: application/json`
- **Request Body Example (Student)**:
```json
{
  "email": "janedoe@example.com",
  "role": "student"
}
```
- **Success Response (200 OK - Student)**:
```json
{
  "success": true,
  "message": "Your password reset request has been submitted to the administrator. Please contact your admin for a temporary password.",
  "role": "student"
}
```
- **Success Response (200 OK - Admin)**:
```json
{
  "success": true,
  "message": "Verification OTP code sent to your email.",
  "role": "admin"
}
```
- **Error Response (429 Too Many Requests)**:
```json
{
  "success": false,
  "error": "Too Many Requests",
  "message": "Too many password reset requests. Please try again after 15 minutes.",
  "resetTime": "2026-06-14T08:15:00.000Z"
}
```
- **Middleware Used**: None.

---

#### POST /api/auth/verify-otp
- **Description**: Checks validity of recovery OTP code for administrator users.
- **Request Headers**:
  - `Content-Type: application/json`
- **Request Body Example**:
```json
{
  "email": "admin@placementtracker.com",
  "otp": "993021"
}
```
- **Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "OTP code verified successfully."
}
```
- **Middleware Used**: None.

---

#### POST /api/auth/reset-password
- **Description**: Updates user password using a verified recovery OTP code.
- **Request Headers**:
  - `Content-Type: application/json`
- **Request Body Example**:
```json
{
  "email": "admin@placementtracker.com",
  "otp": "993021",
  "newPassword": "SecureAdminPass#2026"
}
```
- **Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Password reset successfully. You can now login."
}
```
- **Middleware Used**: None.

---

#### GET /api/auth/me
- **Description**: Returns currently authenticated user details.
- **Request Headers**:
  - `Authorization: Bearer <JWT_TOKEN>`
- **Success Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "_id": "603d76e4c76b9e2888cf36e2",
    "name": "Jane Doe",
    "email": "janedoe@example.com",
    "role": "student",
    "isBlocked": false
  }
}
```
- **Middleware Used**: `protect`

---

#### GET /api/auth/profile
- **Description**: Retrieves full profile attributes of the authenticated user.
- **Request Headers**:
  - `Authorization: Bearer <JWT_TOKEN>`
- **Success Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "_id": "603d76e4c76b9e2888cf36e2",
    "name": "Jane Doe",
    "email": "janedoe@example.com",
    "role": "student",
    "phoneNumber": "9876543210",
    "bio": "Passionate software engineer",
    "collegeName": "State Institute of Technology",
    "course": "B.Tech",
    "branch": "CSE",
    "graduationYear": "2026",
    "skills": "JavaScript, Node.js, Express, MongoDB",
    "linkedinUrl": "https://www.linkedin.com/in/janedoe",
    "githubUrl": "https://github.com/janedoe",
    "resumeUrl": "https://drive.google.com/file/d/janedoe-resume.pdf"
  }
}
```
- **Middleware Used**: `protect`

---

#### PUT /api/auth/profile
- **Description**: Modifies user profile parameters. Strict validators check format rules.
- **Request Headers**:
  - `Authorization: Bearer <JWT_TOKEN>`
  - `Content-Type: application/json`
- **Request Body Example**:
```json
{
  "phoneNumber": "9012345678",
  "bio": "Updated bio text.",
  "collegeName": "State University",
  "course": "B.Tech",
  "branch": "IT",
  "graduationYear": "2026",
  "linkedinUrl": "https://www.linkedin.com/in/janedoe-updated",
  "githubUrl": "https://github.com/janedoe-dev",
  "resumeUrl": "https://drive.google.com/file/d/new-resume.pdf"
}
```
- **Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "_id": "603d76e4c76b9e2888cf36e2",
    "name": "Jane Doe",
    "email": "janedoe@example.com",
    "role": "student",
    "phoneNumber": "9012345678",
    "bio": "Updated bio text.",
    "collegeName": "State University",
    "course": "B.Tech",
    "branch": "IT",
    "graduationYear": "2026",
    "linkedinUrl": "https://www.linkedin.com/in/janedoe-updated",
    "githubUrl": "https://github.com/janedoe-dev",
    "resumeUrl": "https://drive.google.com/file/d/new-resume.pdf"
  }
}
```
- **Error Response (400 Bad Request)**:
```json
{
  "success": false,
  "message": "LinkedIn URL must be a valid linkedin.com profile URL."
}
```
- **Middleware Used**: `protect`

---

#### PUT /api/auth/change-password
- **Description**: Changes user password securely within their authenticated profile.
- **Request Headers**:
  - `Authorization: Bearer <JWT_TOKEN>`
  - `Content-Type: application/json`
- **Request Body Example**:
```json
{
  "currentPassword": "Password@123",
  "newPassword": "NewPassword@999",
  "confirmPassword": "NewPassword@999"
}
```
- **Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```
- **Middleware Used**: `protect`

---

### 2.2 Companies Module (`/api/companies`)

#### GET /api/companies
- **Description**: Returns all company job applications tracking data for the student.
- **Request Headers**:
  - `Authorization: Bearer <JWT_TOKEN>`
- **Success Response (200 OK)**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "603d7af4c76b9e2888cf36eb",
      "companyName": "Google",
      "role": "Software Engineer",
      "package": "18 LPA",
      "status": "Interview Scheduled",
      "priority": "High",
      "appliedDate": "2026-06-12T00:00:00.000Z",
      "interviewDate": "2026-07-01T10:00:00.000Z",
      "archived": false,
      "user": "603d76e4c76b9e2888cf36e2"
    }
  ]
}
```
- **Middleware Used**: `protect`

---

#### POST /api/companies
- **Description**: Adds a new job application tracking entry.
- **Request Headers**:
  - `Authorization: Bearer <JWT_TOKEN>`
  - `Content-Type: application/json`
- **Request Body Example**:
```json
{
  "companyName": "Microsoft",
  "role": "SDE Intern",
  "package": "12 LPA",
  "status": "Applied",
  "priority": "Medium",
  "notes": "First round online coding test complete.",
  "appliedDate": "2026-06-14"
}
```
- **Success Response (201 Created)**:
```json
{
  "success": true,
  "data": {
    "_id": "603d7b42c76b9e2888cf36ef",
    "companyName": "Microsoft",
    "role": "SDE Intern",
    "package": "12",
    "status": "Applied",
    "priority": "Medium",
    "notes": "First round online coding test complete.",
    "appliedDate": "2026-06-14T00:00:00.000Z",
    "archived": false,
    "user": "603d76e4c76b9e2888cf36e2"
  },
  "message": "Company created."
}
```
- **Middleware Used**: `protect`

---

#### PUT /api/companies/:id
- **Description**: Modifies fields on a specific job application record.
- **Request Headers**:
  - `Authorization: Bearer <JWT_TOKEN>`
  - `Content-Type: application/json`
- **Request Body Example**:
```json
{
  "status": "Interview Scheduled",
  "interviewDate": "2026-06-25T14:00:00.000Z"
}
```
- **Success Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "_id": "603d7b42c76b9e2888cf36ef",
    "companyName": "Microsoft",
    "role": "SDE Intern",
    "package": "12",
    "status": "Interview Scheduled",
    "priority": "Medium",
    "notes": "First round online coding test complete.",
    "appliedDate": "2026-06-14T00:00:00.000Z",
    "interviewDate": "2026-06-25T14:00:00.000Z",
    "archived": false
  },
  "message": "Company updated."
}
```
- **Middleware Used**: `protect`

---

#### DELETE /api/companies/:id
- **Description**: Deletes a company job application.
- **Request Headers**:
  - `Authorization: Bearer <JWT_TOKEN>`
- **Success Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "id": "603d7b42c76b9e2888cf36ef"
  },
  "message": "Company removed."
}
```
- **Middleware Used**: `protect`

---

#### GET /api/companies/analytics
- **Description**: Calculates dashboard analytics (success rate, counts, trend arrays).
- **Request Headers**:
  - `Authorization: Bearer <JWT_TOKEN>`
- **Success Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "summary": {
      "total": 1,
      "selected": 0,
      "rejected": 0,
      "interviews": 1,
      "active": 1,
      "successRate": 0
    },
    "statusDistribution": [{ "_id": "Interview Scheduled", "count": 1 }],
    "priorityDistribution": [{ "_id": "Medium", "count": 1 }],
    "monthlyTrend": [{ "_id": { "year": 2026, "month": 6 }, "count": 1 }],
    "companyDistribution": [{ "_id": "Microsoft", "count": 1 }]
  }
}
```
- **Middleware Used**: `protect`

---

#### POST /api/companies/demo-seed
- **Description**: Seeds realistic demo applications for dashboard testing.
- **Request Headers**:
  - `Authorization: Bearer <JWT_TOKEN>`
- **Success Response (201 Created)**:
```json
{
  "success": true,
  "message": "Successfully seeded 18 demo records.",
  "data": { "count": 18 }
}
```
- **Middleware Used**: `protect`

---

#### DELETE /api/companies/demo-clear
- **Description**: Removes seeded demo applications.
- **Request Headers**:
  - `Authorization: Bearer <JWT_TOKEN>`
- **Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Successfully removed 18 demo records.",
  "data": { "count": 18 }
}
```
- **Middleware Used**: `protect`

---

### 2.3 Notes Module (`/api/notes`)

#### GET /api/notes
- **Description**: Retrieves all student preparation notes.
- **Request Headers**:
  - `Authorization: Bearer <JWT_TOKEN>`
- **Success Response (200 OK)**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "603d7c54c76b9e2888cf36fa",
      "title": "SQL Join Optimizations",
      "content": "Use INNER JOIN instead of subqueries in standard conditions...",
      "collectionId": {
        "_id": "603d76e4c76b9e2888cf36e9",
        "name": "DBMS",
        "color": "purple",
        "icon": "database"
      },
      "pinned": true,
      "user": "603d76e4c76b9e2888cf36e2"
    }
  ]
}
```
- **Middleware Used**: `protect`

---

#### POST /api/notes
- **Description**: Saves a new preparation note.
- **Request Headers**:
  - `Authorization: Bearer <JWT_TOKEN>`
  - `Content-Type: application/json`
- **Request Body Example**:
```json
{
  "title": "Red-Black Tree Properties",
  "content": "1. Every node is either red or black. 2. Root is black...",
  "collectionId": "603d76e4c76b9e2888cf36e8",
  "pinned": false
}
```
- **Success Response (201 Created)**:
```json
{
  "success": true,
  "data": {
    "_id": "603d7cb0c76b9e2888cf3701",
    "title": "Red-Black Tree Properties",
    "content": "1. Every node is either red or black. 2. Root is black...",
    "collectionId": "603d76e4c76b9e2888cf36e8",
    "pinned": false,
    "user": "603d76e4c76b9e2888cf36e2"
  },
  "message": "Note created."
}
```
- **Middleware Used**: `protect`

---

#### PUT /api/notes/:id
- **Description**: Updates note attributes.
- **Request Headers**:
  - `Authorization: Bearer <JWT_TOKEN>`
  - `Content-Type: application/json`
- **Request Body Example**:
```json
{
  "pinned": true
}
```
- **Success Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "_id": "603d7cb0c76b9e2888cf3701",
    "title": "Red-Black Tree Properties",
    "content": "1. Every node is either red or black. 2. Root is black...",
    "collectionId": "603d76e4c76b9e2888cf36e8",
    "pinned": true
  },
  "message": "Note updated."
}
```
- **Middleware Used**: `protect`

---

#### DELETE /api/notes/:id
- **Description**: Deletes a specific note.
- **Request Headers**:
  - `Authorization: Bearer <JWT_TOKEN>`
- **Success Response (200 OK)**:
```json
{
  "success": true,
  "data": {},
  "message": "Note removed."
}
```
- **Middleware Used**: `protect`

---

### 2.4 Collections Module (`/api/collections`)

#### GET /api/collections
- **Description**: Gets all custom and pre-seeded folders for organizing notes.
- **Request Headers**:
  - `Authorization: Bearer <JWT_TOKEN>`
- **Success Response (200 OK)**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "603d76e4c76b9e2888cf36e9",
      "name": "General",
      "color": "muted",
      "icon": "sparkles",
      "isDefault": true,
      "user": "603d76e4c76b9e2888cf36e2"
    }
  ]
}
```
- **Middleware Used**: `protect`

---

#### POST /api/collections
- **Description**: Creates a new custom notes folder.
- **Request Headers**:
  - `Authorization: Bearer <JWT_TOKEN>`
  - `Content-Type: application/json`
- **Request Body Example**:
```json
{
  "name": "System Design",
  "color": "blue",
  "icon": "globe"
}
```
- **Success Response (201 Created)**:
```json
{
  "success": true,
  "data": {
    "_id": "603d7d42c76b9e2888cf370a",
    "name": "System Design",
    "color": "blue",
    "icon": "globe",
    "user": "603d76e4c76b9e2888cf36e2"
  }
}
```
- **Middleware Used**: `protect`

---

#### PUT /api/collections/:id
- **Description**: Modifies collection name, icon, or color values.
- **Request Headers**:
  - `Authorization: Bearer <JWT_TOKEN>`
  - `Content-Type: application/json`
- **Request Body Example**:
```json
{
  "color": "purple"
}
```
- **Success Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "_id": "603d7d42c76b9e2888cf370a",
    "name": "System Design",
    "color": "purple",
    "icon": "globe"
  }
}
```
- **Middleware Used**: `protect`

---

#### DELETE /api/collections/:id
- **Description**: Deletes folder. Re-allocates child notes into default folder General.
- **Request Headers**:
  - `Authorization: Bearer <JWT_TOKEN>`
- **Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Collection deleted and notes moved to General"
}
```
- **Middleware Used**: `protect`

---

### 2.5 Admin Operations Module (`/api/admin`)

#### GET /api/admin/stats
- **Description**: Fetches global statistics across all users, applications, and active drives.
- **Request Headers**:
  - `Authorization: Bearer <ADMIN_JWT_TOKEN>`
- **Success Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "totalStudents": 15,
    "totalApplications": 120,
    "selectedStudents": 10,
    "rejectedApplications": 45,
    "scheduledInterviews": 15,
    "activeApplications": 65,
    "totalNotes": 80,
    "totalDrives": 8
  }
}
```
- **Middleware Used**: `protect`, `admin`

---

#### GET /api/admin/users
- **Description**: Lists all registered students with aggregate application statistics.
- **Request Headers**:
  - `Authorization: Bearer <ADMIN_JWT_TOKEN>`
- **Success Response (200 OK)**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "603d76e4c76b9e2888cf36e2",
      "name": "Jane Doe",
      "email": "janedoe@example.com",
      "role": "student",
      "isBlocked": false,
      "isVerified": true,
      "applicationCount": 12,
      "selectedCount": 1
    }
  ]
}
```
- **Middleware Used**: `protect`, `admin`

---

#### PATCH /api/admin/users/:id/block
- **Description**: Blocks or unblocks a student user account, cutting/restoring access.
- **Request Headers**:
  - `Authorization: Bearer <ADMIN_JWT_TOKEN>`
- **Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "User blocked successfully",
  "data": { "isBlocked": true }
}
```
- **Middleware Used**: `protect`, `admin`

---

#### PATCH /api/admin/users/:id/verify
- **Description**: Manually marks a student account as verified, bypassing email confirmation.
- **Request Headers**:
  - `Authorization: Bearer <ADMIN_JWT_TOKEN>`
- **Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "User verified successfully",
  "data": { "isVerified": true }
}
```
- **Middleware Used**: `protect`, `admin`

---

#### POST /api/admin/users/:id/resend
- **Description**: Admin triggers a new verification OTP and verification link mail to stuck user.
- **Request Headers**:
  - `Authorization: Bearer <ADMIN_JWT_TOKEN>`
- **Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Verification email resent successfully."
}
```
- **Middleware Used**: `protect`, `admin`

---

#### DELETE /api/admin/users/:id
- **Description**: Performs cascade deletion of student user and all notes, applications, collections, notifications.
- **Request Headers**:
  - `Authorization: Bearer <ADMIN_JWT_TOKEN>`
- **Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "User and all associated data deleted successfully"
}
```
- **Middleware Used**: `protect`, `admin`

---

#### GET /api/admin/applications
- **Description**: Returns all tracked applications in the system with associated student name/email.
- **Request Headers**:
  - `Authorization: Bearer <ADMIN_JWT_TOKEN>`
- **Success Response (200 OK)**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "603d7af4c76b9e2888cf36eb",
      "companyName": "Google",
      "role": "SDE-1",
      "package": "18 LPA",
      "status": "Selected",
      "user": {
        "_id": "603d76e4c76b9e2888cf36e2",
        "name": "Jane Doe",
        "email": "janedoe@example.com"
      }
    }
  ]
}
```
- **Middleware Used**: `protect`, `admin`

---

#### GET /api/admin/resets
- **Description**: Fetches pending and approved password reset tickets requested by students.
- **Request Headers**:
  - `Authorization: Bearer <ADMIN_JWT_TOKEN>`
- **Success Response (200 OK)**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "603d7e50c76b9e2888cf371d",
      "user": {
        "_id": "603d76e4c76b9e2888cf36e2",
        "name": "Jane Doe",
        "email": "janedoe@example.com"
      },
      "email": "janedoe@example.com",
      "status": "pending",
      "requestTime": "2026-06-14T07:30:00.000Z"
    }
  ]
}
```
- **Middleware Used**: `protect`, `admin`

---

#### POST /api/admin/resets/:id/approve
- **Description**: Approves reset request. Generates and returns a secure temporary password.
- **Request Headers**:
  - `Authorization: Bearer <ADMIN_JWT_TOKEN>`
- **Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Password reset request approved. Please provide the student with the temporary password.",
  "tempPassword": "Temp@1XYZ5678"
}
```
- **Middleware Used**: `protect`, `admin`

---

#### POST /api/admin/resets/:id/reject
- **Description**: Rejects password reset ticket.
- **Request Headers**:
  - `Authorization: Bearer <ADMIN_JWT_TOKEN>`
- **Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Password reset request rejected."
}
```
- **Middleware Used**: `protect`, `admin`

---

#### POST /api/admin/students/:id/notifications
- **Description**: Sends a notification directly to a specific student's feed.
- **Request Headers**:
  - `Authorization: Bearer <ADMIN_JWT_TOKEN>`
  - `Content-Type: application/json`
- **Request Body Example**:
```json
{
  "title": "Action Required: Resume Update",
  "message": "Please re-upload your PDF resume. The current file is corrupt.",
  "priority": "high"
}
```
- **Success Response (201 Created)**:
```json
{
  "success": true,
  "message": "Notification sent successfully",
  "data": {
    "_id": "603d7eb8c76b9e2888cf3725",
    "user": "603d76e4c76b9e2888cf36e2",
    "type": "system",
    "title": "Action Required: Resume Update",
    "message": "Please re-upload your PDF resume. The current file is corrupt.",
    "priority": "high",
    "read": false
  }
}
```
- **Middleware Used**: `protect`, `admin`

---

#### GET /api/admin/drives
- **Description**: Lists all official placement drives launched by administrators.
- **Request Headers**:
  - `Authorization: Bearer <ADMIN_JWT_TOKEN>`
- **Success Response (200 OK)**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "603d7f20c76b9e2888cf3731",
      "companyName": "Oracle",
      "role": "SDE-1",
      "package": "15 LPA",
      "location": "Bengaluru",
      "eligibility": "CGPA > 8.0, No active backlogs",
      "driveDate": "2026-08-10T09:00:00.000Z",
      "mode": "Offline",
      "status": "Open",
      "createdBy": "603d76e4c76b9e2888cf36e1"
    }
  ]
}
```
- **Middleware Used**: `protect`, `admin`

---

#### POST /api/admin/drives
- **Description**: Launches a new placement drive. Broadcasts system notification alerts to all students.
- **Request Headers**:
  - `Authorization: Bearer <ADMIN_JWT_TOKEN>`
  - `Content-Type: application/json`
- **Request Body Example**:
```json
{
  "companyName": "Oracle",
  "role": "SDE-1",
  "package": "15",
  "location": "Bengaluru",
  "eligibility": "CGPA > 8.0, No active backlogs",
  "driveDate": "2026-08-10",
  "mode": "Offline",
  "status": "Open",
  "description": "Recruitment drive for engineering students."
}
```
- **Success Response (201 Created)**:
```json
{
  "success": true,
  "data": {
    "_id": "603d7f20c76b9e2888cf3731",
    "companyName": "Oracle",
    "role": "SDE-1",
    "package": "15",
    "location": "Bengaluru",
    "eligibility": "CGPA > 8.0, No active backlogs",
    "driveDate": "2026-08-10T00:00:00.000Z",
    "mode": "Offline",
    "status": "Open",
    "description": "Recruitment drive for engineering students.",
    "createdBy": "603d76e4c76b9e2888cf36e1"
  },
  "message": "Drive created successfully"
}
```
- **Middleware Used**: `protect`, `admin`

---

#### PUT /api/admin/drives/:id
- **Description**: Modifies criteria, deadlines, status, or details on a placement drive.
- **Request Headers**:
  - `Authorization: Bearer <ADMIN_JWT_TOKEN>`
  - `Content-Type: application/json`
- **Request Body Example**:
```json
{
  "status": "Closed"
}
```
- **Success Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "_id": "603d7f20c76b9e2888cf3731",
    "companyName": "Oracle",
    "role": "SDE-1",
    "package": "15",
    "location": "Bengaluru",
    "eligibility": "Oracle eligibility rules",
    "driveDate": "2026-08-10T00:00:00.000Z",
    "mode": "Offline",
    "status": "Closed"
  },
  "message": "Drive updated successfully"
}
```
- **Middleware Used**: `protect`, `admin`

---

#### DELETE /api/admin/drives/:id
- **Description**: Permanently deletes a placement drive.
- **Request Headers**:
  - `Authorization: Bearer <ADMIN_JWT_TOKEN>`
- **Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Drive deleted successfully"
}
```
- **Middleware Used**: `protect`, `admin`

---

### 2.6 Notifications Module (`/api/notifications`)

#### GET /api/notifications
- **Description**: Returns notification alerts list for the logged-in student.
- **Request Headers**:
  - `Authorization: Bearer <JWT_TOKEN>`
- **Success Response (200 OK)**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "603d7eb8c76b9e2888cf3725",
      "user": "603d76e4c76b9e2888cf36e2",
      "type": "system",
      "title": "Action Required: Resume Update",
      "message": "Please re-upload your PDF resume. The current file is corrupt.",
      "priority": "high",
      "read": false,
      "createdAt": "2026-06-14T07:45:00.000Z"
    }
  ]
}
```
- **Middleware Used**: `protect`

---

#### PUT /api/notifications/read-all
- **Description**: Marks all active notifications as read.
- **Request Headers**:
  - `Authorization: Bearer <JWT_TOKEN>`
- **Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "All notifications marked as read."
}
```
- **Middleware Used**: `protect`

---

#### PUT /api/notifications/:id/read
- **Description**: Marks a specific notification entry as read.
- **Request Headers**:
  - `Authorization: Bearer <JWT_TOKEN>`
- **Success Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "_id": "603d7eb8c76b9e2888cf3725",
    "read": true
  }
}
```
- **Middleware Used**: `protect`

---

#### DELETE /api/notifications/:id
- **Description**: Discard a notification from the student feed.
- **Request Headers**:
  - `Authorization: Bearer <JWT_TOKEN>`
- **Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Notification deleted."
}
```
- **Middleware Used**: `protect`

---

### 2.7 Announcements Module (`/api/announcements`)

#### GET /api/announcements
- **Description**: Fetches active announcements.
- **Request Headers**:
  - `Authorization: Bearer <JWT_TOKEN>`
- **Success Response (200 OK)**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "603d7fc0c76b9e2888cf3745",
      "title": "Mock Assessment Scheduled",
      "message": "A mock placement test will be conducted online this Sunday.",
      "type": "warning",
      "isActive": true,
      "createdAt": "2026-06-13T09:00:00.000Z"
    }
  ]
}
```
- **Middleware Used**: `protect`

---

#### POST /api/announcements
- **Description**: Admins post a global campus announcement.
- **Request Headers**:
  - `Authorization: Bearer <ADMIN_JWT_TOKEN>`
  - `Content-Type: application/json`
- **Request Body Example**:
```json
{
  "title": "Mock Assessment Scheduled",
  "message": "A mock placement test will be conducted online this Sunday.",
  "type": "warning"
}
```
- **Success Response (201 Created)**:
```json
{
  "success": true,
  "data": {
    "_id": "603d7fc0c76b9e2888cf3745",
    "title": "Mock Assessment Scheduled",
    "message": "A mock placement test will be conducted online this Sunday.",
    "type": "warning",
    "createdBy": "603d76e4c76b9e2888cf36e1",
    "isActive": true
  }
}
```
- **Middleware Used**: `protect`, `admin`

---

#### DELETE /api/announcements/:id
- **Description**: Deletes an announcement.
- **Request Headers**:
  - `Authorization: Bearer <ADMIN_JWT_TOKEN>`
- **Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Announcement deleted successfully"
}
```
- **Middleware Used**: `protect`, `admin`


## 3. COMPLETE TESTING DOCUMENTATION

This section covers the comprehensive testing plan, test cases, and quality validation matrices executed to verify correct operation.

### 3.1 Comprehensive Test Case Suite

| Test ID | System Area | Test Case Description | Inputs | Expected Output | Actual Result |
|---|---|---|---|---|---|
| TC-01 | Authentication | Register student with valid values | Jane Doe, test@ex.com, Password@123 | Status 210 Created, db user verified: true | Pass |
| TC-02 | Authentication | Reject signup with short password | Jane Doe, test@ex.com, short | Status 400, "Password must be at least 8 characters." | Pass |
| TC-03 | Authentication | Reject signup with missing numbers/symbols | Jane Doe, test@ex.com, PasswordNoNum | Status 400, "Password must contain uppercase..." | Pass |
| TC-04 | Authentication | Reject signup with spaces in email | Jane Doe, test @ex.com, Password@123 | Status 400, "Email must not contain spaces." | Pass |
| TC-05 | Authentication | Authenticate valid student account | student@ex.com, Password@123, "student" | Status 200 OK, returns signed token | Pass |
| TC-06 | Authentication | Reject login with invalid credentials | student@ex.com, wrongpass | Status 410 Unauthorized | Pass |
| TC-07 | Authentication | Prevent cross-role login: Student as Admin | student@ex.com, Password@123, "admin" | Status 400, "This is a student account..." | Pass |
| TC-08 | Authentication | Block login for unverified administrator | admin@ex.com, AdminPass@123, "admin" | Status 403, "Please verify your email address..." | Pass |
| TC-09 | Profile | Update profile name with symbols only | "!!!" | Status 400, "Full Name must contain letters." | Pass |
| TC-10 | Profile | Update phone number with alphabet character | "98765432a0" | Status 400, "Mobile number must be exactly 10 digits." | Pass |
| TC-11 | Profile | Update phone number starting with digit 5 | "5876543210" | Status 400, "Mobile number must be exactly 10 digits." | Pass |
| TC-12 | Profile | Update graduation year with out-of-bounds year | "1899" | Status 400, "Graduation year must be between 1900 and 2100." | Pass |
| TC-13 | Profile | Update LinkedIn profile with incorrect domain | "https://google.com/in/user" | Status 400, "LinkedIn URL must be a valid..." | Pass |
| TC-14 | Profile | Update LinkedIn profile with malformed URL | "linkedin.com/in/user" | Status 400, "starts with http:// or https://" | Pass |
| TC-15 | Profile | Reject profile script content (XSS prevention) | "<script>alert(1)</script>" | Status 400, "contains forbidden script content." | Pass |
| TC-16 | Application Tracker | Create tracking entry with blank company name | "", "SDE", "10", "Applied" | Status 400, "Company name is required." | Pass |
| TC-17 | Application Tracker | Create application with package > 100 LPA | "Company", "SDE", "120", "Applied" | Status 400, "Package must not exceed 100 LPA." | Pass |
| TC-18 | Application Tracker | Reject past date for scheduled interview | "Company", "SDE", "10", "Interview Scheduled", "2020-01-01" | Status 400, "Interview date cannot be in the past." | Pass |
| TC-19 | Application Tracker | Allow blank interview date for Applied state | "Company", "SDE", "10", "Applied", "" | Status 201 Created, interviewDate: null | Pass |
| TC-20 | Application Tracker | Seed demo applications | Seeding call | Status 201 Created, adds 18 demo records | Pass |
| TC-21 | Application Tracker | Clear seeded demo applications | Clear call | Status 200 OK, deletes 18 demo records | Pass |
| TC-22 | Notes Module | Create note with valid title and content | "Title", "Body content", collectionId | Status 201 Created | Pass |
| TC-23 | Notes Module | Reject note title containing symbol-only spam | "---" | Status 400, "cannot consist only of special chars." | Pass |
| TC-24 | Notes Module | Pin a preparation note to the top | Pinned: true | Status 200 OK, note pinned successfully | Pass |
| TC-25 | Folders Module | Create collection with duplicate name | "DSA", user session | Status 201 Created (allowed per-user) | Pass |
| TC-26 | Folders Module | Prevent deleting General collection | General ID delete call | Status 400, "Cannot delete the default..." | Pass |
| TC-27 | Folders Module | Cascade notes to General on folder delete | Custom folder delete call | Status 200, notes shifted to General | Pass |
| TC-28 | Admin Control | Verify unverified student manually | Student ID verify call | Status 200 OK, student set verified | Pass |
| TC-29 | Admin Control | Toggle student block status | Student ID block call | Status 200 OK, blocks user account | Pass |
| TC-30 | Admin Control | Prevent blocking an administrator | Admin ID block call | Status 403, "Cannot block an admin" | Pass |
| TC-31 | Admin Control | Cascade delete student user data | Student ID delete call | Status 200, user and all related data purged | Pass |
| TC-32 | Admin Control | Reject password reset request approval for admin | Admin Request ID approve | Status 403, "Cannot reset admin password..." | Pass |
| TC-33 | Admin Control | Approve student password reset request | Student Request ID approve | Status 200 OK, returns Temp@1XYZ... | Pass |
| TC-34 | Admin Control | Reject student password reset request | Student Request ID reject | Status 200 OK, ticket status: rejected | Pass |
| TC-35 | Admin Control | Post announcement with urgent type | "Mock exam", "Message", "urgent" | Status 201 Created | Pass |
| TC-36 | Placement Drives | Launch placement drive (student visibility) | "Google", "SDE", "20", "Hybrid" | Status 201, broadcast notification sent to all | Pass |
| TC-37 | Placement Drives | Reject past date for placement drive | Drive date: "2020-01-01" | Status 400, "Drive date cannot be in the past." | Pass |
| TC-38 | Notification Sys | Retrieve unread notifications feed | Get notifications | Status 200 OK, returns list containing drives | Pass |
| TC-39 | Notification Sys | Mark individual notification as read | Notification ID read call | Status 200 OK, read: true | Pass |
| TC-40 | PDF Generation | Download consolidated reports as PDF file | PDF export click | File "Placement_Report_*.pdf" downloaded | Pass |
| TC-41 | Excel Generation | Download consolidated reports as Excel sheet | Excel export click | File "placement_report_*.xlsx" downloaded | Pass |

### 3.2 Boundary Value Analysis (BVA)

| Field / Parameter | Valid Range | Boundary Value Checked | Expected Response | Result |
|---|---|---|---|---|
| User Name Length | 2 - 100 characters | 1 character | Reject: "Full Name must be between 2 and..." | Pass |
| | | 2 characters | Accept | Pass |
| | | 100 characters | Accept | Pass |
| | | 101 characters | Reject: "Full Name must be between 2 and..." | Pass |
| Phone Number Digits | Exactly 10 digits | 9 digits | Reject: "Mobile number must be exactly 10..." | Pass |
| | | 10 digits | Accept | Pass |
| | | 11 digits | Reject: "Mobile number must be exactly 10..." | Pass |
| Package CTC Value | 0.01 - 100.0 LPA | 0.0 LPA | Reject: "Package must be greater than 0." | Pass |
| | | 0.01 LPA | Accept | Pass |
| | | 100.0 LPA | Accept | Pass |
| | | 100.1 LPA | Reject: "Package must not exceed 100 LPA." | Pass |
| Note Title Length | 2 - 100 characters | 1 character | Reject: "Title must be between 2 and..." | Pass |
| | | 2 characters | Accept | Pass |
| | | 100 characters | Accept | Pass |
| | | 101 characters | Reject: "Title must be between 2 and..." | Pass |
| Note Content Length | Max 5000 characters | 5000 characters | Accept | Pass |
| | | 5001 characters | Reject: "Content must not exceed 5000 chars." | Pass |
| Graduation Year | 1900 - 2100 | 1899 | Reject: "Graduation year must be between..." | Pass |
| | | 1900 | Accept | Pass |
| | | 2100 | Accept | Pass |
| | | 2101 | Reject: "Graduation year must be between..." | Pass |
| URL Length | Max 500 characters | 500 characters | Accept | Pass |
| | | 501 characters | Reject: "must not exceed 500 characters." | Pass |

### 3.3 Equivalence Partitioning (EP)

| Input Partition | Partition Description | Representative Input Tested | Expected System Behavior | Result |
|---|---|---|---|---|
| Email Format | Valid Standard formats | student@college.edu.in | Allow, normalize to lowercase | Pass |
| | Missing @ delimiter | studentcollege.com | Reject: "Please enter a valid email." | Pass |
| | Missing domain dot | student@collegecom | Reject: "Please enter a valid email." | Pass |
| | Contains space | student @college.com | Reject: "Email must not contain spaces." | Pass |
| Password Complexity | Valid strong password | Pass@word99 | Accept | Pass |
| | Lacks numbers | Pass@word | Reject: "Password must contain uppercase..." | Pass |
| | Lacks uppercase | pass@word99 | Reject: "Password must contain uppercase..." | Pass |
| | Lacks lowercase | PASS@WORD99 | Reject: "Password must contain uppercase..." | Pass |
| | Lacks special characters | Password123 | Reject: "Password must contain uppercase..." | Pass |
| | Under 8 characters | P@s1 | Reject: "Password must be at least 8 chars." | Pass |
| LinkedIn Profile | Valid profile URL | https://linkedin.com/in/jdoe | Accept | Pass |
| | Non-LinkedIn domain | https://facebook.com/jdoe | Reject: "must be a valid linkedin.com..." | Pass |
| | Incorrect URL path | https://linkedin.com/jdoe | Reject: "must be a valid LinkedIn profile..." | Pass |
| GitHub Profile | Valid profile URL | https://github.com/janedoe | Accept | Pass |
| | Repo URL path | https://github.com/jd/project | Reject: "must be a valid GitHub profile..." | Pass |
| | Reserved system path | https://github.com/settings | Reject: "must be a valid GitHub profile..." | Pass |


## 4. GLOSSARY OF TECHNICAL TERMS

An alphabetical list of 30+ core technical terms utilized across the system documentation.

1. **Active Record Pattern**: Design pattern for database interaction where object instances encapsulate both data and persistence logic. Mongoose models behave similarly.
2. **Asynchronous I/O**: Input/Output operations that allow execution to continue without waiting for operations to complete, key to Node.js non-blocking design.
3. **Authentication**: The process of validating identity credentials supplied to the application.
4. **Authorization**: Determining access privileges to system resources based on verified user roles (e.g., student vs. administrator).
5. **Auto-verification**: Automated user verification mapping applied at server boot to existing database records, bypassing OTP screens.
6. **Bcryptjs**: An implementation of the bcrypt password hashing algorithm written entirely in JavaScript.
7. **Bearer Token**: Access token structure transmitted in HTTP authorization headers to authenticate api requests.
8. **Bootstrap**: Styling framework or startup initialization logic that configures application state during boot.
9. **Boundary Value Analysis**: Software testing technique testing values at out-of-bounds limits.
10. **Cascade Deletion**: Database deletion pattern where purging a parent record automatically deletes all child dependencies.
11. **Client-Side Rendering (CSR)**: Web application architecture where pages are compiled and rendered in the browser.
12. **Collection**: In MongoDB, a schema-bound set of documents equivalent to a table in relational systems. Also refers to note folders in this application.
13. **Cross-Origin Resource Sharing (CORS)**: Access control standard allowing resources on a server to be requested from external browser domains.
14. **Document Database**: Database engine storing records in JSON-like formats, represented here by MongoDB.
15. **Dotenv**: Dependency module reading settings from environment configuration files (`.env`) into execution environments.
16. **Environment Variables**: Key-value pairs configured on operating system levels or container setups to store secrets outside codebases.
17. **Equivalence Partitioning**: Software testing process dividing input data classes to check system handling.
18. **Express.js**: Fast, minimalist routing web server framework running on top of Node.js.
19. **Glassmorphism**: UI design style utilizing transparent backgrounds, blurs, and shadows to simulate frosted glass textures.
20. **Hard Deletion**: SQL/NoSQL command physically deleting records from storage collections.
21. **JSON Web Token (JWT)**: Secure container standard generating encrypted verification packets for session tracking.
22. **Mongoose**: Object Data Modeling (ODM) framework wrapping MongoDB drivers for JavaScript.
23. **Node.js**: V8 engine compiler running server side, built around event loops.
24. **NoSQL**: Broad class of database engines designed to store non-tabular data structures.
25. **One-Time Password (OTP)**: Random digit sequences valid for short durations used for email verification or password recovery.
26. **Password Salting**: Appending randomized character strings to password strings prior to hashing to defeat dictionary attacks.
27. **Rate Limiting**: Operational limit throttling the frequency of specific endpoints to avoid service exhaustion.
28. **Resend API**: Email delivery cloud service providing email dispatch capabilities via programmatic interfaces.
29. **Schema**: Structured rules governing the properties, types, and constraints of database collections.
30. **SheetJS**: Client-side library used to write data matrices into Excel workbook spreadsheets.
31. **XSS (Cross-Site Scripting)**: Security vulnerability where attackers inject executable script strings into input fields.


## 5. ABBREVIATIONS LIST

An alphabetical directory of 25 key abbreviations with descriptions.

1. **API**: Application Programming Interface - Programmatic interfaces allowing software communication.
2. **BVA**: Boundary Value Analysis - Testing limit boundaries.
3. **CGPA**: Cumulative Grade Point Average - Numeric metric summarizing student academic performance.
4. **COR**: Cross-Origin Resource - Request origins governed by CORS rules.
5. **CORS**: Cross-Origin Resource Sharing - Access control standards for external domains.
6. **CSR**: Client-Side Rendering - Page generation compiled inside browser sessions.
7. **CTC**: Cost to Company - Annual salary package representation.
8. **DBMS**: Database Management System - Relational or non-relational database engine software.
9. **DOM**: Document Object Model - Structural node tree representing loaded webpage layouts.
10. **DSA**: Data Structures and Algorithms - Core programming topics tracking sorting, memory structures.
11. **E2E**: End-to-End - Comprehensive system flow tests.
12. **EP**: Equivalence Partitioning - Testing partitions of input values.
13. **HTML**: HyperText Markup Language - Standard layout structure for web browsers.
14. **HTTP**: HyperText Transfer Protocol - Protocol for communication on web servers.
15. **IP**: Internet Protocol - Numeric network address of clients.
16. **JSON**: JavaScript Object Notation - Key-value pair text data structure format.
17. **JWT**: JSON Web Token - Cryptographic token session standard.
18. **LPA**: Lakhs Per Annum - Numeric currency representation of packages in India.
19. **ODM**: Object Data Modeling - Object wrapper abstraction library for document databases.
20. **OS**: Operating System - Base environment hosting runner processes.
21. **OTP**: One-Time Password - 6-digit transient verification credentials.
22. **PDF**: Portable Document Format - Fixed-layout document presentation file standard.
23. **REST**: Representational State Transfer - Architectural style for stateless web service design.
24. **SDE**: Software Development Engineer - Core developer technical job role designation.
25. **SRS**: System Requirements Specification - Structural requirements plan file.
26. **URI**: Uniform Resource Identifier - Unique identifier addresses pointing to server resources.
27. **URL**: Uniform Resource Locator - Specific URI path addressing internet domains.


## 6. SYSTEM REQUIREMENTS SPECIFICATION (SRS)

This specification outlines the technical requirements, functional rules, and operational parameters of the platform.

### 6.1 Functional Requirements

#### 6.1.1 User Authentication & Account Security
- The system must support self-registration for student accounts.
- Password complexity must be enforced: minimum 8 characters, containing at least one uppercase letter, one lowercase letter, one number, and one special character.
- Email verification must be supported through either a tokenized redirect link or a 6-digit OTP code, both expiring in 24 hours.
- A forgot password recovery flow must verify administrators via email-sent OTP, while student recovery tickets are logged in the database for manual admin action.
- System logins must validate expected roles to prevent cross-portal authentication errors.

#### 6.1.2 Placement Job Application Tracking
- Authenticated students must be able to track company applications with job role, CTC packages (LPA), priority, applied date, current status, interview date, and notes.
- Application status changes must automatically generate internal alerts.
- A sandbox environment must seed and clear demo applications for visualization purposes.
- Analytics calculations must calculate total applications, selections, rejections, pending applications, active applications count, success rates, and monthly trend statistics.

#### 6.1.3 Folders & Preparation Notes
- Students must be able to organize preparation notes in custom collections with configurable colors and icons.
- Default collections must be pre-provisioned upon registration.
- Note management must support markdown contents, custom titles, pinning, and folder assignment.
- Collection deletion must re-allocate associated notes to the default General folder to prevent orphan documents.

#### 6.1.4 Notification & Broadcast Engine
- The system must support automated alerts for interview scheduling, status updates, and new placement drives.
- Administrators must be able to broadcast campus-wide announcements.
- Launching new drives must automatically push alerts to all active student notification feeds.

#### 6.1.5 Admin Panel & Operations
- Admins must have an overview stats panel containing aggregates of all users, applications, and active drives.
- Admins must be able to block student accounts to suspend logins, or delete student accounts (performing cascade purges of related user records).
- Manual verification of student accounts must be supported.
- Admins must manage the placement drives table (CRUD operations) and review/approve student password reset tickets.

### 6.2 Non-Functional Requirements

- **Security**: Access tokens must be JSON Web Tokens hashed using SHA-256. Passwords stored in MongoDB must be salted and hashed using Bcryptjs. Input fields must be sanitized to prevent XSS attacks.
- **Performance**: API responses must return in under 300ms under standard network conditions. Database indexes must optimize search operations on frequently queried fields.
- **Reliability**: Server start must gracefully verify external connections (e.g., Resend API) and execute self-healing database migrations.
- **Usability**: Responsive layouts must accommodate desktop, tablet, and mobile displays down to 320px viewport width.
- **Maintainability**: Shared validator scripts must unify validation logic between browser forms and backend controllers.


## 7. DETAILED USER JOURNEY WALKTHROUGHS

Step-by-step user journey scenarios documenting screen interactions and server processes.

### 7.1 Scenario 1: Student registration, verification, and first login
1. **Screen**: Student opens `index.html` signup panel, inputs name, email, and strong password, and clicks register.
2. **Server**: Checks database for existing email. Creates unverified user, provisions default collections (General, DSA, etc.), hashes password, and triggers Resend OTP email.
3. **Screen**: Page displays verification screen, prompting for the 6-digit code.
4. **Server**: Awaiting code payload at verify OTP route.
5. **Screen**: Student checks email inbox, retrieves code `459201`, inputs it on screen, and clicks verify.
6. **Server**: Validates code against database entry. Marks account verified: true.
7. **Screen**: UI displays success alert and switches to login view.
8. **Screen**: Student enters email and password, clicking login.
9. **Server**: Validates role, checks verification status, compares Bcrypt hash, and signs JWT.
10. **Screen**: Dashboard loads, fetching JWT-protected student statistics and rendering notes folder list.

---

### 7.2 Scenario 2: Student tracking a company job application lifecycle
1. **Screen**: Student clicks "Add Application" on the tracking board.
2. **Screen**: Input form prompts for company name, role, CTC package, and initial status (Applied). Student enters "Amazon", "SDE Intern", "15", and clicks save.
3. **Server**: Resolves JWT, runs validators, sanitizes text input, writes record to Company collection, and returns document.
4. **Screen**: Amazon application card displays in the Applied column on the Kanban board.
5. **Screen**: Student receives interview email, clicks edit icon on Amazon card.
6. **Screen**: Form dropdown status changed to "Interview Scheduled". Interview date set to next Monday. Clicks update.
7. **Server**: Validates dates are in the future, updates record. Generates notification document for upcoming interview.
8. **Screen**: Notification bell flashes badge alert. Tracking board updates card position.
9. **Screen**: After interview, student clicks edit, changes status to "Selected".
10. **Server**: Updates application. Recalculates analytics, increasing success rate percentage.

---

### 7.3 Scenario 3: Student organizing placement preparation notes in folders
1. **Screen**: Student navigates to Notes tab on the dashboard, clicking "New Folder".
2. **Screen**: Inputs name "Algorithms", color "blue", icon "code-2", and clicks create.
3. **Server**: Creates Collection document mapped to user.
4. **Screen**: Folder menu list updates with blue "Algorithms" folder item.
5. **Screen**: Student clicks "Add Note" button.
6. **Screen**: Inputs title "Merge Sort Complexity", writes markdown content, selects "Algorithms" folder, and clicks save.
7. **Server**: Stores note document linked to Algorithms folder collection ID.
8. **Screen**: Note card displays in folder panel. Student clicks pin icon.
9. **Server**: Sets pinned: true, updating database.
10. **Screen**: Note card shifts to top Pinned section of the dashboard layout.

---

### 7.4 Scenario 4: Admin dashboard monitoring, blocking, and manually verifying
1. **Screen**: Admin logs into `admin.html` control portal.
2. **Server**: Checks admin privileges, loads overall database statistics, and returns counts.
3. **Screen**: Admin clicks "Student Accounts" tab to view student directory.
4. **Server**: Returns directory listing with application counts per student.
5. **Screen**: Admin locates unverified student, clicking "Verify Account".
6. **Server**: Sets isVerified: true, clear tokens, and returns updated user document.
7. **Screen**: Student state badge changes to "Verified" on directory table.
8. **Screen**: Admin notices user violating policy, clicking "Block".
9. **Server**: Sets isBlocked: true, revoking login privileges.
10. **Screen**: State badge changes to "Blocked". Client prevents user logins with code 403.

---

### 7.5 Scenario 5: Admin scheduling and releasing new placement drives
1. **Screen**: Admin clicks "Placement Drives" tab, selecting "Launch Drive".
2. **Screen**: Fills in company name "TCS", role "Assistant Developer", package "3.6", offline mode, drive date, eligibility rules, and clicks publish.
3. **Server**: Performs strict field validation. Creates PlacementDrive document.
4. **Server**: Queries all student records in database.
5. **Server**: Automatically inserts Notification records for all students with details of the new TCS drive.
6. **Screen**: Admin drives table updates with TCS entry.
7. **Screen**: Student logs in on their dashboard.
8. **Screen**: Bell badge counter increases.
9. **Screen**: Student opens notifications pane, viewing drive announcement details.
10. **Screen**: Student clicks "View Details" to open eligibility checklist.

---

### 7.6 Scenario 6: Student requesting password reset, admin approval, and login
1. **Screen**: Student clicks "Forgot Password" on login portal.
2. **Screen**: Enters student email and clicks "Submit Request".
3. **Server**: Creates PasswordResetRequest ticket with status pending. Logs admin notification.
4. **Screen**: Student displays message "Submitted to Admin".
5. **Screen**: Admin logs in, opens "Reset Tickets" panel.
6. **Server**: Queries reset collection, populating student details.
7. **Screen**: Admin clicks "Approve Reset" on the student's ticket.
8. **Server**: Generates random string `Temp@1XYZ...`, hashes it, updates student password, marks ticket approved.
9. **Screen**: Admin copy-pastes temporary password, shares it with student.
10. **Screen**: Student uses email and temporary password to log in, then navigates to Profile to configure a new personal password.


## 8. ERROR HANDLING DOCUMENTATION

Comprehensive mapping of 20 system error scenarios, HTTP statuses, and recovery paths.

| Error Scenario | HTTP Status | Response Message | Server Handling | Frontend User Behavior |
|---|---|---|---|---|
| Invalid Login Password | 401 Unauthorized | "Invalid credentials" | Logs login failure attempt, increments audit counter | Shakes password field, displays error toast message |
| Blocked Account Login | 403 Forbidden | "Your account has been blocked..." | Rejects JWT signing, halts auth checks | Displays critical blocked banner, locks interface |
| Access Admin Route as Student | 403 Forbidden | "Access denied. Admin only." | Identifies role !== "admin", returns early | Displays permission denied screen, routes to login |
| Signup Email Duplicate | 400 Bad Request | "User already exists" | Aborts Mongoose create, logs conflict | Highlights email field in red, prompts for recovery |
| Empty Registration Fields | 400 Bad Request | "Please provide all required fields"| Aborts processing, returns missing keys | Displays alert validation box detailing missing fields |
| Weak Password Registration | 400 Bad Request | "Password must contain..." | Validates complexity regex, returns failure | Displays password checklist showing missing requirements |
| XSS Script Injection Input | 400 Bad Request | "[Field] contains forbidden..." | Rejects request inside validators helper | Shows warning toast, blocks submit actions |
| Malformed ObjectId URL | 400 Bad Request | "Invalid company id." | Checks mongoose.isValidObjectId, aborts | Redirects to dashboard, displays modal warning |
| Entity Not Found Update | 404 Not Found | "Company not found." | Fails to match ID/User, aborts database write | Refreshes board dashboard, pops warning alert |
| Invalid Dropdown Value | 400 Bad Request | "Invalid selection for [Field]" | Validates enum parameters, aborts | Dropdown highlight reset, prompts selector reload |
| Package CTC exceeds maximum | 400 Bad Request | "Package must not exceed 100 LPA."| Aborts operation inside validators | Disables save button, displays value limit alert |
| Interview date set in past | 400 Bad Request | "Interview date cannot be..." | Validates target date against system clock | Date picker calendar highlighted red, shows past warning |
| Missing JWT Authorization | 401 Unauthorized | "Not authorized to access..." | Rejects route matching on Protect middleware | Clears localStorage tokens, routes to login |
| Expired JWT Authorization | 401 Unauthorized | "Not authorized to access..." | Fails jwt.verify check, catches error | Clears localStorage tokens, routes to login |
| Resend Sandbox Restriction | 403 Forbidden | "Email delivery is currently..." | Catches Resend API error 403 status | Displays system sandbox sandbox notice dialog |
| Reset OTP code incorrect | 400 Bad Request | "Invalid or expired OTP code." | Validates code matches db entries, aborts | Input field turns red, displays retry option |
| Reset OTP expired | 400 Bad Request | "Invalid or expired OTP code." | Compares expiration date timestamp, aborts | Input field turns red, displays reset link option |
| Student Password Reset Ticket | 403 Forbidden | "Cannot reset admin password..." | Prevents admin recovery on student flow | Block admin tickets, show portal bypass notification |
| Database Connection Loss | 500 Server Error | "Failed to [Action]." | Logs connection error details, exits gracefully| Displays network offline modal panel |
| General Unknown Routing | 404 Not Found | "Not found." | Matches fallback routing middlewares | Renders generic 404 web layout page |

