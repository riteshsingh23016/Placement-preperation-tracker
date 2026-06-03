const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../backend/.env") });
const User = require("../backend/models/user");
const PasswordResetRequest = require("../backend/models/PasswordResetRequest");
const Notification = require("../backend/models/notification");

async function cleanupAndTest() {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      console.error("MONGO_URI not found");
      process.exit(1);
    }
    await mongoose.connect(mongoUri);

    console.log("Connected to MongoDB.");

    const testEmail = "test_student_secure@gmail.com";

    // Cleanup previous runs
    console.log("Cleaning up previous test student user and requests...");
    const existingUser = await User.findOne({ email: testEmail });
    if (existingUser) {
      await PasswordResetRequest.deleteMany({ user: existingUser._id });
      await Notification.deleteMany({ user: existingUser._id });
      await User.deleteOne({ _id: existingUser._id });
    }
    
    // Ensure admin user exists and password is set to admin123
    console.log("Ensuring admin user has correct password...");
    const adminEmail = process.env.ADMIN_EMAIL || "riteshthelegend10f@gmail.com";
    const adminUserDoc = await User.findOne({ email: adminEmail });
    if (adminUserDoc) {
      adminUserDoc.password = "admin123";
      adminUserDoc.isBlocked = false;
      adminUserDoc.isVerified = true;
      await adminUserDoc.save();
      console.log("Admin user password reset to admin123 successfully.");
    } else {
      await User.create({
        name: "System Admin",
        email: adminEmail,
        password: "admin123",
        role: "admin",
        isBlocked: false,
        isVerified: true
      });
      console.log("Admin user created.");
    }
    
    // Cleanup any other notifications related to test_student_secure
    await Notification.deleteMany({ message: new RegExp(testEmail) });

    console.log("Cleanup completed.");

    // Fetch API library
    const http = require("http");

    const post = (url, data, headers = {}) => {
      return new Promise((resolve, reject) => {
        const u = new URL(url);
        const options = {
          hostname: u.hostname,
          port: u.port,
          path: u.pathname + u.search,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...headers
          }
        };

        const req = http.request(options, (res) => {
          let body = "";
          res.on("data", (chunk) => body += chunk);
          res.on("end", () => {
            try {
              resolve({ status: res.statusCode, data: JSON.parse(body) });
            } catch (e) {
              resolve({ status: res.statusCode, raw: body });
            }
          });
        });

        req.on("error", (e) => reject(e));
        req.write(JSON.stringify(data));
        req.end();
      });
    };

    const get = (url, headers = {}) => {
      return new Promise((resolve, reject) => {
        const u = new URL(url);
        const options = {
          hostname: u.hostname,
          port: u.port,
          path: u.pathname + u.search,
          method: "GET",
          headers: {
            ...headers
          }
        };

        const req = http.request(options, (res) => {
          let body = "";
          res.on("data", (chunk) => body += chunk);
          res.on("end", () => {
            try {
              resolve({ status: res.statusCode, data: JSON.parse(body) });
            } catch (e) {
              resolve({ status: res.statusCode, raw: body });
            }
          });
        });

        req.on("error", (e) => reject(e));
        req.end();
      });
    };

    // Test 1: Signup with weak password
    console.log("\n--- TEST 1: Signup with weak password ---");
    const signupWeak = await post("http://localhost:5000/api/auth/signup", {
      name: "Test Secure Student",
      email: testEmail,
      password: "weak"
    });
    console.log("Response Status:", signupWeak.status);
    console.log("Response Data:", signupWeak.data);
    if (signupWeak.status === 400 && signupWeak.data.success === false) {
      console.log("✅ Success: Signup with weak password correctly blocked!");
    } else {
      console.error("❌ Fail: Signup with weak password was not blocked correctly!");
      process.exit(1);
    }

    // Test 2: Signup with strong password (missing uppercase, etc.)
    console.log("\n--- TEST 2: Signup with password missing uppercase ---");
    const signupNoUpper = await post("http://localhost:5000/api/auth/signup", {
      name: "Test Secure Student",
      email: testEmail,
      password: "weak12345@"
    });
    console.log("Response Status:", signupNoUpper.status);
    console.log("Response Data:", signupNoUpper.data);
    if (signupNoUpper.status === 400 && signupNoUpper.data.success === false) {
      console.log("✅ Success: Signup with missing uppercase password correctly blocked!");
    } else {
      console.error("❌ Fail: Signup with missing uppercase password was not blocked!");
      process.exit(1);
    }

    // Test 3: Signup with valid strong password
    console.log("\n--- TEST 3: Signup with valid strong password ---");
    const signupStrong = await post("http://localhost:5000/api/auth/signup", {
      name: "Test Secure Student",
      email: testEmail,
      password: "StrongPassword123!"
    });
    console.log("Response Status:", signupStrong.status);
    console.log("Response Data:", signupStrong.data);
    if (signupStrong.status === 201 && signupStrong.data.success === true) {
      console.log("✅ Success: Signup with strong password allowed!");
    } else {
      console.error("❌ Fail: Signup with strong password failed!");
      process.exit(1);
    }

    // Since verification is required, let's auto-verify the student directly in DB to allow testing login
    console.log("\nAuto-verifying user in database...");
    await User.updateOne({ email: testEmail }, { isVerified: true });
    console.log("User verified.");

    // Test 4: Student Login
    console.log("\n--- TEST 4: Student Login ---");
    const studentLogin = await post("http://localhost:5000/api/auth/login", {
      email: testEmail,
      password: "StrongPassword123!"
    });
    console.log("Response Status:", studentLogin.status);
    if (studentLogin.status === 200 && studentLogin.data.success === true) {
      console.log("✅ Success: Student logged in successfully!");
    } else {
      console.error("❌ Fail: Student login failed!");
      process.exit(1);
    }

    // Test 5: Forgot Password Request
    console.log("\n--- TEST 5: Student Forgot Password Request ---");
    const forgotRequest = await post("http://localhost:5000/api/auth/forgot-password", {
      email: testEmail
    });
    console.log("Response Status:", forgotRequest.status);
    console.log("Response Data:", forgotRequest.data);
    if (forgotRequest.status === 200 && forgotRequest.data.success === true) {
      console.log("✅ Success: Forgot password request created successfully!");
    } else {
      console.error("❌ Fail: Forgot password request failed!");
      process.exit(1);
    }

    // Test 6: Verify Admin Notification and Reset Request in Database
    console.log("\n--- TEST 6: Verify MongoDB Record and Notification ---");
    const resetReq = await PasswordResetRequest.findOne({ email: testEmail });
    if (resetReq && resetReq.status === "pending") {
      console.log("✅ Success: Pending PasswordResetRequest record found in MongoDB!");
    } else {
      console.error("❌ Fail: Pending PasswordResetRequest record not found in MongoDB!");
      process.exit(1);
    }

    const adminNotification = await Notification.findOne({
      message: new RegExp(testEmail)
    });
    if (adminNotification && adminNotification.priority === "high") {
      console.log("✅ Success: High-priority notification created for Admin!");
    } else {
      console.error("❌ Fail: Notification for Admin was not created properly!");
      process.exit(1);
    }

    // Test 7: Admin Login
    console.log("\n--- TEST 7: Admin Login ---");
    const adminLogin = await post("http://localhost:5000/api/auth/login", {
      email: process.env.ADMIN_EMAIL || "riteshthelegend10f@gmail.com",
      password: process.env.ADMIN_PASSWORD || "admin123"
    });
    console.log("Response Status:", adminLogin.status);
    if (adminLogin.status === 200 && adminLogin.data.success === true) {
      console.log("✅ Success: Admin logged in successfully!");
    } else {
      console.error("❌ Fail: Admin login failed!");
      process.exit(1);
    }

    const adminToken = adminLogin.data.data.token;
    const adminHeaders = { "Authorization": `Bearer ${adminToken}` };

    // Test 8: Admin Get Resets
    console.log("\n--- TEST 8: Admin Fetch Reset Requests ---");
    const adminResets = await get("http://localhost:5000/api/admin/resets", adminHeaders);
    console.log("Response Status:", adminResets.status);
    if (adminResets.status === 200 && adminResets.data.success === true) {
      const found = adminResets.data.data.find(r => r.email === testEmail);
      if (found) {
        console.log("✅ Success: Found our request in the admin fetch list!");
      } else {
        console.error("❌ Fail: Request not found in admin resets list!");
        process.exit(1);
      }
    } else {
      console.error("❌ Fail: Admin resets fetch failed!");
      process.exit(1);
    }

    // Test 9: Admin Approve Reset Request
    console.log("\n--- TEST 9: Admin Approve Request ---");
    const approveRes = await post(`http://localhost:5000/api/admin/resets/${resetReq._id}/approve`, {}, adminHeaders);
    console.log("Response Status:", approveRes.status);
    console.log("Response Data:", approveRes.data);
    if (approveRes.status === 200 && approveRes.data.success === true && approveRes.data.tempPassword) {
      console.log("✅ Success: Request approved and temporary password generated!");
    } else {
      console.error("❌ Fail: Request approval failed!");
      process.exit(1);
    }

    const tempPassword = approveRes.data.tempPassword;

    // Test 10: Log in student with temporary password
    console.log("\n--- TEST 10: Student Login with Temp Password ---");
    const studentLoginTemp = await post("http://localhost:5000/api/auth/login", {
      email: testEmail,
      password: tempPassword
    });
    console.log("Response Status:", studentLoginTemp.status);
    if (studentLoginTemp.status === 200 && studentLoginTemp.data.success === true) {
      console.log("✅ Success: Student successfully logged in with temporary password!");
    } else {
      console.error("❌ Fail: Student login with temporary password failed!");
      process.exit(1);
    }

    // Test 11: Admin Forgot Password Request (OTP flow)
    console.log("\n--- TEST 11: Admin Forgot Password Request (OTP flow) ---");
    const adminForgotRes = await post("http://localhost:5000/api/auth/forgot-password", {
      email: adminEmail,
      role: "admin"
    });
    console.log("Response Status:", adminForgotRes.status);
    console.log("Response Data:", adminForgotRes.data);
    if (adminForgotRes.status === 200 && adminForgotRes.data.success === true) {
      console.log("✅ Success: Admin forgot password request accepted!");
    } else {
      console.error("❌ Fail: Admin forgot password request failed!");
      process.exit(1);
    }

    // Test 12: Verify Admin OTP in MongoDB and Reset Password
    console.log("\n--- TEST 12: Verify Admin OTP and Perform Reset ---");
    const adminUserCheck = await User.findOne({ email: adminEmail });
    if (adminUserCheck && adminUserCheck.resetPasswordOTP) {
      console.log("✅ Success: Generated reset OTP found in MongoDB:", adminUserCheck.resetPasswordOTP);
    } else {
      console.error("❌ Fail: Reset OTP was not generated in MongoDB!");
      process.exit(1);
    }

    const resetOtp = adminUserCheck.resetPasswordOTP;
    const newAdminPass = "NewStrongAdminPass123!";

    // Test weak password reset block
    console.log("Verifying weak password reset block for Admin...");
    const weakResetRes = await post("http://localhost:5000/api/auth/reset-password", {
      email: adminEmail,
      otp: resetOtp,
      newPassword: "weak"
    });
    console.log("Weak Reset Status:", weakResetRes.status);
    if (weakResetRes.status === 400 && weakResetRes.data.success === false) {
      console.log("✅ Success: Weak password reset attempt blocked!");
    } else {
      console.error("❌ Fail: Weak password reset attempt allowed!");
      process.exit(1);
    }

    // Perform actual strong password reset
    const resetRes = await post("http://localhost:5000/api/auth/reset-password", {
      email: adminEmail,
      otp: resetOtp,
      newPassword: newAdminPass
    });
    console.log("Reset Response Status:", resetRes.status);
    console.log("Reset Response Data:", resetRes.data);
    if (resetRes.status === 200 && resetRes.data.success === true) {
      console.log("✅ Success: Admin password reset with OTP completed!");
    } else {
      console.error("❌ Fail: Admin password reset failed!");
      process.exit(1);
    }

    // Test 13: Log in Admin with the new password
    console.log("\n--- TEST 13: Admin Login with New Password ---");
    const newAdminLogin = await post("http://localhost:5000/api/auth/login", {
      email: adminEmail,
      password: newAdminPass
    });
    console.log("Response Status:", newAdminLogin.status);
    if (newAdminLogin.status === 200 && newAdminLogin.data.success === true) {
      console.log("✅ Success: Admin logged in with new password successfully!");
    } else {
      console.error("❌ Fail: Admin login with new password failed!");
      process.exit(1);
    }

    // Restore Admin password to default "admin123" for safety
    console.log("\nRestoring Admin password back to default 'admin123'...");
    const adminUserRestore = await User.findOne({ email: adminEmail });
    if (adminUserRestore) {
      adminUserRestore.password = "admin123";
      await adminUserRestore.save();
      console.log("Admin password restored.");
    }

    // Clean up DB
    console.log("\nCleaning up test data from DB...");
    await PasswordResetRequest.deleteOne({ _id: resetReq._id });
    await User.deleteOne({ email: testEmail });
    await Notification.deleteMany({ message: new RegExp(testEmail) });
    console.log("DB cleaned up successfully.");
    console.log("\n🎉 ALL TESTS PASSED E2E! 🎉");

  } catch (err) {
    console.error("Error in test execution:", err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

cleanupAndTest();
