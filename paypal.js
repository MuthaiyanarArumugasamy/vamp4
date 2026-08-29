import { Router } from "express";
import db from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

const PAYPAL_BASE =
  process.env.PAYPAL_MODE === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

// Get an OAuth access token from PayPal using your Client ID + Secret
async function getAccessToken() {
  const auth = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
  ).toString("base64");

  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) throw new Error("Could not authenticate with PayPal. Check your credentials.");
  const data = await res.json();
  return data.access_token;
}

// STEP 1 — Frontend calls this when the user clicks "Enroll".
// We look up the REAL price server-side (never trust a price sent from the browser)
// and ask PayPal to create an order for that exact amount.
router.post("/create-order", requireAuth, async (req, res) => {
  try {
    const { courseId } = req.body;
    const course = db.prepare("SELECT * FROM courses WHERE id = ?").get(courseId);
    if (!course) return res.status(404).json({ error: "Course not found." });

    const accessToken = await getAccessToken();
    const orderRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            reference_id: `course_${course.id}`,
            description: course.title,
            amount: { currency_code: "USD", value: course.price.toFixed(2) },
          },
        ],
      }),
    });

    const order = await orderRes.json();
    if (!orderRes.ok) return res.status(500).json({ error: "PayPal order creation failed." });

    // Record a pending enrollment so we can reconcile it after capture
    db.prepare(
      "INSERT INTO enrollments (user_id, course_id, paypal_order_id, amount_paid, status) VALUES (?, ?, ?, ?, 'pending')"
    ).run(req.user.id, course.id, order.id, course.price);

    res.json({ orderID: order.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// STEP 2 — Frontend calls this after the user approves payment in the PayPal popup.
// We capture the funds server-side and only THEN mark the enrollment as paid.
router.post("/capture-order", requireAuth, async (req, res) => {
  try {
    const { orderID } = req.body;
    const accessToken = await getAccessToken();

    const captureRes = await fetch(
      `${PAYPAL_BASE}/v2/checkout/orders/${orderID}/capture`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    const capture = await captureRes.json();

    if (!captureRes.ok || capture.status !== "COMPLETED") {
      db.prepare("UPDATE enrollments SET status = 'failed' WHERE paypal_order_id = ?").run(orderID);
      return res.status(400).json({ error: "Payment was not completed." });
    }

    db.prepare("UPDATE enrollments SET status = 'paid' WHERE paypal_order_id = ?").run(orderID);
    res.json({ status: "paid" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
