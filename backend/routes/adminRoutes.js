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
