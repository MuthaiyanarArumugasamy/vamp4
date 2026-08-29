import Database from "better-sqlite3";

const db = new Database("vamp4.db");
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'student', -- student | employer | admin
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    price REAL NOT NULL,
    description TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS enrollments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    course_id INTEGER NOT NULL,
    paypal_order_id TEXT,
    amount_paid REAL,
    status TEXT DEFAULT 'pending', -- pending | paid | failed
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (course_id) REFERENCES courses(id)
  );

  CREATE TABLE IF NOT EXISTS jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employer_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    company TEXT,
    location TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employer_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS job_applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (job_id) REFERENCES jobs(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS exam_questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

// Seed a few sample courses if the table is empty (safe to run every start)
const count = db.prepare("SELECT COUNT(*) AS n FROM courses").get().n;
if (count === 0) {
  const insert = db.prepare(
    "INSERT INTO courses (title, category, price, description) VALUES (?, ?, ?, ?)"
  );
  const seed = [
    ["AI & Machine Learning Foundations", "Artificial Intelligence", 49.99, "Core ML concepts, hands-on projects."],
    ["Data Science with Python", "Data Science", 44.99, "Pandas, visualization, real datasets."],
    ["Ethical Hacking & Cyber Security", "Cyber Security", 54.99, "Network security, pentesting basics."],
    ["Full-Stack Web Development", "Web Development", 39.99, "React, Node, databases, deployment."],
    ["Spoken English — Fluency Course", "Spoken English", 19.99, "Conversational practice and grammar."],
    ["UI/UX Design Masterclass", "UI / UX Design", 34.99, "Figma, design systems, user research."]
  ];
  for (const c of seed) insert.run(...c);
}

const examCount = db.prepare("SELECT COUNT(*) AS n FROM exam_questions").get().n;
if (examCount === 0) {
  const insertQ = db.prepare(
    "INSERT INTO exam_questions (category, question, answer) VALUES (?, ?, ?)"
  );
  const questions = [
    ["Software Interview Q&A", "What is the difference between a process and a thread?", "A process is an independently executing program with its own memory space; a thread is a lightweight unit within a process that shares memory with other threads in the same process."],
    ["Software Interview Q&A", "Explain the difference between == and === in JavaScript.", "== compares values after type coercion; === compares both value and type without coercion."],
    ["Data Science Interview Q&A", "What is overfitting?", "When a model learns the training data too closely, including noise, and performs poorly on new, unseen data."],
    ["Cyber Security Interview Q&A", "What is the difference between symmetric and asymmetric encryption?", "Symmetric encryption uses one shared key for both encryption and decryption; asymmetric encryption uses a public/private key pair."],
    ["Government Exams", "What is the fundamental structure of a bicameral legislature?", "A legislative body divided into two separate chambers, typically an upper house and a lower house, each with distinct roles."],
    ["Auditor Exams (Worldwide)", "What is the purpose of an audit trail?", "A chronological record of transactions that allows an auditor to trace financial data back to its source for verification."],
  ];
  for (const q of questions) insertQ.run(...q);
}

export default db;
