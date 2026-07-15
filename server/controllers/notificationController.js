const Notification = require("../models/Notification");
const { createNotification } = require("../services/notificationService");

exports.listNotifications = async (req, res) => {
  try {
    let notifications = await Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(40);

    if (!notifications.length) {
      await createNotification({
        user: req.user._id,
        type: "system",
        title: "Notification center activated",
        message: "AutoFlow will notify you about documents, approvals, privacy risks and automation runs.",
        actionPath: "/dashboard",
      });
      notifications = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(40);
    }

    const unreadCount = await Notification.countDocuments({ user: req.user._id, read: false });
    return res.json({ success: true, unreadCount, notifications });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.markRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { read: true },
      { new: true }
    );
    if (!notification) return res.status(404).json({ success: false, message: "Notification not found" });
    return res.json({ success: true, notification });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.markAllRead = async (req, res) => {
  try {
    await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
    return res.json({ success: true, message: "All notifications marked as read" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
