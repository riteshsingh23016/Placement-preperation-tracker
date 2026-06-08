const express = require("express");
const router = express.Router();
const Announcement = require("../models/Announcement");
const { protect, admin } = require("../middleware/authMiddleware");
const Validators = require("../utils/validators");

// @desc    Get all active announcements
// @route   GET /api/announcements
// @access  Private (All authenticated users)
router.get("/", protect, async (req, res) => {
  try {
    const announcements = await Announcement.find({ isActive: true }).sort({ createdAt: -1 });
    res.json({ success: true, data: announcements });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @desc    Create a new announcement
// @route   POST /api/announcements
// @access  Private/Admin
router.post("/", protect, admin, async (req, res) => {
  try {
    const { title, message, type } = req.body;

    const titleErr = Validators.validateName(title, "Announcement Title", true);
    if (titleErr) {
      return res.status(400).json({ success: false, message: titleErr });
    }

    const msgErr = Validators.validateLongText(message, 5000, "Announcement Message", true);
    if (msgErr) {
      return res.status(400).json({ success: false, message: msgErr });
    }

    const t = (type || "info").toLowerCase();
    const typeErr = Validators.validateDropdown(t, ["info", "success", "warning", "urgent"], "Announcement Type");
    if (typeErr) {
      return res.status(400).json({ success: false, message: typeErr });
    }

    const announcement = await Announcement.create({
      title: title.trim(),
      message: message.trim(),
      type: t,
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, data: announcement });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @desc    Delete/Deactivate an announcement
// @route   DELETE /api/announcements/:id
// @access  Private/Admin
router.delete("/:id", protect, admin, async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);

    if (!announcement) {
      return res.status(404).json({ success: false, message: "Announcement not found" });
    }

    // Hard delete or Soft delete? User asked for Delete.
    await Announcement.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: "Announcement deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
