const express = require("express");
const { ObjectId } = require("mongodb");
const { collections } = require("../config/db");
const { authenticateUser } = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleMiddleware");

const router = express.Router();

router.get("/admin/all", authenticateUser, requireRole("ADMIN"), async (req, res) => {
  try {
    const users = await collections.users().find({}).sort({ createdAt: -1 }).toArray();
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch users" });
  }
});

router.patch("/admin/:id/role", authenticateUser, requireRole("ADMIN"), async (req, res) => {
  try {
    const { role } = req.body;
    if (!["SEEKER", "RECRUITER", "ADMIN"].includes(role)) {
      return res.status(400).json({ success: false, message: "Invalid role" });
    }
    await collections.users().updateOne({ _id: new ObjectId(req.params.id) }, { $set: { role } });
    res.json({ success: true, message: "Role updated" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to update role" });
  }
});

router.patch("/admin/:id/suspend", authenticateUser, requireRole("ADMIN"), async (req, res) => {
  try {
    const target = await collections.users().findOne({ _id: new ObjectId(req.params.id) });
    if (target.role === "ADMIN") return res.status(403).json({ success: false, message: "Cannot suspend an admin" });

    await collections.users().updateOne({ _id: new ObjectId(req.params.id) }, { $set: { status: "suspended" } });
    res.json({ success: true, message: "User suspended" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to suspend user" });
  }
});

router.patch("/admin/:id/activate", authenticateUser, requireRole("ADMIN"), async (req, res) => {
  try {
    await collections.users().updateOne({ _id: new ObjectId(req.params.id) }, { $set: { status: "active" } });
    res.json({ success: true, message: "User activated" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to activate user" });
  }
});

module.exports = router;