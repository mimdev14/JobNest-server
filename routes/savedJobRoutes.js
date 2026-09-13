const express = require("express");
const { ObjectId } = require("mongodb");
const { collections } = require("../config/db");
const { authenticateUser } = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleMiddleware");

const router = express.Router();

router.post("/:jobId/toggle", authenticateUser, requireRole("SEEKER"), async (req, res) => {
  try {
    const existing = await collections.savedJobs().findOne({ jobId: req.params.jobId, seekerId: req.user.authUserId });
    if (existing) {
      await collections.savedJobs().deleteOne({ _id: existing._id });
      return res.json({ success: true, saved: false });
    }

    const job = await collections.jobs().findOne({ _id: new ObjectId(req.params.jobId) });
    if (!job) return res.status(404).json({ success: false, message: "Job not found" });

    await collections.savedJobs().insertOne({
      jobId: req.params.jobId, seekerId: req.user.authUserId, savedAt: new Date(),
    });
    res.json({ success: true, saved: true });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to update saved job" });
  }
});

router.get("/mine", authenticateUser, requireRole("SEEKER"), async (req, res) => {
  try {
    const saved = await collections.savedJobs().find({ seekerId: req.user.authUserId }).toArray();
    const jobIds = saved.map((s) => new ObjectId(s.jobId));
    const jobs = await collections.jobs().find({ _id: { $in: jobIds } }).toArray();
    res.json({ success: true, jobs });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch saved jobs" });
  }
});

module.exports = router;