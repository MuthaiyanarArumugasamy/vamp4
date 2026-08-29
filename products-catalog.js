// backend/products.js
//
// Server-side product catalog. This is the SINGLE SOURCE OF TRUTH for
// prices. The frontend may display a price, but the backend never
// trusts it — every PayPal order is created using the price looked up
// here, by id, on the server.

import db from "./db.js";

// Run once at startup to make sure the table + seed rows exist.
export function ensureProductsTable() {
  db.prepare(
    `CREATE TABLE IF NOT EXISTS products (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       name TEXT NOT NULL,
       price_inr REAL NOT NULL,
       active INTEGER NOT NULL DEFAULT 1
     )`
  ).run();

  const { count } = db.prepare("SELECT COUNT(*) AS count FROM products").get();

  if (count === 0) {
    const insert = db.prepare(
      "INSERT INTO products (name, price_inr) VALUES (?, ?)"
    );
    const seed = [
      ["AI Interview Guide", 299],
      ["Data Science Course", 1999],
      ["CV Templates", 199],
      ["Developer Resources", 499],
    ];
    const insertMany = db.transaction((rows) => {
      for (const row of rows) insert.run(...row);
    });
    insertMany(seed);
  }
}

export function getActiveProduct(id) {
  return db
    .prepare("SELECT * FROM products WHERE id = ? AND active = 1")
    .get(id);
}
