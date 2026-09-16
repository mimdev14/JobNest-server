const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { collections } = require("./config/db");

async function handleStripeWebhook(req, res) {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const { userId, category, planKey } = session.metadata;

        await collections.subscriptions().updateOne(
          { userId },
          {
            $set: {
              userId, category, plan: planKey,
              stripeCustomerId: session.customer,
              stripeSubscriptionId: session.subscription,
              status: "active",
              updatedAt: new Date(),
            },
            $setOnInsert: { createdAt: new Date() },
          },
          { upsert: true }
        );

        if (category === "seeker") {
          await collections.users().updateOne({ authUserId: userId }, { $set: { isPremium: true } });
        }

        await collections.payments().insertOne({
          userEmail: session.customer_email,
          userId,
          amount: session.amount_total / 100,
          transactionId: session.id,
          paymentStatus: "success",
          plan: planKey,
          paidAt: new Date(),
        });
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        await collections.subscriptions().updateOne(
          { stripeCustomerId: invoice.customer },
          { $set: { status: "past_due", updatedAt: new Date() } }
        );
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        await collections.subscriptions().updateOne(
          { stripeSubscriptionId: subscription.id },
          { $set: { status: "cancelled", plan: "free", updatedAt: new Date() } }
        );
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object;
        if (subscription.status === "active") {
          await collections.subscriptions().updateOne(
            { stripeSubscriptionId: subscription.id },
            { $set: { status: "active", updatedAt: new Date() } }
          );
        }
        break;
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error("Webhook handler error:", err);
    res.status(500).json({ error: "Webhook handler failed" });
  }
}

module.exports = { handleStripeWebhook };