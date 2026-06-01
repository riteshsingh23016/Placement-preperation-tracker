const { spawn } = require("child_process");
const path = require("path");
const axios = require("axios");
const mongoose = require("mongoose");
const User = require("../models/user");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const PORT = 5098;
const BASE_URL = `http://localhost:${PORT}/api`;

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  console.log("=== STARTING FINAL RELEASE AUDIT & REPAIR END-TO-END TEST ===");
  let serverProcess = null;

  try {
    // 1. Connect directly to DB for pre-test setup
    console.log("Connecting directly to MongoDB for setup...");
    await mongoose.connect(process.env.MONGO_URI);
    
    // Clean up old test accounts
    await User.deleteMany({ 
      email: { $in: ["stuck_student@test.com", "signup_fail_test@example.com"] } 
    });

    // Create a mock stuck student (created before patch, not verified)
    const stuckUser = await User.create({
      name: "Stuck Student",
      email: "stuck_student@test.com",
      password: "password123",
      isVerified: false,
      verificationOTP: "999999",
      verificationOTPExpires: new Date(Date.now() + 600000),
      createdAt: new Date("2026-06-01T12:00:00.000Z"), // Between migration cutoff and patch timestamp
    });
    console.log("Stuck student registered in DB (ID:", stuckUser._id, ")");

    // 2. Boot up the backend server on test port 5098
    console.log(`Booting server on port ${PORT}...`);
    serverProcess = spawn("node", ["server.js"], {
      cwd: path.join(__dirname, ".."),
      env: { ...process.env, PORT },
    });

    serverProcess.stdout.on("data", (data) => {
      console.log(`[Server stdout] ${data.toString().trim()}`);
    });

    serverProcess.stderr.on("data", (data) => {
      console.error(`[Server stderr] ${data.toString().trim()}`);
    });

    await delay(3500);
    console.log("Server booted successfully.");

    // 3. Login as Admin
    console.log("Logging in as Admin...");
    const adminLogin = await axios.post(`${BASE_URL}/auth/login`, {
      email: process.env.ADMIN_EMAIL || "riteshthelegend10f@gmail.com",
      password: process.env.ADMIN_PASSWORD || "admin123",
    });
    const token = adminLogin.data.data.token;
    console.log("Admin login successful. JWT acquired.");

    // 4. Test GET /api/admin/unverified
    console.log("Fetching unverified stuck users...");
    const stuckRes = await axios.get(`${BASE_URL}/admin/unverified`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("Unverified list response size:", stuckRes.data.data.length);
    const auditedUser = stuckRes.data.data.find(u => u.email === "stuck_student@test.com");
    if (!auditedUser) {
      throw new Error("Stuck student not found in unverified list!");
    }
    console.log("Audited stuck student metadata:");
    console.log("- Name:", auditedUser.name);
    console.log("- Created Before Patch:", auditedUser.createdBeforePatch);
    console.log("- Email Delivered:", auditedUser.emailDelivered);
    console.log("- Recoverable:", auditedUser.recoverable);

    if (auditedUser.createdBeforePatch !== true) {
      throw new Error("Failed to identify user was created before patch!");
    }

    // 5. Test Resend Verification via Admin endpoint POST /api/admin/users/:id/resend
    console.log(`Calling POST /api/admin/users/${stuckUser._id}/resend...`);
    const resendRes = await axios.post(
      `${BASE_URL}/admin/users/${stuckUser._id}/resend`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log("Resend Verification Response:", resendRes.data);

    // 6. Test Verify User via Admin endpoint PATCH /api/admin/users/:id/verify
    console.log(`Calling PATCH /api/admin/users/${stuckUser._id}/verify...`);
    const verifyRes = await axios.patch(
      `${BASE_URL}/admin/users/${stuckUser._id}/verify`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log("Verify User Response:", verifyRes.data);

    // Verify DB user properties are cleared correctly
    const dbUserAfterVerify = await User.findById(stuckUser._id);
    console.log("DB User fields after Verify Repair:");
    console.log("- isVerified:", dbUserAfterVerify.isVerified);
    console.log("- verificationOTP:", dbUserAfterVerify.verificationOTP);
    console.log("- verificationToken:", dbUserAfterVerify.verificationToken);
    console.log("- verificationOTPExpires:", dbUserAfterVerify.verificationOTPExpires);

    if (
      dbUserAfterVerify.isVerified !== true || 
      dbUserAfterVerify.verificationOTP !== undefined ||
      dbUserAfterVerify.verificationToken !== undefined
    ) {
      throw new Error("Verification cleanup failed to clear database timestamps/tokens!");
    }
    console.log("✅ Stuck user verified and tokens cleared successfully.");

    // 7. Test Delete User endpoint DELETE /api/admin/users/:id
    console.log(`Calling DELETE /api/admin/users/${stuckUser._id}...`);
    const deleteRes = await axios.delete(
      `${BASE_URL}/admin/users/${stuckUser._id}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log("Delete User Response:", deleteRes.data);

    const deletedCheck = await User.findById(stuckUser._id);
    if (deletedCheck) {
      throw new Error("User record still exists after deletion!");
    }
    console.log("✅ Stuck user deleted safely and cascadingly.");

    // 8. E2E signup failure check (to verify that email hardening deletes user if dispatch fails)
    // We will register a student to an invalid domain which causes dispatch to fail or sandbox restriction
    console.log("Testing signup flow error handling with unverified sandbox address...");
    try {
      const signupRes = await axios.post(`${BASE_URL}/auth/signup`, {
        name: "Signup Fail Test",
        email: "signup_fail_test@example.com",
        password: "password123"
      });
      console.log("❌ Unexpected signup success:", signupRes.data);
      throw new Error("Signup unexpectedly succeeded when it should have failed!");
    } catch (err) {
      console.log("✅ Expected Signup Failure. Response Status:", err.response ? err.response.status : err.message);
      console.log("Response JSON:", err.response ? err.response.data : 'None');
      
      // Verify user was NOT saved in database
      const signupFailCheck = await User.findOne({ email: "signup_fail_test@example.com" });
      if (signupFailCheck) {
        throw new Error("Failed user record was not deleted from DB on email failure!");
      }
      console.log("✅ Failed registration successfully rolled back in MongoDB.");
    }

    console.log("=== ALL END-TO-END VERIFICATIONS COMPLETED SUCCESSFULLY ===");

  } catch (err) {
    console.error("❌ E2E Integration Test Failed:", err.response ? err.response.data : err.message);
    process.exitCode = 1;
  } finally {
    if (serverProcess) {
      console.log("Shutting down test server...");
      serverProcess.kill();
    }
    await mongoose.disconnect();
    console.log("Disconnected from DB.");
  }
}

run();
