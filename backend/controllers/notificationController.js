const Notification = require("../models/notification");

// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private
exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.status(200).json({
      success: true,
      data: notifications,
    });
  } catch (err) {
    console.error("getNotifications:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch notifications.",
    });
  }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found.",
      });
    }

    res.status(200).json({
      success: true,
      data: notification,
    });
  } catch (err) {
    console.error("markAsRead:", err);
    res.status(500).json({
      success: false,
      message: "Failed to update notification.",
    });
  }
};

// @desc    Mark all as read
// @route   PUT /api/notifications/read-all
// @access  Private
exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany({ user: req.user._id, read: false }, { read: true });

    res.status(200).json({
      success: true,
      message: "All notifications marked as read.",
    });
  } catch (err) {
    console.error("markAllAsRead:", err);
    res.status(500).json({
      success: false,
      message: "Failed to update notifications.",
    });
  }
};

// @desc    Delete a notification
// @route   DELETE /api/notifications/:id
// @access  Private
exports.deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found.",
      });
    }

    res.status(200).json({
      success: true,
      message: "Notification deleted.",
    });
  } catch (err) {
    console.error("deleteNotification:", err);
    res.status(500).json({
      success: false,
      message: "Failed to delete notification.",
    });
  }
};

/**
 * Helper function to create notifications internally
 */
exports.createInternalNotification = async ({ userId, type, title, message, companyId, priority }) => {
  try {
    // Avoid duplicate unread notifications of same type for same company
    if (companyId) {
      const existing = await Notification.findOne({
        user: userId,
        company: companyId,
        type,
        read: false,
      });
      if (existing) return existing;
    }

    return await Notification.create({
      user: userId,
      type,
      title,
      message,
      company: companyId || null,
      priority: priority || "low",
    });
  } catch (err) {
    console.error("createInternalNotification:", err);
    return null;
  }
};
