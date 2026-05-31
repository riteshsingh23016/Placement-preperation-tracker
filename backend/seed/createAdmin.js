const mongoose = require("mongoose");
const dotenv = require("dotenv");
const User = require("../models/user");
const connectDB = require("../config/db");

dotenv.config();

const seedAdmin = async () => {
  try {
    await connectDB();

    const name = process.env.ADMIN_NAME || "System Admin";
    const email = process.env.ADMIN_EMAIL || "riteshthelegend10f@gmail.com";
    const password = process.env.ADMIN_PASSWORD || "admin123";

    if (!email || !password) {
      console.error("Error: ADMIN_EMAIL or ADMIN_PASSWORD not found in .env");
      process.exit(1);
    }

    const adminExists = await User.findOne({ email });

    if (adminExists) {
      console.log(`Admin account with email ${email} already exists.`);
      process.exit(0);
    }

    const admin = await User.create({
      name,
      email,
      password,
      role: "admin",
      isBlocked: false,
      isVerified: true,
    });

    if (admin) {
      console.log("Admin account created successfully:");
      console.log(`Name: ${admin.name}`);
      console.log(`Email: ${admin.email}`);
      console.log(`Role: ${admin.role}`);
    }

    process.exit(0);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

seedAdmin();
