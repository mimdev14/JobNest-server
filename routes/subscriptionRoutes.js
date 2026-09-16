const express = require("express");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { collections } = require("../config/db");
const { authenticateUser } = require("../middleware/authMiddleware");
const { PLANS } = require("../config/plans");

const router = express.Router();

router.get("/me", authenticateUser, async (req, res) => {
  try {
    const sub = await collections.subscriptions().findOne({ userId: req.user.authUserId, status: { $in: ["active", "trialing"] } });
    const category = req.user.role === "RECRUITER" ? "recruiter" : "seeker";
    const planKey = sub?.plan || "free";
    res.json({ success: true, subscription: sub || null, plan: { key: planKey, ...PLANS[category][planKey] } });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch subscription" });
  }
});

router.get("/payments/mine", authenticateUser, async (req, res) => {
  try {
    const payments = await collections.payments().find({ userId: req.user.authUserId }).sort({ paidAt: -1 }).toArray();
    res.json({ success: true, payments });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch payments" });
  }
});

router.post("/checkout", authenticateUser, async (req, res) => {
  try {
    const { planKey } = req.body;
    const category = req.user.role === "RECRUITER" ? "recruiter" : "seeker";
    const plan = PLANS[category]?.[planKey];

    if (!plan || plan.price === 0) {
      return res.status(400).json({ success: false, message: "Invalid plan selected" });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency: "usd",
          product_data: { name: `JobNest ${plan.name} Plan (${category})` },
          unit_amount: plan.price * 100,
          recurring: { interval: "month" },
        },
        quantity: 1,
      }],
      customer_email: req.user.email,
      metadata: { userId: req.user.authUserId, category, planKey },
      success_url: `${process.env.CLIENT_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/dashboard/${category}/billing`,
    });

    res.json({ success: true, url: session.url });
  } catch (err) {
    console.error("Checkout error:", err);
    res.status(500).json({ success: false, message: "Failed to start checkout" });
  }
});

module.exports = router;