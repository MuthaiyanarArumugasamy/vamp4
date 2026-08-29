// backend/routes/orders.js
//
// Real PayPal order flow:
//   1. POST /api/orders            -> look up real price server-side,
//                                      ask PayPal to create an order,
//                                      return the PayPal order id.
//   2. POST /api/orders/:id/capture -> capture funds with PayPal,
//                                      THEN mark the order paid in our DB.
//
// The browser never gets to say what the price is. It only ever sends
// a product id.

import { Router } from "express";
import db from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { getActiveProduct } from "../products.js";

const router = Router();

const PAYPAL_MODE = process.env.PAYPAL_MODE === "live" ? "live" : "sandbox";
const PAYPAL_API_BASE =
  PAYPAL_MODE === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

// Make sure the orders table exists.
db.prepare(
  `CREATE TABLE IF NOT EXISTS orders (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     user_id INTEGER NOT NULL,
     product_id INTEGER NOT NULL,
     amount_inr REAL NOT NULL,
     paypal_order_id TEXT NOT NULL UNIQUE,
     status TEXT NOT NULL DEFAULT 'created',
     created_at TEXT NOT NULL DEFAULT (datetime('now')),
     captured_at TEXT,
     FOREIGN KEY (user_id) REFERENCES users(id),
     FOREIGN KEY (product_id) REFERENCES products(id)
   )`
).run();

// ---- PayPal REST helpers -------------------------------------------------

async function getPayPalAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !secret) {
    throw new Error(
      "PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET are not set in .env"
    );
  }

  const basicAuth = Buffer.from(`${clientId}:${secret}`).toString("base64");

  const res = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PayPal auth failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  return data.access_token;
}

async function paypalCreateOrder(accessToken, amountInr) {
  const res = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: "INR",
            value: amountInr.toFixed(2),
          },
        },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PayPal create order failed (${res.status}): ${text}`);
  }

  return res.json();
}

async function paypalCaptureOrder(accessToken, paypalOrderId) {
  const res = await fetch(
    `${PAYPAL_API_BASE}/v2/checkout/orders/${paypalOrderId}/capture`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PayPal capture failed (${res.status}): ${text}`);
  }

  return res.json();
}

// ---- Routes ---------------------------------------------------------------

// Create a PayPal order for a product. Frontend sends only { productId }.
router.post("/", requireAuth, async (req, res) => {
  try {
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({ error: "productId is required." });
    }

    const product = getActiveProduct(productId);

    if (!product) {
      return res.status(404).json({ error: "Product not found." });
    }

    const accessToken = await getPayPalAccessToken();
    const paypalOrder = await paypalCreateOrder(accessToken, product.price_inr);

    db.prepare(
      `INSERT INTO orders (user_id, product_id, amount_inr, paypal_order_id, status)
       VALUES (?, ?, ?, ?, 'created')`
    ).run(req.user.id, product.id, product.price_inr, paypalOrder.id);

    res.json({ paypalOrderId: paypalOrder.id });
  } catch (err) {
    console.error("Create order error:", err);
    res.status(500).json({ error: "Could not create PayPal order." });
  }
});

// Capture funds after the user approves in the PayPal popup.
router.post("/:paypalOrderId/capture", requireAuth, async (req, res) => {
  try {
    const { paypalOrderId } = req.params;

    const order = db
      .prepare(
        "SELECT * FROM orders WHERE paypal_order_id = ? AND user_id = ?"
      )
      .get(paypalOrderId, req.user.id);

    if (!order) {
      return res.status(404).json({ error: "Order not found." });
    }

    if (order.status === "paid") {
      return res.json({ status: "already_captured" });
    }

    const accessToken = await getPayPalAccessToken();
    const captureResult = await paypalCaptureOrder(accessToken, paypalOrderId);

    const captureStatus = captureResult.status; // expect "COMPLETED"

    if (captureStatus !== "COMPLETED") {
      db.prepare("UPDATE orders SET status = ? WHERE id = ?").run(
        "failed",
        order.id
      );
      return res.status(402).json({ error: "Payment was not completed." });
    }

    db.prepare(
      `UPDATE orders SET status = 'paid', captured_at = datetime('now') WHERE id = ?`
    ).run(order.id);

    res.json({ status: "paid" });
  } catch (err) {
    console.error("Capture order error:", err);
    res.status(500).json({ error: "Could not capture PayPal order." });
  }
});

export default router;
