import { Router } from "express";
import db from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/", (req, res) => {
  const rows = db
    .prepare(
      `SELECT jobs.*, users.name AS employer_name FROM jobs
       JOIN users ON users.id = jobs.employer_id
       ORDER BY jobs.created_at DESC`
    )
    .all();
  res.json(rows);
});

// Employers only — post a job
router.post("/", requireAuth, (req, res) => {
  if (req.user.role !== "employer") return res.status(403).json({ error: "Only employer accounts can post jobs." });
  const { title, description, company, location } = req.body;
  if (!title || !company) return res.status(400).json({ error: "Title and company are required." });
  const info = db
    .prepare("INSERT INTO jobs (employer_id, title, description, company, location) VALUES (?, ?, ?, ?, ?)")
    .run(req.user.id, title, description || "", company, location || "");
  res.json({ id: info.lastInsertRowid });
});

// Job seekers — apply to a job
router.post("/:id/apply", requireAuth, (req, res) => {
  const job = db.prepare("SELECT * FROM jobs WHERE id = ?").get(req.params.id);
  if (!job) return res.status(404).json({ error: "Job not found." });

  const existing = db
    .prepare("SELECT id FROM job_applications WHERE job_id = ? AND user_id = ?")
    .get(job.id, req.user.id);
  if (existing) return res.status(409).json({ error: "You already applied to this job." });

  db.prepare("INSERT INTO job_applications (job_id, user_id) VALUES (?, ?)").run(job.id, req.user.id);
  res.json({ status: "applied" });
});

// Employer — see who applied to their job postings
router.get("/:id/applicants", requireAuth, (req, res) => {
  const job = db.prepare("SELECT * FROM jobs WHERE id = ?").get(req.params.id);
  if (!job) return res.status(404).json({ error: "Job not found." });
  if (job.employer_id !== req.user.id) return res.status(403).json({ error: "Not your job posting." });

  const rows = db
    .prepare(
      `SELECT users.id, users.name, users.email, job_applications.created_at AS applied_at
       FROM job_applications JOIN users ON users.id = job_applications.user_id
       WHERE job_applications.job_id = ?`
    )
    .all(job.id);
  res.json(rows);
});

export default router;
