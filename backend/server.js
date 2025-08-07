const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");

dotenv.config(); // Load .env
const fs = require("fs");
const uploadsDir = "./uploads";
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

const app = express();

// Connect to MongoDB
connectDB();

// Middlewares
app.use(
  cors({
    origin: ["http://localhost:3000"], // React dev server
    credentials: true,
  })
);
app.use(express.json()); // To parse JSON body

app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Health check route (for now)
app.get("/", (req, res) => {
  res.send("Autonomous Generator Backend is Running");
});

const uploadRoute = require("./routes/uploadRoute");
app.use("/api/upload", uploadRoute);

const questionRoutes = require("./routes/questionRoutes");
app.use("/api/questions", questionRoutes);

const blueprintRoutes = require("./routes/blueprintRoutes");
app.use("/api/blueprints", blueprintRoutes);

const paperRoutes = require("./routes/paperRoutes");
app.use("/api/papers", paperRoutes);

const exportsDir = "./exports";
if (!fs.existsSync(exportsDir)) {
  fs.mkdirSync(exportsDir);
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
