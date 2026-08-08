const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { recordSecurityEvent } = require("../services/securityEventService");

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role || "AI Automation Engineer",
  avatar: user.avatar || "",
});

const signToken = (user) => jwt.sign(
  { id: user._id, tokenVersion: user.tokenVersion || 0 },
  process.env.JWT_SECRET,
  { expiresIn: "2h", issuer: "autoflow-ai", audience: "autoflow-workspace", algorithm: "HS256" }
);

// ================= REGISTER =================
const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check Empty Fields
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please fill all fields",
      });
    }

    // Check Existing User
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    // Hash Password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create User
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    res.status(201).json({
      success: true,
      message: "User Registered Successfully",
      user: publicUser(user),
    });

  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// ================= LOGIN =================
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check Empty Fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please fill all fields",
      });
    }

    // Find User
    const user = await User.findOne({ email });

    if (!user) {
      await recordSecurityEvent({ req, type: "login", outcome: "blocked", severity: "medium", message: "Login attempted for an unknown account" });
      return res.status(400).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.lockUntil && user.lockUntil > new Date()) {
      await recordSecurityEvent({ req, user: user._id, type: "login", outcome: "blocked", severity: "high", message: "Login blocked because the account is temporarily locked" });
      return res.status(423).json({ success: false, message: "Account temporarily locked after repeated failed attempts. Try again later." });
    }

    // Compare Password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      if (user.failedLoginAttempts >= 5) user.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
      await user.save();
      await recordSecurityEvent({ req, user: user._id, type: "login", outcome: "blocked", severity: user.lockUntil ? "high" : "medium", message: "Invalid password rejected", metadata: { failedAttempts: user.failedLoginAttempts } });
      return res.status(400).json({
        success: false,
        message: "Invalid Password",
      });
    }

    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    user.lastLoginAt = new Date();
    user.lastLoginIpHash = crypto.createHash("sha256").update(req.ip || "unknown").digest("hex").slice(0, 16);
    await user.save();
    const token = signToken(user);
    await recordSecurityEvent({ req, user: user._id, type: "login", outcome: "allowed", severity: "info", message: "Authenticated session created" });

    res.status(200).json({
      success: true,
      message: "Login Successful",
      token,
      user: publicUser(user),
    });

  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

const logoutUser = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();
    await recordSecurityEvent({ req, user: user._id, type: "logout", outcome: "allowed", message: "All active sessions were revoked" });
    return res.json({ success: true, message: "Signed out securely" });
  } catch (error) { return res.status(500).json({ success: false, message: error.message }); }
};

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: "Profile not found" });
    return res.json({ success: true, user: publicUser(user) });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: "Profile not found" });

    if (typeof req.body.name === "string") {
      const name = req.body.name.trim();
      if (name.length < 2 || name.length > 60) {
        return res.status(400).json({ success: false, message: "Name must be 2 to 60 characters" });
      }
      user.name = name;
    }

    if (typeof req.body.role === "string") {
      const role = req.body.role.trim();
      if (!role || role.length > 60) {
        return res.status(400).json({ success: false, message: "Professional role is required" });
      }
      user.role = role;
    }

    if (typeof req.body.avatar === "string") {
      const avatar = req.body.avatar;
      if (avatar && !/^data:image\/(jpeg|png|webp);base64,/i.test(avatar)) {
        return res.status(400).json({ success: false, message: "Only JPG, PNG or WEBP images are allowed" });
      }
      if (avatar.length > 700000) {
        return res.status(400).json({ success: false, message: "Profile image is too large" });
      }
      user.avatar = avatar;
    }

    await user.save();
    return res.json({ success: true, message: "Profile updated", user: publicUser(user) });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getProfile,
  updateProfile,
  logoutUser,
};
