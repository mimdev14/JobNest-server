const express = require("express");
const { ObjectId } = require("mongodb");
const { collections } = require("../config/db");
const { authenticateUser } = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleMiddleware");

const router = express.Router();

// GET /api/companies — public, approved only
router.get("/", async (req, res) => {
  try {
    const companies = await collections.companies().find({ status: "approved" }).sort({ createdAt: -1 }).toArray();
    res.json({ success: true, companies });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch companies" });
  }
});

// GET /api/companies/mine — recruiter's own company
router.get("/mine", authenticateUser, requireRole("RECRUITER"), async (req, res) => {
  try {
    const company = await collections.companies().findOne({ ownerId: req.user.authUserId });
    res.json({ success: true, company: company || null });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch company" });
  }
});

// GET /api/companies/:id — public
router.get("/:id", async (req, res) => {
  try {
    const company = await collections.companies().findOne({ _id: new ObjectId(req.params.id) });
    if (!company) return res.status(404).json({ success: false, message: "Company not found" });
    res.json({ success: true, company });
  } catch (err) {
    res.status(400).json({ success: false, message: "Invalid company id" });
  }
});

// POST /api/companies — recruiter creates/resubmits
router.post("/", authenticateUser, requireRole("RECRUITER"), async (req, res) => {
  try {
    const { name, industry, website, location, employeeCount, logo, description } = req.body;
    if (!name || !industry || !location) {
      return res.status(400).json({ success: false, message: "Name, industry, and location are required" });
    }

    const existing = await collections.companies().findOne({ ownerId: req.user.authUserId });
    if (existing) {
      return res.status(400).json({ success: false, message: "You already have a company profile" });
    }

    const company = {
      ownerId: req.user.authUserId,
      name, industry, website: website || "", location,
      employeeCount: employeeCount || "", logo: logo || "", description: description || "",
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await collections.companies().insertOne(company);
    res.status(201).json({ success: true, company: { ...company, _id: result.insertedId } });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to create company" });
  }
});

// PATCH /api/companies/mine — recruiter edits their company
router.patch("/mine", authenticateUser, requireRole("RECRUITER"), async (req, res) => {
  try {
    const { name, industry, website, location, employeeCount, logo, description } = req.body;
    const update = {
      ...(name && { name }), ...(industry && { industry }), ...(website !== undefined && { website }),
      ...(location && { location }), ...(employeeCount !== undefined && { employeeCount }),
      ...(logo !== undefined && { logo }), ...(description !== undefined && { description }),
      updatedAt: new Date(),
    };

    await collections.companies().updateOne({ ownerId: req.user.authUserId }, { $set: update });
    res.json({ success: true, message: "Company updated" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to update company" });
  }
});

// --- Admin ---

router.get("/admin/all", authenticateUser, requireRole("ADMIN"), async (req, res) => {
  try {
    const companies = await collections.companies().find({}).sort({ createdAt: -1 }).toArray();
    res.json({ success: true, companies });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch companies" });
  }
});

router.patch("/admin/:id/approve", authenticateUser, requireRole("ADMIN"), async (req, res) => {
  try {
    await collections.companies().updateOne({ _id: new ObjectId(req.params.id) }, { $set: { status: "approved" } });
    res.json({ success: true, message: "Company approved" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to approve company" });
  }
});

router.patch("/admin/:id/reject", authenticateUser, requireRole("ADMIN"), async (req, res) => {
  try {
    await collections.companies().updateOne({ _id: new ObjectId(req.params.id) }, { $set: { status: "rejected" } });
    res.json({ success: true, message: "Company rejected" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to reject company" });
  }
});

router.patch("/admin/:id/suspend", authenticateUser, requireRole("ADMIN"), async (req, res) => {
  try {
    await collections.companies().updateOne({ _id: new ObjectId(req.params.id) }, { $set: { status: "suspended" } });
    res.json({ success: true, message: "Company suspended" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to suspend company" });
  }
});

module.exports = router;