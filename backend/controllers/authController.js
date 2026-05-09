const User = require("../models/user");
const Collection = require("../models/collection");
const jwt = require("jsonwebtoken");

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || "default_jwt_secret_for_dev_only", {
    expiresIn: process.env.JWT_EXPIRES_IN || "30d",
  });
};

exports.signup = async (req, res) => {
  try {
    let { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: "Please provide all required fields" });
    }

    email = email.trim().toLowerCase();

    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    const user = await User.create({
      name: name.trim(),
      email,
      password,
    });

    if (!user) {
      return res.status(400).json({ success: false, message: "Failed to create user in database" });
    }

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
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        token: generateToken(user._id),
      },
    });
  } catch (err) {
    console.error("[Auth] Signup Error:", err.message);
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

    res.status(200).json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
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
