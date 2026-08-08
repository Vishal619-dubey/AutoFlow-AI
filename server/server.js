require("dotenv").config();

const express = require("express");
const cors = require("cors");

const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const documentRoutes = require("./routes/documentRoutes");
const summaryRoutes = require("./routes/summaryRoutes");
const chatRoutes = require("./routes/chatRoutes");
const knowledgeRoutes = require("./routes/knowledgeRoutes");
const activityRoutes = require("./routes/activityRoutes");
const automationRoutes = require("./routes/automationRoutes");
const securityRoutes = require("./routes/securityRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const { rateLimit } = require("./middleware/rateLimitMiddleware");

// Connect MongoDB
connectDB();

const app = express();

// Frontend URLs allowed to access this API
const allowedOrigins = [
  "http://localhost:5173",
  "https://jade-klepon-08bba1.netlify.app",
  "https://autoflow-ai-vishal.netlify.app",
  process.env.CLIENT_URL,
].filter(Boolean);

// CORS middleware
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow Postman, server-to-server requests and approved frontends
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Request body middleware
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/api", rateLimit({ windowMs: 60_000, max: 180 }));
app.use("/api/auth", rateLimit({ windowMs: 15 * 60_000, max: 30, message: "Too many authentication attempts. Try again later." }));

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/summary", summaryRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/knowledge", knowledgeRoutes);
app.use("/api/activity", activityRoutes);
app.use("/api/automation", automationRoutes);
app.use("/api/security", securityRoutes);
app.use("/api/notifications", notificationRoutes);

// Health check
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "AutoFlow AI Automation API Running",
  });
});

// Unknown route
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API route not found",
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error("Server Error:", error.message);

  res.status(500).json({
    success: false,
    message: error.message || "Internal server error",
  });
});

// Render automatically provides PORT
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
