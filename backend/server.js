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

app.get("/api/debug/resend-logs", async (req, res) => {
  console.log("Running GET /api/debug/resend-logs...");
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return res.status(200).json({
      success: false,
      error: "RESEND_API_KEY not configured."
    });
  }

  try {
    const axios = require("axios");
    const response = await axios.get("https://api.resend.com/emails", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      timeout: 10000,
    });

    return res.json({
      success: true,
      emails: response.data.data
    });
  } catch (error) {
    const errorData = error.response ? error.response.data : error.message;
    return res.status(500).json({
      success: false,
      error: errorData
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
