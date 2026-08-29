import { Router } from "express";
import db from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/", (req, res) => {
  const courses = db.prepare("SELECT * FROM courses ORDER BY id").all();
  res.json(courses);
});

// Admins only — add a new course to the catalog
router.post("/", requireAuth, (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Admin access required." });
  const { title, category, price, description } = req.body;
  if (!title || !category || price == null) {
    return res.status(400).json({ error: "title, category, and price are required." });
  }
  const info = db
    .prepare("INSERT INTO courses (title, category, price, description) VALUES (?, ?, ?, ?)")
    .run(title, category, Number(price), description || "");
  res.json({ id: info.lastInsertRowid });
});

// A logged-in user's own enrollments (proof of what they've actually paid for)
router.get("/my-enrollments", requireAuth, (req, res) => {
  const rows = db
    .prepare(
      `SELECT e.*, c.title, c.category FROM enrollments e
       JOIN courses c ON c.id = e.course_id
       WHERE e.user_id = ? ORDER BY e.created_at DESC`
    )
    .all(req.user.id);
  res.json(rows);
});

export default router;
