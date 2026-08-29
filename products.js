import { Router } from "express";
import db from "../db.js";

const router = Router();

router.get("/", (req, res) => {
  const rows = db
    .prepare("SELECT id, name, price_inr FROM products WHERE active = 1")
    .all();
  res.json(rows);
});

export default router;
