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
  try {
    console.log("Running GET /api/debug/email-test...");
    const info = await sendEmail({
      email: "riteshthelegend10f@gmail.com",
      subject: "Test Email - Placement Prep Tracker",
      text: "This is a debug test email verifying that the SMTP configuration is working properly.",
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; max-width: 600px; margin: auto;">
          <h2 style="color: #0d9488;">SMTP Test Successful</h2>
          <p>This is a debug test email verifying that the SMTP configuration is working properly on the Placement Prep Tracker platform.</p>
        </div>
      `
    });
    res.json({ success: true, message: "Email sent successfully", messageId: info.messageId, details: info });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to send email", error: error.message });
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
