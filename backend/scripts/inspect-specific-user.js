const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const User = require("../models/user");

async function run() {
  try {
    const mongoUri = process.env.MONGO_URI;
    await mongoose.connect(mongoUri);
    const user = await User.findOne({ email: "riteshsingh5361@gmail.com" });
    if (user) {
      console.log("USER EXISTS:", JSON.stringify(user.toObject(), null, 2));
    } else {
      console.log("USER DOES NOT EXIST");
    }
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await mongoose.disconnect();
  }
}
run();
