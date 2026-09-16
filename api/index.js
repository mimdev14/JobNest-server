require("dotenv").config();

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const { connectDB } = require("../config/db");
const authRoutes = require("../routes/authRoutes");
const userRoutes = require("../routes/userRoutes");
const companyRoutes = require("../routes/companyRoutes");
const jobRoutes = require("../routes/jobRoutes");
const applicationRoutes = require("../routes/applicationRoutes");
const savedJobRoutes = require("../routes/savedJobRoutes");
const statsRoutes = require("../routes/statsRoutes");

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));

let dbReady;
app.use(async (req, res, next) => {
  if (!dbReady) dbReady = connectDB();
  await dbReady;
  next();
});

app.get("/", (req, res) => res.send("JobNest API is running"));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/saved-jobs", savedJobRoutes);
app.use("/api/stats", statsRoutes);

module.exports = app;