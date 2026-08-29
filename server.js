import "dotenv/config";
import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.js";
import courseRoutes from "./routes/courses.js";
import paypalRoutes from "./routes/paypal.js";
import examRoutes from "./routes/exams.js";
import jobRoutes from "./routes/jobs.js";

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || "*" }));
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/paypal", paypalRoutes);
app.use("/api/exams", examRoutes);
app.use("/api/jobs", jobRoutes);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Vamp4 backend running on http://localhost:${PORT}`);
  console.log(`PayPal mode: ${process.env.PAYPAL_MODE || "sandbox"}`);
});
