// backend/server.js
const path = require("path");
const fs = require("fs");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");

dotenv.config();

const app = express();

// Basic middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure folders exist
const uploadsDir = path.join(__dirname, "uploads");
const exportsDir = path.join(__dirname, "exports");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(exportsDir)) fs.mkdirSync(exportsDir, { recursive: true });

// Routes
const uploadRoutes = require("./routes/uploadRoute");
const questionRoutes = require("./routes/questionRoutes");
// (keep your existing routes if they’re valid CommonJS)
const blueprintRoutes = require("./routes/blueprintRoutes");
const paperRoutes = require("./routes/paperRoutes");

app.use("/api/upload", uploadRoutes);
app.use("/api/questions", questionRoutes);
app.use("/api/blueprints", blueprintRoutes);
app.use("/api/papers", paperRoutes);

// Health check
// app.get("/api/health", (_req, res) =>
//   res.json({ ok: true, env: process.env.NODE_ENV || "development" })
// );

app.get("/", (req, res) => {
  res.send("Autonomous Generator Backend is running ✅");
});

// Start
async function start() {
  try {
    const port = process.env.PORT || 5000;
    await connectDB();
    const server = app.listen(port, () => {
      console.log(`Server listening on http://localhost:${port}`);
    });

    // graceful shutdown
    process.on("SIGINT", () => shutdown("SIGINT", server));
    process.on("SIGTERM", () => shutdown("SIGTERM", server));
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

function shutdown(signal, server) {
  console.log(`Received ${signal}. Shutting down...`);
  server.close(() => {
    mongoose.connection.close(false, () => {
      console.log("MongoDB connection closed.");
      process.exit(0);
    });
  });
}

start();
