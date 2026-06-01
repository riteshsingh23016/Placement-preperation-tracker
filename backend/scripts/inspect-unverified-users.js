const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const User = require("../models/user");

async function run() {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      console.error("MONGO_URI not found");
      process.exit(1);
    }
    await mongoose.connect(mongoUri);
    const unverifiedUsers = await User.find({ isVerified: false });
    console.log(`Found ${unverifiedUsers.length} unverified users:`);
    console.log(JSON.stringify(unverifiedUsers.map(u => ({
      _id: u._id,
      name: u.name,
      email: u.email,
      verificationOTP: u.verificationOTP,
      verificationOTPExpires: u.verificationOTPExpires,
      createdAt: u.createdAt
    })), null, 2));
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await mongoose.disconnect();
  }
}
run();
