import React, { useState } from "react";
import {
  GraduationCap, Brain, ShieldCheck, Code2, Palette, Globe,
  FileText, Image as ImageIcon, Sparkles, Briefcase, BookOpenCheck,
  Landmark, Menu, X, Star, CheckCircle2
} from "lucide-react";

const NAV = [
  { key: "courses", label: "Courses", icon: GraduationCap },
  { key: "exams", label: "Exam Q&A", icon: BookOpenCheck },
  { key: "jobs", label: "Jobs", icon: Briefcase },
  { key: "tools", label: "AI & Tools", icon: Sparkles },
];

const CATEGORIES = [
  { name: "Spoken English", icon: Globe, color: "#16A34A" },
  { name: "Artificial Intelligence", icon: Brain, color: "#16A34A" },
  { name: "Data Science", icon: Sparkles, color: "#0891B2" },
  { name: "Cyber Security", icon: ShieldCheck, color: "#DC2626" },
  { name: "Software Development", icon: Code2, color: "#059669" },
  { name: "UI / UX Design", icon: Palette, color: "#DB2777" },
  { name: "Web Development", icon: Globe, color: "#EA580C" },
  { name: "Auditor & Govt Exams", icon: Landmark, color: "#4338CA" },
];

// These IDs match the seed rows created in backend/db.js — keep them in sync.
const COURSES = [
  { id: 1, title: "AI & Machine Learning Foundations", cat: "Artificial Intelligence", price: 49.99, rating: 4.8, students: "12,400" },
  { id: 2, title: "Data Science with Python", cat: "Data Science", price: 44.99, rating: 4.7, students: "9,850" },
  { id: 3, title: "Ethical Hacking & Cyber Security", cat: "Cyber Security", price: 54.99, rating: 4.9, students: "15,200" },
  { id: 4, title: "Full-Stack Web Development", cat: "Web Development", price: 39.99, rating: 4.6, students: "21,000" },
  { id: 5, title: "Spoken English — Fluency Course", cat: "Spoken English", price: 19.99, rating: 4.7, students: "34,700" },
  { id: 6, title: "UI/UX Design Masterclass", cat: "UI / UX Design", price: 34.99, rating: 4.8, students: "8,300" },
];

const TOOLS = [
  { name: "AI Study Assistant", icon: Brain, desc: "Ask doubts, get explanations, practice questions" },
  { name: "PDF Toolkit", icon: FileText, desc: "Merge, split, compress, convert PDFs" },
  { name: "Image Toolkit", icon: ImageIcon, desc: "Resize, compress, convert, background remove" },
];

// ---- Backend connection ----
// Point this at your deployed backend (see /backend folder). Never put PayPal
// secrets here — only the backend talks to PayPal directly.
const API_BASE = "http://localhost:4000/api";
// Your PayPal LIVE (or sandbox, while testing) Client ID — this one is public/safe to expose.
const PAYPAL_CLIENT_ID = "YOUR_PAYPAL_CLIENT_ID";

function getToken() {
  return localStorage.getItem("vamp4_token");
}

let paypalSdkPromise = null;
function loadPayPalSdk() {
  if (paypalSdkPromise) return paypalSdkPromise;
  paypalSdkPromise = new Promise((resolve, reject) => {
    if (window.paypal) return resolve(window.paypal);
    const script = document.createElement("script");
    script.src = `https://www.paypal.com/sdk/js?client-id=${PAYPAL_CLIENT_ID}&currency=USD`;
    script.onload = () => resolve(window.paypal);
    script.onerror = reject;
    document.body.appendChild(script);
  });
  return paypalSdkPromise;
}

function PayPalButton({ courseId, amount, label, onLoginRequired }) {
  const containerRef = React.useRef(null);
  const [error, setError] = useState(null);
  const [paid, setPaid] = useState(false);

  React.useEffect(() => {
    if (!getToken()) return; // wait for login before rendering real buttons
    let cancelled = false;

    loadPayPalSdk().then((paypal) => {
      if (cancelled || !containerRef.current) return;
      containerRef.current.innerHTML = "";
      paypal
        .Buttons({
          style: { layout: "horizontal", height: 40, tagline: false },
          createOrder: async () => {
            const res = await fetch(`${API_BASE}/paypal/create-order`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${getToken()}`,
              },
              body: JSON.stringify({ courseId }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Could not start checkout.");
            return data.orderID;
          },
          onApprove: async (data) => {
            const res = await fetch(`${API_BASE}/paypal/capture-order`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${getToken()}`,
              },
              body: JSON.stringify({ orderID: data.orderID }),
            });
            const result = await res.json();
            if (!res.ok) return setError(result.error || "Payment could not be completed.");
            setPaid(true);
          },
          onError: () => setError("PayPal checkout failed. Please try again."),
        })
        .render(containerRef.current);
    });

    return () => { cancelled = true; };
  }, [courseId]);

  if (paid) {
    return <div style={{ color: "#16A34A", fontWeight: 600, fontSize: 13 }}>✓ Enrolled — payment confirmed</div>;
  }

  if (!getToken()) {
    return (
      <button
        onClick={onLoginRequired}
        style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #CBD5E1", background: "#fff", color: "#1E293B", fontWeight: 600, fontSize: 14, cursor: "pointer" }}
      >
        Log in to enroll · ${amount}
      </button>
    );
  }

  return (
    <div>
      <div ref={containerRef} />
      {error && <div style={{ color: "#DC2626", fontSize: 12, marginTop: 6 }}>{error}</div>}
    </div>
  );
}

function ImageCompressor() {
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [quality, setQuality] = useState(0.7);
  const [originalSize, setOriginalSize] = useState(0);

  const handleFile = (file) => {
    if (!file) return;
    setOriginalSize(file.size);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(file);
  };

  const compress = () => {
    if (!preview) return;
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      canvas.getContext("2d").drawImage(img, 0, 0);
      canvas.toBlob(
        (blob) => {
          const url = URL.createObjectURL(blob);
          setResult({ url, size: blob.size });
        },
        "image/jpeg",
        quality
      );
    };
    img.src = preview;
  };

  return (
    <div>
      <input type="file" accept="image/*" onChange={(e) => handleFile(e.target.files[0])}
        style={{ marginBottom: 12, fontSize: 13 }} />
      {preview && (
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 12, color: "#64748B", marginBottom: 4 }}>Original ({(originalSize / 1024).toFixed(0)} KB)</div>
            <img src={preview} style={{ maxWidth: 160, borderRadius: 8, border: "1px solid #E2E8F0" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 160 }}>
            <label style={{ fontSize: 12, color: "#64748B" }}>Quality: {Math.round(quality * 100)}%</label>
            <input type="range" min="0.1" max="1" step="0.05" value={quality} onChange={(e) => setQuality(Number(e.target.value))} />
            <button onClick={compress} style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: "#16A34A", color: "#fff", fontWeight: 600, cursor: "pointer" }}>Compress</button>
          </div>
          {result && (
            <div>
              <div style={{ fontSize: 12, color: "#64748B", marginBottom: 4 }}>Compressed ({(result.size / 1024).toFixed(0)} KB)</div>
              <img src={result.url} style={{ maxWidth: 160, borderRadius: 8, border: "1px solid #E2E8F0", marginBottom: 6 }} />
              <a href={result.url} download="compressed.jpg" style={{ display: "block", fontSize: 12, color: "#16A34A", fontWeight: 600 }}>Download</a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ToolsPanel() {
  return (
    <>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>AI & productivity tools</h2>
      <p style={{ color: "#64748B", fontSize: 14, marginBottom: 20 }}>The image compressor below runs for real, right in your browser. PDF tools and the AI assistant need a small addition to the backend — noted below.</p>

      <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: 18, marginBottom: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <ImageIcon size={20} color="#16A34A" />
          <div style={{ fontWeight: 700, fontSize: 15 }}>Image Compressor — working now</div>
        </div>
        <ImageCompressor />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px,1fr))", gap: 14 }}>
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: 18 }}>
          <FileText size={22} color="#94A3B8" style={{ marginBottom: 8 }} />
          <div style={{ fontWeight: 600, marginBottom: 4 }}>PDF Toolkit</div>
          <div style={{ fontSize: 13, color: "#64748B" }}>Merge, split, compress, convert. Needs a PDF library (e.g. pdf-lib) added to the backend — real work, not yet wired in.</div>
        </div>
        <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: 18 }}>
          <Brain size={22} color="#94A3B8" style={{ marginBottom: 8 }} />
          <div style={{ fontWeight: 600, marginBottom: 4 }}>AI Study Assistant</div>
          <div style={{ fontSize: 13, color: "#64748B" }}>Needs your own Anthropic (or other) API key added to the backend, which then answers questions on your server — never exposed in frontend code.</div>
        </div>
      </div>
    </>
  );
}

function AuthModal({ onClose, onAuthed }) {
  const [mode, setMode] = useState("login"); // login | signup
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/${mode === "login" ? "login" : "signup"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      localStorage.setItem("vamp4_token", data.token);
      onAuthed(data.user);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }} onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={submit} style={{ background: "#fff", borderRadius: 14, padding: 24, width: "100%", maxWidth: 360, boxShadow: "0 10px 30px rgba(0,0,0,0.2)" }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 700, color: "#1E293B" }}>
          {mode === "login" ? "Log in" : "Create your account"}
        </h3>
        {mode === "signup" && (
          <>
            <input placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              style={{ width: "100%", padding: 10, marginBottom: 10, borderRadius: 8, border: "1px solid #CBD5E1" }} required />
            <select value={form.role || "student"} onChange={(e) => setForm({ ...form, role: e.target.value })}
              style={{ width: "100%", padding: 10, marginBottom: 10, borderRadius: 8, border: "1px solid #CBD5E1", color: "#1E293B" }}>
              <option value="student">Student / job seeker</option>
              <option value="employer">Employer / job provider</option>
            </select>
          </>
        )}
        <input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
          style={{ width: "100%", padding: 10, marginBottom: 10, borderRadius: 8, border: "1px solid #CBD5E1" }} required />
        <input type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
          style={{ width: "100%", padding: 10, marginBottom: 14, borderRadius: 8, border: "1px solid #CBD5E1" }} required />
        {error && <div style={{ color: "#DC2626", fontSize: 13, marginBottom: 10 }}>{error}</div>}
        <button type="submit" disabled={loading} style={{ width: "100%", padding: 11, borderRadius: 8, border: "none", background: "#16A34A", color: "#fff", fontWeight: 600, cursor: "pointer" }}>
          {loading ? "Please wait…" : mode === "login" ? "Log in" : "Sign up"}
        </button>
        <div style={{ textAlign: "center", marginTop: 14, fontSize: 13, color: "#64748B" }}>
          {mode === "login" ? "New here?" : "Already have an account?"}{" "}
          <button type="button" onClick={() => setMode(mode === "login" ? "signup" : "login")} style={{ background: "none", border: "none", color: "#16A34A", fontWeight: 600, cursor: "pointer" }}>
            {mode === "login" ? "Sign up" : "Log in"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function Vamp4Home() {
  const [active, setActive] = useState("courses");
  const [menuOpen, setMenuOpen] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [user, setUser] = useState(null);
  const [exams, setExams] = useState([]);
  const [examCategory, setExamCategory] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [jobForm, setJobForm] = useState({ title: "", company: "", location: "", description: "" });
  const [jobMsg, setJobMsg] = useState(null);

  React.useEffect(() => {
    if (active === "exams") {
      const url = examCategory ? `${API_BASE}/exams?category=${encodeURIComponent(examCategory)}` : `${API_BASE}/exams`;
      fetch(url).then((r) => r.json()).then(setExams).catch(() => setExams([]));
    }
    if (active === "jobs") {
      fetch(`${API_BASE}/jobs`).then((r) => r.json()).then(setJobs).catch(() => setJobs([]));
    }
  }, [active, examCategory]);

  const postJob = async (e) => {
    e.preventDefault();
    setJobMsg(null);
    const res = await fetch(`${API_BASE}/jobs`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(jobForm),
    });
    const data = await res.json();
    if (!res.ok) return setJobMsg({ type: "error", text: data.error });
    setJobMsg({ type: "success", text: "Job posted." });
    setJobForm({ title: "", company: "", location: "", description: "" });
    fetch(`${API_BASE}/jobs`).then((r) => r.json()).then(setJobs);
  };

  const applyToJob = async (jobId) => {
    if (!getToken()) return setShowAuth(true);
    const res = await fetch(`${API_BASE}/jobs/${jobId}/apply`, {
      method: "POST",
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    const data = await res.json();
    setJobMsg(res.ok ? { type: "success", text: "Applied!" } : { type: "error", text: data.error });
  };

  const EXAM_CATEGORIES = ["Government Exams", "Private Sector Exams", "Auditor Exams (Worldwide)", "Software Interview Q&A", "Data Science Interview Q&A", "Cyber Security Interview Q&A"];

  React.useEffect(() => {
    const token = getToken();
    if (!token) return;
    fetch(`${API_BASE}/courses/my-enrollments`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .catch(() => localStorage.removeItem("vamp4_token")); // token invalid/expired — clear it
  }, []);

  return (
    <div style={{ fontFamily: "Inter, system-ui, sans-serif", background: "#F8FAFC", minHeight: "100vh", color: "#1E293B" }}>
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} onAuthed={setUser} />}
      {/* Header */}
      <header style={{ position: "sticky", top: 0, zIndex: 10, background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg,#16A34A,#4ADE80)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "#fff" }}>V4</div>
            <span style={{ fontWeight: 700, fontSize: 18, letterSpacing: 0.3 }}>vamp4.com</span>
          </div>
          <nav style={{ display: "flex", gap: 4 }} className="desktop-nav">
            {NAV.map(n => (
              <button key={n.key} onClick={() => setActive(n.key)}
                style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8,
                  border: "none", background: active === n.key ? "#ECFDF5" : "transparent",
                  color: active === n.key ? "#16A34A" : "#64748B", cursor: "pointer", fontSize: 14, fontWeight: 500
                }}>
                <n.icon size={16} /> {n.label}
              </button>
            ))}
          </nav>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {user ? (
              <>
                <span style={{ fontSize: 14, color: "#1E293B", fontWeight: 500 }}>Hi, {user.name}</span>
                <button onClick={() => { localStorage.removeItem("vamp4_token"); setUser(null); }}
                  style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #CBD5E1", background: "transparent", color: "#1E293B", cursor: "pointer", fontSize: 14 }}>Log out</button>
              </>
            ) : (
              <>
                <button onClick={() => setShowAuth(true)} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #CBD5E1", background: "transparent", color: "#1E293B", cursor: "pointer", fontSize: 14 }}>Log in</button>
                <button onClick={() => setShowAuth(true)} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#16A34A", color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>Sign up</button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "60px 20px 40px", textAlign: "center" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#E2E8F0", padding: "6px 14px", borderRadius: 999, fontSize: 12, color: "#16A34A", marginBottom: 18 }}>
          <Sparkles size={14} /> One platform · learning, exams, jobs, AI tools
        </div>
        <h1 style={{ fontSize: 40, fontWeight: 800, lineHeight: 1.15, margin: "0 0 14px" }}>
          Learn, get certified,<br />and get hired — all in one place
        </h1>
        <p style={{ color: "#64748B", fontSize: 16, maxWidth: 560, margin: "0 auto 26px" }}>
          Spoken English to AI, Data Science, Cyber Security and Web Dev — plus exam question banks, interview prep, and a job board for seekers and employers.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button style={{ padding: "12px 24px", borderRadius: 10, border: "none", background: "#16A34A", color: "#fff", fontWeight: 600, cursor: "pointer" }}>Browse courses</button>
          <button style={{ padding: "12px 24px", borderRadius: 10, border: "1px solid #CBD5E1", background: "transparent", color: "#1E293B", fontWeight: 600, cursor: "pointer" }}>Explore exam Q&A</button>
        </div>
      </section>

      {/* Categories */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "10px 20px 40px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px,1fr))", gap: 12 }}>
          {CATEGORIES.map(c => (
            <div key={c.name} style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: "16px 14px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", textAlign: "center" }}>
              <c.icon size={22} color={c.color} style={{ marginBottom: 8 }} />
              <div style={{ fontSize: 13, fontWeight: 500 }}>{c.name}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Content by active tab */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "10px 20px 60px" }}>
        {active === "courses" && (
          <>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>Popular courses</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px,1fr))", gap: 16 }}>
              {COURSES.map(c => (
                <div key={c.title} style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 14, padding: 18, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                  <div style={{ fontSize: 11, color: "#16A34A", fontWeight: 600, marginBottom: 6 }}>{c.cat}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{c.title}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#64748B", marginBottom: 14 }}>
                    <Star size={13} color="#FBBF24" fill="#FBBF24" /> {c.rating} · {c.students} students
                  </div>
                  <PayPalButton courseId={c.id} amount={c.price} label="Enroll" onLoginRequired={() => setShowAuth(true)} />
                </div>
              ))}
            </div>
          </>
        )}

        {active === "exams" && (
          <>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Exam & interview Q&A bank</h2>
            <p style={{ color: "#64748B", fontSize: 14, marginBottom: 20 }}>Government, private sector, worldwide auditor exams, and technical interview questions — organized by category.</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
              {EXAM_CATEGORIES.map((t) => (
                <button key={t} onClick={() => setExamCategory(examCategory === t ? null : t)}
                  style={{ padding: "8px 14px", borderRadius: 999, border: "1px solid #CBD5E1", background: examCategory === t ? "#16A34A" : "#FFFFFF", color: examCategory === t ? "#fff" : "#1E293B", fontSize: 13, cursor: "pointer" }}>
                  {t}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {exams.length === 0 && <div style={{ color: "#64748B", fontSize: 14 }}>No questions loaded yet — start the backend to see real data here.</div>}
              {exams.map((q) => (
                <details key={q.id} style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: "14px 16px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                  <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: 14 }}>{q.question}</summary>
                  <div style={{ marginTop: 10, color: "#334155", fontSize: 13, lineHeight: 1.6 }}>{q.answer}</div>
                </details>
              ))}
            </div>
          </>
        )}

        {active === "jobs" && (
          <>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Job board</h2>
            <p style={{ color: "#64748B", fontSize: 14, marginBottom: 20 }}>For job seekers and job providers — government and private roles.</p>

            {jobMsg && <div style={{ marginBottom: 14, fontSize: 13, color: jobMsg.type === "error" ? "#DC2626" : "#16A34A" }}>{jobMsg.text}</div>}

            {user?.role === "employer" && (
              <form onSubmit={postJob} style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: 16, marginBottom: 24, display: "grid", gap: 8, maxWidth: 480 }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Post a job</div>
                <input placeholder="Job title" value={jobForm.title} onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })} required
                  style={{ padding: 9, borderRadius: 8, border: "1px solid #CBD5E1" }} />
                <input placeholder="Company" value={jobForm.company} onChange={(e) => setJobForm({ ...jobForm, company: e.target.value })} required
                  style={{ padding: 9, borderRadius: 8, border: "1px solid #CBD5E1" }} />
                <input placeholder="Location" value={jobForm.location} onChange={(e) => setJobForm({ ...jobForm, location: e.target.value })}
                  style={{ padding: 9, borderRadius: 8, border: "1px solid #CBD5E1" }} />
                <textarea placeholder="Description" value={jobForm.description} onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })}
                  style={{ padding: 9, borderRadius: 8, border: "1px solid #CBD5E1", minHeight: 70, fontFamily: "inherit" }} />
                <button type="submit" style={{ padding: "9px 16px", borderRadius: 8, border: "none", background: "#16A34A", color: "#fff", fontWeight: 600, cursor: "pointer" }}>Post job</button>
              </form>
            )}

            {!user && (
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
                <button onClick={() => setShowAuth(true)} style={{ padding: "12px 20px", borderRadius: 10, border: "none", background: "#16A34A", color: "#fff", fontWeight: 600, cursor: "pointer" }}>I'm a job seeker — log in</button>
                <button onClick={() => setShowAuth(true)} style={{ padding: "12px 20px", borderRadius: 10, border: "1px solid #CBD5E1", background: "transparent", color: "#1E293B", fontWeight: 600, cursor: "pointer" }}>I'm hiring — log in</button>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {jobs.length === 0 && <div style={{ color: "#64748B", fontSize: 14 }}>No jobs posted yet.</div>}
              {jobs.map((j) => (
                <div key={j.id} style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{j.title}</div>
                  <div style={{ fontSize: 13, color: "#64748B", marginBottom: 8 }}>{j.company}{j.location ? ` · ${j.location}` : ""}</div>
                  {j.description && <div style={{ fontSize: 13, color: "#334155", marginBottom: 10 }}>{j.description}</div>}
                  <button onClick={() => applyToJob(j.id)} style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid #16A34A", background: "transparent", color: "#16A34A", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Apply</button>
                </div>
              ))}
            </div>
          </>
        )}

        {active === "tools" && <ToolsPanel />}
      </section>

      <footer style={{ borderTop: "1px solid #E2E8F0", padding: "24px 20px", textAlign: "center", color: "#64748B", fontSize: 13 }}>
        vamp4.com — this is a front-end shell. Real payments, accounts, and content need a connected backend.
      </footer>
    </div>
  );
}
