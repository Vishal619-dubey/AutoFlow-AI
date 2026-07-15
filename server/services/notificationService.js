const Notification = require("../models/Notification");

async function createNotification(payload) {
  try {
    return await Notification.create(payload);
  } catch (error) {
    console.warn("Notification skipped:", error.message);
    return null;
  }
}

module.exports = { createNotification };
