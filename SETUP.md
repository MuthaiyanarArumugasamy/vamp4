# Vamp4 — Getting this live for real

## What you have
- `Vamp4Home.jsx` — the frontend (React)
- `backend/` — a real Node/Express server: signup/login, course catalog, and
  real PayPal payment capture, backed by a SQLite database file it creates itself.

## 1. Get real PayPal credentials
1. Go to https://developer.paypal.com and log in with your PayPal **Business** account.
2. Dashboard → Apps & Credentials.
3. Start in **Sandbox** mode to test with fake money — create a Sandbox app, copy its
   Client ID and Secret.
4. When ready to accept real payments, switch the toggle to **Live**, create a Live
   app, and copy those credentials instead.

## 2. Run the backend
```bash
cd backend
npm install
cp .env.example .env
# open .env and paste in your real PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, and a random JWT_SECRET
npm start
```
It starts on `http://localhost:4000`. `PAYPAL_MODE=sandbox` in `.env` until you're ready to go live.

## 3. Connect the frontend
In `Vamp4Home.jsx`:
- Set `API_BASE` to wherever you deploy the backend (e.g. `https://api.vamp4.com/api`).
- Set `PAYPAL_CLIENT_ID` to the **same Client ID** from step 1 (this one is public —
  safe to put in frontend code. The Secret never goes in frontend code, ever).

## 4. Deploy it for real
- **Backend**: Render, Railway, or a small VPS (all support Node). Set the same
  environment variables from `.env` in their dashboard — don't upload your `.env` file.
- **Frontend**: Vercel, Netlify, or any static host, pointed at your domain vamp4.com.
- **HTTPS**: required by PayPal for live payments — Vercel/Netlify/Render give you
  this automatically.
- **Database**: SQLite (what's included) is fine to start. At real scale, swap it
  for hosted Postgres (Render/Railway/Supabase all offer this) — the query style
  in `db.js` is close enough to migrate without a rewrite.

## How the payment flow actually works
1. User clicks Enroll → frontend asks *your* backend to create a PayPal order.
2. Your backend looks up the **real price from the database** (never trusts a
   price sent from the browser) and asks PayPal to create the order.
3. User approves payment in the PayPal popup.
4. Frontend tells your backend the order was approved → backend captures the
   funds directly with PayPal and only *then* marks the enrollment as paid.

This order matters: it's what stops someone from faking a "success" message in
their browser and getting a free course.

## Still to build out
- Course *content* pages (video/text lessons) — placeholder catalog only for now.
- PDF Toolkit backend (needs a library like pdf-lib wired into `backend/`).
- AI Study Assistant (needs your own LLM API key added server-side).
- Password reset / email verification flow.
- Making the first admin account (currently: sign up normally, then update that
  user's `role` to `'admin'` directly in the SQLite database).

## What's now real and connected
- **Courses** — catalog, real PayPal checkout, admin can add courses via API.
- **Exam & interview Q&A bank** — real categories and questions from the database,
  filterable, admin can add questions via API.
- **Job board** — employers (choose that role at signup) can post jobs; anyone
  logged in can apply; employers can see who applied.
- **Image compressor** — genuinely works in the browser right now, no backend needed.
- **Auth** — one shared login across every section (courses, jobs, exam bank).
