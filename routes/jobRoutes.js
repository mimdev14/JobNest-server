const express = require("express");
const { ObjectId } = require("mongodb");
const { collections } = require("../config/db");
const { authenticateUser } = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleMiddleware");

const router = express.Router();

// GET /api/jobs — public search/filter/sort/paginate
router.get("/", async (req, res) => {
  try {
    const {
      keyword, category, location, type, experienceLevel, remote,
      minSalary, maxSalary, sort = "newest", page = 1, limit = 12,
    } = req.query;

    const query = { status: "active" };
    if (keyword) query.$or = [
      { title: { $regex: keyword, $options: "i" } },
      { description: { $regex: keyword, $options: "i" } },
    ];
    if (category) query.category = category;
    if (location) query.location = { $regex: location, $options: "i" };
    if (type) query.type = type;
    if (experienceLevel) query.experienceLevel = experienceLevel;
    if (remote) query.remote = remote;
    if (minSalary || maxSalary) {
      query.salary = {};
      if (minSalary) query.salary.$gte = Number(minSalary);
      if (maxSalary) query.salary.$lte = Number(maxSalary);
    }

    const sortMap = {
      newest: { createdAt: -1 },
      salary_high: { salary: -1 },
      salary_low: { salary: 1 },
    };

    const skip = (Number(page) - 1) * Number(limit);
    const collection = collections.jobs();

    const [jobs, total] = await Promise.all([
      collection.find(query).sort(sortMap[sort] || sortMap.newest).skip(skip).limit(Number(limit)).toArray(),
      collection.countDocuments(query),
    ]);

    res.json({ success: true, jobs, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to fetch jobs" });
  }
});

// GET /api/jobs/featured — for home page
router.get("/featured", async (req, res) => {
  try {
    const jobs = await collections.jobs().find({ status: "active" }).sort({ createdAt: -1 }).limit(6).toArray();
    res.json({ success: true, jobs });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch featured jobs" });
  }
});

// GET /api/jobs/mine — recruiter's own jobs
router.get("/mine", authenticateUser, requireRole("RECRUITER"), async (req, res) => {
  try {
    const jobs = await collections.jobs().find({ recruiterId: req.user.authUserId }).sort({ createdAt: -1 }).toArray();
    res.json({ success: true, jobs });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch your jobs" });
  }
});

// GET /api/jobs/:id — public, with similar jobs
router.get("/:id", async (req, res) => {
  try {
    const job = await collections.jobs().findOne({ _id: new ObjectId(req.params.id) });
    if (!job) return res.status(404).json({ success: false, message: "Job not found" });

    const similarJobs = await collections.jobs()
      .find({ _id: { $ne: job._id }, category: job.category, status: "active" })
      .limit(4).toArray();

    // increment view count (fire and forget)
    collections.jobs().updateOne({ _id: job._id }, { $inc: { views: 1 } }).catch(() => {});

    res.json({ success: true, job, similarJobs });
  } catch (err) {
    res.status(400).json({ success: false, message: "Invalid job id" });
  }
});

// POST /api/jobs — recruiter creates (draft by default)
router.post("/", authenticateUser, requireRole("RECRUITER"), async (req, res) => {
  try {
    const company = await collections.companies().findOne({ ownerId: req.user.authUserId });
    if (!company) {
      return res.status(400).json({ success: false, message: "Create a company profile before posting jobs" });
    }

    const {
      title, category, type, experienceLevel, salary, currency, location, remote,
      deadline, description, responsibilities, requirements, benefits, publish,
    } = req.body;

    if (!title || !category || !type || !location) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    if (publish && company.status !== "approved") {
      return res.status(403).json({ success: false, message: "Your company must be approved before publishing jobs" });
    }

    const job = {
      title, category, type, experienceLevel: experienceLevel || "", salary: Number(salary) || 0,
      currency: currency || "USD", location, remote: remote || "on-site",
      deadline: deadline || null, description: description || "", responsibilities: responsibilities || "",
      requirements: requirements || "", benefits: benefits || "",
      recruiterId: req.user.authUserId,
      companyId: company._id.toString(),
      companyName: company.name,
      companyLogo: company.logo,
      status: publish ? "active" : "draft",
      views: 0,
      applicationsCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await collections.jobs().insertOne(job);
    res.status(201).json({ success: true, job: { ...job, _id: result.insertedId } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to create job" });
  }
});

// PATCH /api/jobs/:id — owner only, edit fields
router.patch("/:id", authenticateUser, requireRole("RECRUITER"), async (req, res) => {
  try {
    const job = await collections.jobs().findOne({ _id: new ObjectId(req.params.id) });
    if (!job) return res.status(404).json({ success: false, message: "Job not found" });
    if (job.recruiterId !== req.user.authUserId) return res.status(403).json({ success: false, message: "Not your job" });

    const {
      title, category, type, experienceLevel, salary, currency, location, remote,
      deadline, description, responsibilities, requirements, benefits,
    } = req.body;

    const update = {
      ...(title && { title }), ...(category && { category }), ...(type && { type }),
      ...(experienceLevel !== undefined && { experienceLevel }), ...(salary !== undefined && { salary: Number(salary) }),
      ...(currency && { currency }), ...(location && { location }), ...(remote && { remote }),
      ...(deadline !== undefined && { deadline }), ...(description !== undefined && { description }),
      ...(responsibilities !== undefined && { responsibilities }), ...(requirements !== undefined && { requirements }),
      ...(benefits !== undefined && { benefits }),
      updatedAt: new Date(),
    };

    await collections.jobs().updateOne({ _id: job._id }, { $set: update });
    res.json({ success: true, message: "Job updated" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to update job" });
  }
});

// PATCH /api/jobs/:id/status — publish / close / reopen
router.patch("/:id/status", authenticateUser, requireRole("RECRUITER"), async (req, res) => {
  try {
    const { status } = req.body; // "active" | "closed" | "draft"
    const job = await collections.jobs().findOne({ _id: new ObjectId(req.params.id) });
    if (!job) return res.status(404).json({ success: false, message: "Job not found" });
    if (job.recruiterId !== req.user.authUserId) return res.status(403).json({ success: false, message: "Not your job" });

    if (status === "active") {
      const company = await collections.companies().findOne({ _id: new ObjectId(job.companyId) });
      if (company.status !== "approved") {
        return res.status(403).json({ success: false, message: "Your company must be approved before publishing jobs" });
      }
    }

    await collections.jobs().updateOne({ _id: job._id }, { $set: { status, updatedAt: new Date() } });
    res.json({ success: true, message: `Job ${status}` });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to update job status" });
  }
});

// DELETE /api/jobs/:id
router.delete("/:id", authenticateUser, requireRole("RECRUITER"), async (req, res) => {
  try {
    const job = await collections.jobs().findOne({ _id: new ObjectId(req.params.id) });
    if (!job) return res.status(404).json({ success: false, message: "Job not found" });
    if (job.recruiterId !== req.user.authUserId) return res.status(403).json({ success: false, message: "Not your job" });

    await collections.jobs().deleteOne({ _id: job._id });
    await collections.applications().deleteMany({ jobId: req.params.id });
    await collections.savedJobs().deleteMany({ jobId: req.params.id });
    res.json({ success: true, message: "Job deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to delete job" });
  }
});

// --- Admin ---

router.get("/admin/all", authenticateUser, requireRole("ADMIN"), async (req, res) => {
  try {
    const jobs = await collections.jobs().find({}).sort({ createdAt: -1 }).toArray();
    res.json({ success: true, jobs });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch jobs" });
  }
});

router.delete("/admin/:id", authenticateUser, requireRole("ADMIN"), async (req, res) => {
  try {
    await collections.jobs().deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ success: true, message: "Job removed" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to remove job" });
  }
});

module.exports = router;