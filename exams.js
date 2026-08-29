import { Router } from "express";
import db from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/categories", (req, res) => {
  const rows = db.prepare("SELECT DISTINCT category FROM exam_questions ORDER BY category").all();
  res.json(rows.map((r) => r.category));
});

router.get("/", (req, res) => {
  const { category } = req.query;
  const rows = category
    ? db.prepare("SELECT * FROM exam_questions WHERE category = ? ORDER BY id").all(category)
    : db.prepare("SELECT * FROM exam_questions ORDER BY id LIMIT 50").all();
  res.json(rows);
});

// Admins only — add a new question to the bank
router.post("/", requireAuth, (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Admin access required." });
  const { category, question, answer } = req.body;
  if (!category || !question || !answer) return res.status(400).json({ error: "category, question, and answer are required." });
  const info = db
    .prepare("INSERT INTO exam_questions (category, question, answer) VALUES (?, ?, ?)")
    .run(category, question, answer);
  res.json({ id: info.lastInsertRowid });
});

export default router;
