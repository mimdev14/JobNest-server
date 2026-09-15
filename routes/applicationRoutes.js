const express = require("express");
const { ObjectId } = require("mongodb");
const { collections } = require("../config/db");
const { authenticateUser } = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleMiddleware");

const router = express.Router();

// POST /api/applications — seeker applies
router.post("/", authenticateUser, requireRole("SEEKER"), async (req, res) => {
  try {
    const { jobId, coverLetter, resumeUrl } = req.body;
    if (!jobId) return res.status(400).json({ success: false, message: "jobId is required" });

    const job = await collections.jobs().findOne({ _id: new ObjectId(jobId) });
    if (!job || job.status !== "active") {
      return res.status(400).json({ success: false, message: "This job is not accepting applications" });
    }

    const existing = await collections.applications().findOne({ jobId, seekerId: req.user.authUserId });
    if (existing) return res.status(400).json({ success: false, message: "You already applied to this job" });

    const application = {
      jobId, jobTitle: job.title, companyName: job.companyName, recruiterId: job.recruiterId,
      seekerId: req.user.authUserId, seekerName: req.user.name, seekerEmail: req.user.email,
      resumeUrl: resumeUrl || req.user.profile?.resumeUrl || "",
      coverLetter: coverLetter || "",
      status: "applied",
      notes: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await collections.applications().insertOne(application);
    await collections.jobs().updateOne({ _id: job._id }, { $inc: { applicationsCount: 1 } });

    res.status(201).json({ success: true, application: { ...application, _id: result.insertedId } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to submit application" });
  }
});

// GET /api/applications/mine — seeker's applications
router.get("/mine", authenticateUser, requireRole("SEEKER"), async (req, res) => {
  try {
    const applications = await collections.applications().find({ seekerId: req.user.authUserId }).sort({ createdAt: -1 }).toArray();
    res.json({ success: true, applications });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch applications" });
  }
});

// PATCH /api/applications/:id/withdraw — seeker withdraws
router.patch("/:id/withdraw", authenticateUser, requireRole("SEEKER"), async (req, res) => {
  try {
    const application = await collections.applications().findOne({ _id: new ObjectId(req.params.id) });
    if (!application) return res.status(404).json({ success: false, message: "Application not found" });
    if (application.seekerId !== req.user.authUserId) return res.status(403).json({ success: false, message: "Not your application" });

    await collections.applications().updateOne({ _id: application._id }, { $set: { status: "withdrawn", updatedAt: new Date() } });
    res.json({ success: true, message: "Application withdrawn" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to withdraw application" });
  }
});

// GET /api/applications/job/:jobId — recruiter views applicants for a job
router.get("/job/:jobId", authenticateUser, requireRole("RECRUITER"), async (req, res) => {
  try {
    const job = await collections.jobs().findOne({ _id: new ObjectId(req.params.jobId) });
    if (!job) return res.status(404).json({ success: false, message: "Job not found" });
    if (job.recruiterId !== req.user.authUserId) return res.status(403).json({ success: false, message: "Not your job" });

    const applications = await collections.applications().find({ jobId: req.params.jobId }).sort({ createdAt: -1 }).toArray();
    res.json({ success: true, applications, job });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch applicants" });
  }
});

// PATCH /api/applications/:id/status — recruiter changes status
router.patch("/:id/status", authenticateUser, requireRole("RECRUITER"), async (req, res) => {
  try {
    const { status } = req.body; // under_review | shortlisted | offered | rejected | hired
    const application = await collections.applications().findOne({ _id: new ObjectId(req.params.id) });
    if (!application) return res.status(404).json({ success: false, message: "Application not found" });
    if (application.recruiterId !== req.user.authUserId) return res.status(403).json({ success: false, message: "Not your job's application" });

    await collections.applications().updateOne({ _id: application._id }, { $set: { status, updatedAt: new Date() } });
    res.json({ success: true, message: `Application marked as ${status}` });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to update status" });
  }
});

// POST /api/applications/:id/notes — recruiter adds private note
router.post("/:id/notes", authenticateUser, requireRole("RECRUITER"), async (req, res) => {
  try {
    const { note } = req.body;
    const application = await collections.applications().findOne({ _id: new ObjectId(req.params.id) });
    if (!application) return res.status(404).json({ success: false, message: "Application not found" });
    if (application.recruiterId !== req.user.authUserId) return res.status(403).json({ success: false, message: "Not your job's application" });

    await collections.applications().updateOne(
      { _id: application._id },
      { $push: { notes: { text: note, createdAt: new Date() } } }
    );
    res.json({ success: true, message: "Note added" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to add note" });
  }
});
// GET /api/applications/pipeline — all applications across recruiter's jobs, for Kanban view
router.get("/pipeline", authenticateUser, requireRole("RECRUITER"), async (req, res) => {
  try {
    const { jobId } = req.query;
    const query = { recruiterId: req.user.authUserId };
    if (jobId) query.jobId = jobId;

    const applications = await collections.applications().find(query).sort({ createdAt: -1 }).toArray();
    const jobs = await collections.jobs().find({ recruiterId: req.user.authUserId }).toArray();

    res.json({ success: true, applications, jobs });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch pipeline" });
  }
});
module.exports = router;