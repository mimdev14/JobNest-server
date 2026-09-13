const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
require("dotenv").config();

const { connectDB } = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const companyRoutes = require("./routes/companyRoutes");
const jobRoutes = require("./routes/jobRoutes");
const applicationRoutes = require("./routes/applicationRoutes");
const savedJobRoutes = require("./routes/savedJobRoutes");

const app = express();
const port = process.env.PORT || 5000;

app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
  app.use("/api/companies", companyRoutes);
  app.use("/api/jobs", jobRoutes);
    app.use("/api/applications", applicationRoutes);
  app.use("/api/saved-jobs", savedJobRoutes);

app.get("/", (req, res) => {
  res.send("JobNest API is running");
});

connectDB().then(() => {
  app.use("/api/auth", authRoutes);

  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
});