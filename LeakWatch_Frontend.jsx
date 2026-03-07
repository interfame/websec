// LeakWatch — Complete Platform UI
// Single-file React demo covering all pages: Landing, Scan, Results, Payment, API Docs
// Production: split into Next.js app/ directory (see folder structure docs)

import { useState, useEffect, useRef } from "react";

// ─── DESIGN TOKENS ───────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@300;400;500;700&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --ink:     #060912;
    --deep:    #0b1120;
    --surface: #111827;
    --glass:   rgba(17,24,39,0.7);
    --rim:     rgba(255,255,255,0.06);
    --cyan:    #00e5ff;
    --violet:  #8b5cf6;
    --rose:    #f43f5e;
    --amber:   #f59e0b;
    --green:   #10b981;
    --text:    #e2e8f0;
    --muted:   #64748b;
    --mono:    'JetBrains Mono', monospace;
    --sans:    'Syne', sans-serif;
  }

  body {
    background: var(--ink);
    color: var(--text);
    font-family: var(--sans);
    min-height: 100vh;
    overflow-x: hidden;
  }

  /* scrollbar */
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: var(--deep); }
  ::-webkit-scrollbar-thumb { background: var(--violet); border-radius: 2px; }

  /* noise overlay */
  body::after {
    content: '';
    position: fixed; inset: 0;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
    pointer-events: none;
    z-index: 9999;
    mix-blend-mode: overlay;
  }

  /* glass card */
  .glass {
    background: var(--glass);
    backdrop-filter: blur(16px);
    border: 1px solid var(--rim);
    border-radius: 12px;
  }

  /* glow effects */
  .glow-cyan { box-shadow: 0 0 24px rgba(0,229,255,0.18), 0 0 48px rgba(0,229,255,0.08); }
  .glow-violet { box-shadow: 0 0 24px rgba(139,92,246,0.2), 0 0 48px rgba(139,92,246,0.08); }
  .glow-rose { box-shadow: 0 0 24px rgba(244,63,94,0.2); }

  /* animations */
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes pulse-ring {
    0%   { transform: scale(1); opacity: 0.6; }
    100% { transform: scale(1.6); opacity: 0; }
  }
  @keyframes scan-beam {
    0%   { top: 0%; opacity: 0.8; }
    100% { top: 100%; opacity: 0; }
  }
  @keyframes blink { 0%,100% { opacity:1; } 50% { opacity:0; } }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes dash {
    to { stroke-dashoffset: 0; }
  }
  @keyframes float {
    0%,100% { transform: translateY(0px); }
    50%      { transform: translateY(-8px); }
  }

  .fade-up { animation: fadeUp 0.6s ease forwards; }
  .float   { animation: float 4s ease-in-out infinite; }
`;

// ─── ICONS (inline SVG) ──────────────────────────────────────────────────────
const Icon = {
  Shield: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 2L4 6v6c0 5.25 3.5 10.15 8 11.35C16.5 22.15 20 17.25 20 12V6l-8-4z"/>
    </svg>
  ),
  Search: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
    </svg>
  ),
  Lock: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  ),
  Unlock: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/>
    </svg>
  ),
  Warning: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  Check: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polyline points="20,6 9,17 4,12"/>
    </svg>
  ),
  Arrow: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12,5 19,12 12,19"/>
    </svg>
  ),
  Copy: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
    </svg>
  ),
  Download: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  ),
  Mail: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
      <polyline points="22,6 12,13 2,6"/>
    </svg>
  ),
  Globe: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/>
      <line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  ),
  Zap: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  ),
};

// ─── RISK GAUGE ──────────────────────────────────────────────────────────────
function RiskGauge({ score }) {
  const color = score >= 75 ? "#f43f5e" : score >= 45 ? "#f59e0b" : "#10b981";
  const r = 54, cx = 64, cy = 64;
  const circ = 2 * Math.PI * r;
  const arc = circ * 0.75;
  const offset = arc - (arc * score) / 100;
  return (
    <div style={{ position: "relative", width: 128, height: 80 }}>
      <svg width="128" height="100" viewBox="0 0 128 100">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)"
          strokeWidth="10" strokeDasharray={`${arc} ${circ}`}
          strokeDashoffset={-arc * 0.125} strokeLinecap="round"
          transform="rotate(-225 64 64)" />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color}
          strokeWidth="10"
          strokeDasharray={`${arc - offset} ${circ}`}
          strokeDashoffset={-arc * 0.125}
          strokeLinecap="round"
          transform="rotate(-225 64 64)"
          style={{ filter: `drop-shadow(0 0 6px ${color})`, transition: "stroke-dasharray 1.2s ease" }} />
      </svg>
      <div style={{
        position: "absolute", bottom: 4, left: 0, right: 0,
        textAlign: "center", fontFamily: "var(--mono)",
        fontSize: "1.8rem", fontWeight: 700, color,
        textShadow: `0 0 12px ${color}`
      }}>{score}</div>
    </div>
  );
}

// ─── BREACH TIMELINE ─────────────────────────────────────────────────────────
function BreachTimeline({ breaches }) {
  return (
    <div style={{ position: "relative", paddingLeft: 24 }}>
      <div style={{
        position: "absolute", left: 8, top: 4, bottom: 4,
        width: 1, background: "linear-gradient(180deg, var(--violet), var(--cyan))"
      }} />
      {breaches.map((b, i) => (
        <div key={i} style={{
          display: "flex", gap: 12, marginBottom: 16, alignItems: "flex-start",
          animation: `fadeUp 0.4s ease ${i * 0.08}s both`
        }}>
          <div style={{
            position: "absolute", left: 4, width: 9, height: 9, borderRadius: "50%",
            background: b.severity === "critical" ? "var(--rose)" : b.severity === "high" ? "var(--amber)" : "var(--cyan)",
            marginTop: 5, boxShadow: `0 0 8px currentColor`
          }} />
          <div style={{ paddingLeft: 20 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 3 }}>
              <span style={{ fontFamily: "var(--mono)", fontSize: "0.78rem", color: "var(--text)", fontWeight: 600 }}>{b.service}</span>
              <span style={{
                fontSize: "0.65rem", padding: "1px 7px", borderRadius: 99,
                background: b.severity === "critical" ? "rgba(244,63,94,0.15)" : b.severity === "high" ? "rgba(245,158,11,0.15)" : "rgba(0,229,255,0.1)",
                color: b.severity === "critical" ? "var(--rose)" : b.severity === "high" ? "var(--amber)" : "var(--cyan)",
                border: `1px solid currentColor`, fontFamily: "var(--mono)"
              }}>{b.severity}</span>
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--muted)", fontFamily: "var(--mono)" }}>{b.date} · {b.records} records · {b.data}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── NAV ─────────────────────────────────────────────────────────────────────
function Nav({ page, setPage }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);

  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
      padding: "0 32px", height: 64,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      background: scrolled ? "rgba(6,9,18,0.92)" : "transparent",
      backdropFilter: scrolled ? "blur(20px)" : "none",
      borderBottom: scrolled ? "1px solid var(--rim)" : "1px solid transparent",
      transition: "all 0.3s ease",
    }}>
      <button onClick={() => setPage("home")} style={{
        display: "flex", alignItems: "center", gap: 10,
        background: "none", border: "none", cursor: "pointer", color: "var(--text)"
      }}>
        <div style={{
          width: 32, height: 32,
          background: "linear-gradient(135deg, var(--violet), var(--cyan))",
          borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 0 16px rgba(139,92,246,0.4)"
        }}>
          <Icon.Shield />
        </div>
        <span style={{ fontFamily: "var(--sans)", fontWeight: 800, fontSize: "1.1rem", letterSpacing: "-0.02em" }}>
          Leak<span style={{ color: "var(--cyan)" }}>Watch</span>
        </span>
      </button>

      <div style={{ display: "flex", gap: 4 }}>
        {["home", "scan", "docs"].map(p => (
          <button key={p} onClick={() => setPage(p)} style={{
            background: page === p ? "rgba(139,92,246,0.15)" : "none",
            border: page === p ? "1px solid rgba(139,92,246,0.3)" : "1px solid transparent",
            color: page === p ? "var(--violet)" : "var(--muted)",
            padding: "6px 16px", borderRadius: 8, cursor: "pointer",
            fontFamily: "var(--sans)", fontSize: "0.85rem", fontWeight: 600,
            textTransform: "capitalize", transition: "all 0.2s"
          }}>{p === "docs" ? "API Docs" : p === "scan" ? "Run Scan" : "Home"}</button>
        ))}
      </div>

      <button onClick={() => setPage("scan")} style={{
        background: "linear-gradient(135deg, var(--violet), var(--cyan))",
        border: "none", color: "#fff", padding: "8px 20px",
        borderRadius: 8, cursor: "pointer", fontFamily: "var(--sans)",
        fontWeight: 700, fontSize: "0.85rem",
        boxShadow: "0 0 20px rgba(139,92,246,0.35)",
        transition: "all 0.2s"
      }}>Start Free Scan →</button>
    </nav>
  );
}

// ─── HOME PAGE ───────────────────────────────────────────────────────────────
function HomePage({ setPage }) {
  const [demoEmail, setDemoEmail] = useState("john@company.com");
  const [typing, setTyping] = useState(false);

  const exampleBreaches = [
    { service: "LinkedIn", date: "2021-06-22", severity: "critical", records: "700M", data: "email, phone, address" },
    { service: "Adobe", date: "2020-10-15", severity: "high", records: "153M", data: "email, password hash" },
    { service: "Dropbox", date: "2016-08-31", severity: "high", records: "68M", data: "email, bcrypt hash" },
    { service: "Canva", date: "2019-05-24", severity: "medium", records: "4M", data: "email, username" },
  ];

  return (
    <div>
      {/* HERO */}
      <section style={{
        minHeight: "100vh", display: "flex", alignItems: "center",
        padding: "120px 32px 80px",
        position: "relative", overflow: "hidden",
      }}>
        {/* Background orbs */}
        <div style={{
          position: "absolute", top: "20%", left: "60%",
          width: 500, height: 500, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)",
          filter: "blur(40px)", pointerEvents: "none"
        }} />
        <div style={{
          position: "absolute", top: "50%", left: "10%",
          width: 300, height: 300, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(0,229,255,0.08) 0%, transparent 70%)",
          filter: "blur(40px)", pointerEvents: "none"
        }} />

        {/* Grid */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage: `linear-gradient(rgba(139,92,246,0.04) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(139,92,246,0.04) 1px, transparent 1px)`,
          backgroundSize: "64px 64px",
          maskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black, transparent)"
        }} />

        <div style={{ maxWidth: 1100, margin: "0 auto", width: "100%", position: "relative" }}>
          <div style={{ maxWidth: 660 }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: "rgba(0,229,255,0.07)", border: "1px solid rgba(0,229,255,0.2)",
              borderRadius: 99, padding: "6px 14px", marginBottom: 28,
              animation: "fadeUp 0.5s ease"
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--cyan)", boxShadow: "0 0 6px var(--cyan)" }} />
              <span style={{ fontFamily: "var(--mono)", fontSize: "0.72rem", color: "var(--cyan)", letterSpacing: "0.05em" }}>
                REAL-TIME BREACH INTELLIGENCE
              </span>
            </div>

            <h1 style={{
              fontSize: "clamp(2.6rem, 5vw, 4rem)", fontWeight: 800,
              lineHeight: 1.08, letterSpacing: "-0.03em",
              marginBottom: 24, animation: "fadeUp 0.5s 0.1s ease both"
            }}>
              Your credentials<br />
              <span style={{
                background: "linear-gradient(90deg, var(--violet), var(--cyan))",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"
              }}>exposed in the wild?</span>
            </h1>

            <p style={{
              fontSize: "1.1rem", color: "var(--muted)", lineHeight: 1.7,
              marginBottom: 40, maxWidth: 520,
              animation: "fadeUp 0.5s 0.2s ease both"
            }}>
              LeakWatch scans <strong style={{ color: "var(--text)" }}>14+ billion compromised records</strong> across
              3,200 known data breaches. Enter any email or domain to uncover exposure instantly.
            </p>

            {/* Quick scan bar */}
            <div style={{
              display: "flex", gap: 0, marginBottom: 16,
              animation: "fadeUp 0.5s 0.3s ease both",
              maxWidth: 560
            }}>
              <div style={{
                flex: 1, display: "flex", alignItems: "center", gap: 10,
                background: "var(--surface)", border: "1px solid var(--rim)",
                borderRight: "none", borderRadius: "10px 0 0 10px",
                padding: "0 16px",
              }}>
                <span style={{ color: "var(--muted)" }}><Icon.Mail /></span>
                <input
                  value={demoEmail}
                  onChange={e => setDemoEmail(e.target.value)}
                  style={{
                    background: "none", border: "none", outline: "none",
                    color: "var(--text)", fontFamily: "var(--mono)", fontSize: "0.9rem",
                    width: "100%", padding: "14px 0"
                  }}
                  placeholder="email@domain.com or domain.com"
                />
              </div>
              <button onClick={() => setPage("scan")} style={{
                background: "linear-gradient(135deg, var(--violet), var(--cyan))",
                border: "none", color: "#fff", padding: "0 28px",
                borderRadius: "0 10px 10px 0", cursor: "pointer",
                fontFamily: "var(--sans)", fontWeight: 700, fontSize: "0.9rem",
                whiteSpace: "nowrap", boxShadow: "0 0 24px rgba(139,92,246,0.4)",
                transition: "all 0.2s"
              }}>
                Scan Now
              </button>
            </div>

            <div style={{
              display: "flex", gap: 20, flexWrap: "wrap",
              animation: "fadeUp 0.5s 0.4s ease both"
            }}>
              {["Free preview", "No signup required", "Results in 10s"].map((t, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.82rem", color: "var(--muted)" }}>
                  <span style={{ color: "var(--green)" }}><Icon.Check /></span>{t}
                </div>
              ))}
            </div>
          </div>

          {/* Floating breach card */}
          <div style={{
            position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)",
            width: 340, display: "none"
          }} className="float" />
        </div>
      </section>

      {/* STATS */}
      <section style={{ padding: "60px 32px", borderTop: "1px solid var(--rim)", borderBottom: "1px solid var(--rim)", background: "rgba(11,17,32,0.6)" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 32, textAlign: "center" }}>
          {[
            { val: "14.2B+", label: "Indexed Records" },
            { val: "3,200+", label: "Breach Sources" },
            { val: "98.4%", label: "Detection Rate" },
            { val: "<10s", label: "Avg Scan Time" }
          ].map((s, i) => (
            <div key={i}>
              <div style={{
                fontFamily: "var(--mono)", fontSize: "2rem", fontWeight: 700,
                background: "linear-gradient(90deg, var(--violet), var(--cyan))",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"
              }}>{s.val}</div>
              <div style={{ fontSize: "0.82rem", color: "var(--muted)", marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ padding: "100px 32px", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <span style={{ fontFamily: "var(--mono)", fontSize: "0.72rem", color: "var(--violet)", letterSpacing: "0.1em", textTransform: "uppercase" }}>How it works</span>
          <h2 style={{ fontSize: "2.2rem", fontWeight: 800, marginTop: 12, letterSpacing: "-0.02em" }}>Three steps to full exposure intel</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 24 }}>
          {[
            { num: "01", title: "Submit Target", desc: "Enter any email address or domain name. No account creation required for a free preview scan.", icon: "🎯" },
            { num: "02", title: "Engine Scans", desc: "Our engine cross-references HIBP, DeHashed, and 3,200+ private intelligence feeds in real time.", icon: "⚡" },
            { num: "03", title: "Unlock Report", desc: "Pay a one-time crypto fee to unlock the full report: all breaches, passwords, risk score, PDF export.", icon: "🔓" },
          ].map((s, i) => (
            <div key={i} className="glass" style={{
              padding: 28, position: "relative", overflow: "hidden",
              transition: "border-color 0.2s, transform 0.2s",
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(139,92,246,0.4)"; e.currentTarget.style.transform = "translateY(-4px)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--rim)"; e.currentTarget.style.transform = "translateY(0)"; }}
            >
              <div style={{
                position: "absolute", top: 16, right: 16,
                fontFamily: "var(--mono)", fontSize: "0.7rem", color: "rgba(139,92,246,0.3)",
                fontWeight: 700
              }}>{s.num}</div>
              <div style={{ fontSize: "2rem", marginBottom: 16 }}>{s.icon}</div>
              <h3 style={{ fontWeight: 700, fontSize: "1.05rem", marginBottom: 10 }}>{s.title}</h3>
              <p style={{ fontSize: "0.88rem", color: "var(--muted)", lineHeight: 1.6 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* SAMPLE RESULTS */}
      <section style={{ padding: "60px 32px 100px", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <span style={{ fontFamily: "var(--mono)", fontSize: "0.72rem", color: "var(--violet)", letterSpacing: "0.1em", textTransform: "uppercase" }}>Example report</span>
          <h2 style={{ fontSize: "2.2rem", fontWeight: 800, marginTop: 12, letterSpacing: "-0.02em" }}>What you'll discover</h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 24 }}>
          {/* Left panel */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="glass" style={{ padding: 24 }}>
              <div style={{ fontSize: "0.72rem", color: "var(--muted)", fontFamily: "var(--mono)", marginBottom: 16, letterSpacing: "0.05em" }}>RISK ASSESSMENT</div>
              <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                <RiskGauge score={82} />
                <div>
                  <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--rose)" }}>CRITICAL</div>
                  <div style={{ fontSize: "0.82rem", color: "var(--muted)", marginTop: 4 }}>4 breach sources<br />Active credential risk</div>
                </div>
              </div>
            </div>

            <div className="glass" style={{ padding: 24 }}>
              <div style={{ fontSize: "0.72rem", color: "var(--muted)", fontFamily: "var(--mono)", marginBottom: 16, letterSpacing: "0.05em" }}>EXPOSURE METRICS</div>
              {[
                { label: "Total Exposures", val: "4", color: "var(--rose)" },
                { label: "Password Reuse Risk", val: "73%", color: "var(--amber)" },
                { label: "First Breach", val: "Aug 2016", color: "var(--muted)" },
                { label: "Latest Breach", val: "Jun 2021", color: "var(--muted)" },
              ].map((m, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: i < 3 ? "1px solid var(--rim)" : "none" }}>
                  <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>{m.label}</span>
                  <span style={{ fontFamily: "var(--mono)", fontWeight: 700, color: m.color, fontSize: "0.9rem" }}>{m.val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right panel */}
          <div className="glass" style={{ padding: 24 }}>
            <div style={{ fontSize: "0.72rem", color: "var(--muted)", fontFamily: "var(--mono)", marginBottom: 20, letterSpacing: "0.05em" }}>BREACH TIMELINE</div>
            <BreachTimeline breaches={exampleBreaches} />

            <div style={{
              marginTop: 24, padding: 16, borderRadius: 8,
              background: "rgba(244,63,94,0.07)", border: "1px solid rgba(244,63,94,0.2)",
              display: "flex", alignItems: "flex-start", gap: 10
            }}>
              <span style={{ color: "var(--rose)", marginTop: 1 }}><Icon.Lock /></span>
              <div>
                <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--rose)", marginBottom: 4 }}>Full report locked</div>
                <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>Passwords, hashes, security recommendations, PDF export — unlock with a one-time crypto payment.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section style={{ padding: "80px 32px", background: "rgba(11,17,32,0.8)", borderTop: "1px solid var(--rim)" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
          <span style={{ fontFamily: "var(--mono)", fontSize: "0.72rem", color: "var(--violet)", letterSpacing: "0.1em", textTransform: "uppercase" }}>Pricing</span>
          <h2 style={{ fontSize: "2.2rem", fontWeight: 800, marginTop: 12, marginBottom: 12, letterSpacing: "-0.02em" }}>Pay only for what you need</h2>
          <p style={{ color: "var(--muted)", marginBottom: 48 }}>No subscription. No account. Pay with crypto. Unlock instantly.</p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20 }}>
            {[
              { name: "Single Scan", price: "$4.99", desc: "1 email or domain", features: ["Full breach report", "Risk score", "PDF export", "24hr access"], color: "var(--cyan)", popular: false },
              { name: "Domain Pack", price: "$19.99", desc: "Up to 50 email addresses on 1 domain", features: ["Bulk email scan", "Domain-wide report", "API access 7 days", "Priority queue"], color: "var(--violet)", popular: true },
              { name: "API Access", price: "$79/mo", desc: "Unlimited API calls", features: ["REST API", "Webhook alerts", "10,000 scans/mo", "CSV + JSON export"], color: "var(--amber)", popular: false },
            ].map((p, i) => (
              <div key={i} className="glass" style={{
                padding: 28, textAlign: "left", position: "relative",
                border: p.popular ? `1px solid rgba(139,92,246,0.4)` : "1px solid var(--rim)",
                boxShadow: p.popular ? "0 0 40px rgba(139,92,246,0.15)" : "none"
              }}>
                {p.popular && (
                  <div style={{
                    position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)",
                    background: "var(--violet)", padding: "3px 14px", borderRadius: 99,
                    fontSize: "0.7rem", fontWeight: 700, fontFamily: "var(--mono)", color: "#fff",
                    letterSpacing: "0.05em"
                  }}>MOST POPULAR</div>
                )}
                <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginBottom: 6, fontFamily: "var(--mono)" }}>{p.name}</div>
                <div style={{ fontSize: "2rem", fontWeight: 800, color: p.color, marginBottom: 4 }}>{p.price}</div>
                <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginBottom: 20 }}>{p.desc}</div>
                {p.features.map((f, j) => (
                  <div key={j} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                    <span style={{ color: p.color }}><Icon.Check /></span>
                    <span style={{ fontSize: "0.85rem", color: "var(--text)" }}>{f}</span>
                  </div>
                ))}
                <button onClick={() => setPage("scan")} style={{
                  marginTop: 20, width: "100%", padding: "10px",
                  background: p.popular ? "linear-gradient(135deg, var(--violet), var(--cyan))" : "transparent",
                  border: p.popular ? "none" : `1px solid ${p.color}`,
                  color: p.popular ? "#fff" : p.color,
                  borderRadius: 8, cursor: "pointer",
                  fontFamily: "var(--sans)", fontWeight: 700, fontSize: "0.85rem"
                }}>Get Started →</button>
              </div>
            ))}
          </div>

          <p style={{ marginTop: 32, fontSize: "0.82rem", color: "var(--muted)" }}>
            Payments accepted in <strong style={{ color: "var(--text)" }}>BTC · ETH · USDT</strong> via NOWPayments. Instant confirmation. No chargebacks.
          </p>
        </div>
      </section>
    </div>
  );
}

// ─── SCAN PAGE ────────────────────────────────────────────────────────────────
function ScanPage({ setPage, setScanData }) {
  const [input, setInput] = useState("");
  const [scanType, setScanType] = useState("email");
  const [stage, setStage] = useState("idle"); // idle | scanning | done
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState([]);
  const logsRef = useRef(null);

  const logMessages = [
    "[INIT] Connecting to breach intelligence feed...",
    "[HIBP] Querying HaveIBeenPwned API v3...",
    "[DEHASHED] Searching DeHashed index (14.2B records)...",
    "[INTEL] Cross-referencing credential databases...",
    "[CVE] Checking related CVE exposure vectors...",
    "[RISK] Computing exposure risk score...",
    "[ML] Running password reuse probability model...",
    "[TIMELINE] Building breach chronology...",
    "[REPORT] Generating structured findings...",
    "[DONE] Scan complete. Results ready.",
  ];

  function startScan() {
    if (!input.trim()) return;
    setStage("scanning");
    setProgress(0);
    setLogs([]);
    let i = 0;
    const iv = setInterval(() => {
      if (i < logMessages.length) {
        setLogs(l => [...l, logMessages[i]]);
        setProgress(Math.round(((i + 1) / logMessages.length) * 100));
        i++;
        if (logsRef.current) logsRef.current.scrollTop = logsRef.current.scrollHeight;
      } else {
        clearInterval(iv);
        setTimeout(() => {
          setStage("done");
          setScanData({ target: input, type: scanType });
          setPage("results");
        }, 600);
      }
    }, 400);
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "100px 32px" }}>
      <div style={{ width: "100%", maxWidth: 600 }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <h1 style={{ fontSize: "2rem", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 8 }}>Run a Breach Scan</h1>
          <p style={{ color: "var(--muted)", fontSize: "0.95rem" }}>Enter an email or domain to check for credential exposure</p>
        </div>

        {stage === "idle" && (
          <div className="glass" style={{ padding: 32 }}>
            {/* Type toggle */}
            <div style={{ display: "flex", gap: 0, marginBottom: 24, background: "var(--surface)", borderRadius: 8, padding: 4 }}>
              {["email", "domain"].map(t => (
                <button key={t} onClick={() => setScanType(t)} style={{
                  flex: 1, padding: "8px", borderRadius: 6,
                  background: scanType === t ? "var(--violet)" : "transparent",
                  border: "none", color: scanType === t ? "#fff" : "var(--muted)",
                  cursor: "pointer", fontFamily: "var(--sans)", fontWeight: 700,
                  fontSize: "0.85rem", textTransform: "capitalize",
                  transition: "all 0.2s",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6
                }}>
                  {t === "email" ? <Icon.Mail /> : <Icon.Globe />}{t}
                </button>
              ))}
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: "0.78rem", color: "var(--muted)", fontFamily: "var(--mono)", letterSpacing: "0.05em", display: "block", marginBottom: 8 }}>
                {scanType === "email" ? "EMAIL ADDRESS" : "DOMAIN NAME"}
              </label>
              <div style={{
                display: "flex", alignItems: "center", gap: 10,
                background: "var(--surface)", border: "1px solid var(--rim)",
                borderRadius: 8, padding: "0 14px",
                transition: "border-color 0.2s"
              }}>
                <span style={{ color: "var(--muted)" }}>{scanType === "email" ? <Icon.Mail /> : <Icon.Globe />}</span>
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && startScan()}
                  placeholder={scanType === "email" ? "john@example.com" : "example.com"}
                  style={{
                    background: "none", border: "none", outline: "none",
                    color: "var(--text)", fontFamily: "var(--mono)", fontSize: "0.95rem",
                    width: "100%", padding: "14px 0"
                  }}
                />
              </div>
            </div>

            <button onClick={startScan} style={{
              width: "100%", padding: "14px",
              background: "linear-gradient(135deg, var(--violet), var(--cyan))",
              border: "none", color: "#fff", borderRadius: 8, cursor: "pointer",
              fontFamily: "var(--sans)", fontWeight: 800, fontSize: "1rem",
              boxShadow: "0 0 30px rgba(139,92,246,0.4)", transition: "all 0.2s",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8
            }}>
              <Icon.Search />  Run Breach Scan
            </button>

            <div style={{ marginTop: 20, display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
              {["HIBP Database", "DeHashed API", "14.2B Records"].map((t, i) => (
                <span key={i} style={{ fontSize: "0.75rem", color: "var(--muted)", fontFamily: "var(--mono)", display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--green)", display: "inline-block" }} />{t}
                </span>
              ))}
            </div>
          </div>
        )}

        {stage === "scanning" && (
          <div className="glass" style={{ padding: 32 }}>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{
                width: 56, height: 56, borderRadius: "50%", margin: "0 auto 16px",
                border: "2px solid transparent",
                borderTopColor: "var(--violet)", borderRightColor: "var(--cyan)",
                animation: "spin 0.8s linear infinite"
              }} />
              <div style={{ fontFamily: "var(--mono)", fontSize: "0.85rem", color: "var(--muted)" }}>Scanning {input}…</div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", fontFamily: "var(--mono)", color: "var(--muted)", marginBottom: 6 }}>
                <span>Analysis Progress</span><span style={{ color: "var(--cyan)" }}>{progress}%</span>
              </div>
              <div style={{ height: 4, background: "var(--surface)", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${progress}%`, background: "linear-gradient(90deg, var(--violet), var(--cyan))", borderRadius: 2, transition: "width 0.4s ease" }} />
              </div>
            </div>

            <div ref={logsRef} style={{
              background: "var(--ink)", border: "1px solid var(--rim)", borderRadius: 8,
              padding: 16, height: 200, overflowY: "auto",
              fontFamily: "var(--mono)", fontSize: "0.72rem", lineHeight: 1.8
            }}>
              {logs.map((l, i) => (
                <div key={i} style={{
                  color: l.startsWith("[DONE]") ? "var(--green)" : l.startsWith("[RISK]") || l.startsWith("[ML]") ? "var(--amber)" : "var(--muted)"
                }}>{l}</div>
              ))}
              <span style={{ animation: "blink 1s infinite", color: "var(--cyan)" }}>█</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── RESULTS PAGE ─────────────────────────────────────────────────────────────
function ResultsPage({ scanData, setPage }) {
  const target = scanData?.target || "john@company.com";
  const isEmail = scanData?.type === "email";

  const publicBreaches = [
    { service: "LinkedIn", date: "2021-06-22", severity: "critical", records: "700M", data: "email, phone, address, job title" },
    { service: "Adobe", date: "2020-10-15", severity: "high", records: "153M", data: "email, password hash (MD5)" },
  ];

  const lockedBreaches = [
    { service: "Dropbox", date: "2016-08-31", severity: "high", records: "68M", data: "email, bcrypt hash" },
    { service: "Canva", date: "2019-05-24", severity: "medium", records: "4M", data: "email, username" },
  ];

  return (
    <div style={{ minHeight: "100vh", padding: "100px 32px 60px", maxWidth: 1000, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <button onClick={() => setPage("scan")} style={{
          background: "none", border: "none", color: "var(--muted)", cursor: "pointer",
          fontSize: "0.82rem", fontFamily: "var(--mono)", marginBottom: 16,
          display: "flex", alignItems: "center", gap: 6
        }}>← New scan</button>
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}>Scan Results</h1>
          <code style={{
            background: "var(--surface)", border: "1px solid var(--rim)",
            padding: "4px 12px", borderRadius: 6, fontSize: "0.85rem",
            fontFamily: "var(--mono)", color: "var(--cyan)"
          }}>{target}</code>
          <span style={{
            background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.3)",
            color: "var(--rose)", padding: "4px 12px", borderRadius: 99,
            fontSize: "0.75rem", fontFamily: "var(--mono)"
          }}>4 EXPOSURES FOUND</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 20, alignItems: "start" }}>
        {/* Left */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="glass" style={{ padding: 24 }}>
            <div style={{ fontSize: "0.7rem", color: "var(--muted)", fontFamily: "var(--mono)", marginBottom: 12, letterSpacing: "0.05em" }}>RISK SCORE</div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <RiskGauge score={82} />
              <div style={{ marginTop: 8, fontSize: "0.82rem", color: "var(--rose)", fontWeight: 700 }}>CRITICAL RISK</div>
            </div>
          </div>

          <div className="glass" style={{ padding: 24 }}>
            <div style={{ fontSize: "0.7rem", color: "var(--muted)", fontFamily: "var(--mono)", marginBottom: 16, letterSpacing: "0.05em" }}>QUICK STATS</div>
            {[
              { label: "Total Breaches", val: "4", c: "var(--rose)" },
              { label: "Password Reuse", val: "73%", c: "var(--amber)" },
              { label: "First Seen", val: "Aug 2016", c: "var(--muted)" },
              { label: "Last Seen", val: "Jun 2021", c: "var(--muted)" },
              { label: "Records Found", val: "921M+", c: "var(--rose)" },
            ].map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: i < 4 ? "1px solid var(--rim)" : "none" }}>
                <span style={{ fontSize: "0.82rem", color: "var(--muted)" }}>{m.label}</span>
                <span style={{ fontFamily: "var(--mono)", fontSize: "0.82rem", fontWeight: 700, color: m.c }}>{m.val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Public results */}
          <div className="glass" style={{ padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div style={{ fontSize: "0.7rem", color: "var(--muted)", fontFamily: "var(--mono)", letterSpacing: "0.05em" }}>BREACH SOURCES (FREE PREVIEW — 2 of 4)</div>
              <span style={{ fontSize: "0.7rem", color: "var(--green)", fontFamily: "var(--mono)" }}>● LIVE DATA</span>
            </div>
            <BreachTimeline breaches={publicBreaches} />
          </div>

          {/* Locked results */}
          <div style={{ position: "relative" }}>
            <div className="glass" style={{ padding: 24, filter: "blur(3px)", pointerEvents: "none", userSelect: "none" }}>
              <div style={{ fontSize: "0.7rem", color: "var(--muted)", fontFamily: "var(--mono)", marginBottom: 20, letterSpacing: "0.05em" }}>ADDITIONAL BREACH SOURCES</div>
              <BreachTimeline breaches={lockedBreaches} />
            </div>
            <div style={{
              position: "absolute", inset: 0, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              background: "rgba(6,9,18,0.6)", backdropFilter: "blur(4px)",
              borderRadius: 12
            }}>
              <div style={{ fontSize: "1.5rem", marginBottom: 8 }}>🔒</div>
              <div style={{ fontWeight: 800, fontSize: "1rem", marginBottom: 6 }}>2 more breaches hidden</div>
              <div style={{ fontSize: "0.82rem", color: "var(--muted)", marginBottom: 16, textAlign: "center", maxWidth: 280 }}>
                Unlock the full report to see all breaches, password data, and security recommendations.
              </div>
              <button onClick={() => setPage("payment")} style={{
                background: "linear-gradient(135deg, var(--violet), var(--cyan))",
                border: "none", color: "#fff", padding: "10px 24px",
                borderRadius: 8, cursor: "pointer",
                fontFamily: "var(--sans)", fontWeight: 700, fontSize: "0.9rem",
                boxShadow: "0 0 24px rgba(139,92,246,0.4)",
                display: "flex", alignItems: "center", gap: 8
              }}>
                <Icon.Unlock /> Unlock Full Report — $4.99
              </button>
            </div>
          </div>

          {/* Recommendations preview */}
          <div className="glass" style={{ padding: 24 }}>
            <div style={{ fontSize: "0.7rem", color: "var(--muted)", fontFamily: "var(--mono)", marginBottom: 16, letterSpacing: "0.05em" }}>SECURITY RECOMMENDATIONS</div>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px", background: "rgba(244,63,94,0.06)", borderRadius: 8, border: "1px solid rgba(244,63,94,0.15)" }}>
              <span style={{ color: "var(--rose)", fontSize: "1rem" }}>🔴</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--rose)", marginBottom: 4 }}>Immediate password change required</div>
                <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>Credentials from 2016 may still be active. Change passwords on all linked services.</div>
              </div>
            </div>
            <div style={{
              marginTop: 12, padding: "12px", background: "rgba(139,92,246,0.06)",
              borderRadius: 8, border: "1px solid rgba(139,92,246,0.15)",
              display: "flex", alignItems: "center", gap: 8,
              fontSize: "0.82rem", color: "var(--muted)"
            }}>
              <Icon.Lock /> <span style={{ color: "var(--violet)" }}>3 more recommendations</span> — unlock to view
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 24, display: "flex", gap: 12, justifyContent: "center" }}>
        <button onClick={() => setPage("payment")} style={{
          background: "linear-gradient(135deg, var(--violet), var(--cyan))",
          border: "none", color: "#fff", padding: "12px 32px",
          borderRadius: 8, cursor: "pointer",
          fontFamily: "var(--sans)", fontWeight: 800, fontSize: "1rem",
          boxShadow: "0 0 30px rgba(139,92,246,0.4)",
          display: "flex", alignItems: "center", gap: 8
        }}>
          <Icon.Unlock /> Unlock Full Report — $4.99
        </button>
      </div>
    </div>
  );
}

// ─── PAYMENT PAGE ─────────────────────────────────────────────────────────────
function PaymentPage({ scanData, setPage }) {
  const [coin, setCoin] = useState("ETH");
  const [step, setStep] = useState("select"); // select | awaiting | confirmed
  const [countdown, setCountdown] = useState(1200);
  const [copied, setCopied] = useState(false);

  const wallets = {
    BTC: { addr: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh", amount: "0.000192", usd: "$4.99" },
    ETH: { addr: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e", amount: "0.00183", usd: "$4.99" },
    USDT: { addr: "TJkrPH8V8sGYmhTAKN8sqtfFDeZy3qPDJW", amount: "4.99", usd: "$4.99" },
  };

  useEffect(() => {
    if (step !== "awaiting") return;
    const iv = setInterval(() => {
      setCountdown(c => {
        if (c <= 0) { clearInterval(iv); return 0; }
        return c - 1;
      });
    }, 1000);
    // Simulate confirmation after 8s for demo
    const t = setTimeout(() => setStep("confirmed"), 8000);
    return () => { clearInterval(iv); clearTimeout(t); };
  }, [step]);

  function copy(text) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const fmt = (s) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
  const w = wallets[coin];

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "100px 32px" }}>
      <div style={{ width: "100%", maxWidth: 520 }}>

        {step === "select" && (
          <>
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <h1 style={{ fontSize: "1.8rem", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 8 }}>Unlock Full Report</h1>
              <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>One-time crypto payment. No subscription. Instant access.</p>
            </div>

            <div className="glass" style={{ padding: 28 }}>
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: "0.75rem", color: "var(--muted)", fontFamily: "var(--mono)", marginBottom: 12, letterSpacing: "0.05em" }}>SELECT CRYPTOCURRENCY</div>
                <div style={{ display: "flex", gap: 10 }}>
                  {["BTC", "ETH", "USDT"].map(c => (
                    <button key={c} onClick={() => setCoin(c)} style={{
                      flex: 1, padding: "12px 8px",
                      background: coin === c ? "rgba(139,92,246,0.15)" : "var(--surface)",
                      border: coin === c ? "1px solid rgba(139,92,246,0.5)" : "1px solid var(--rim)",
                      borderRadius: 8, cursor: "pointer", color: coin === c ? "var(--violet)" : "var(--muted)",
                      fontFamily: "var(--mono)", fontWeight: 700, fontSize: "0.85rem",
                      transition: "all 0.2s"
                    }}>
                      {c === "BTC" ? "₿ BTC" : c === "ETH" ? "Ξ ETH" : "₮ USDT"}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ background: "var(--surface)", borderRadius: 8, padding: 20, marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: "0.82rem", color: "var(--muted)" }}>Amount</span>
                  <span style={{ fontFamily: "var(--mono)", fontWeight: 700, color: "var(--text)" }}>{w.amount} {coin}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: "0.82rem", color: "var(--muted)" }}>USD Value</span>
                  <span style={{ fontFamily: "var(--mono)", fontWeight: 700, color: "var(--cyan)" }}>{w.usd}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "0.82rem", color: "var(--muted)" }}>Access granted</span>
                  <span style={{ fontFamily: "var(--mono)", fontSize: "0.82rem", color: "var(--green)" }}>Immediately</span>
                </div>
              </div>

              <button onClick={() => setStep("awaiting")} style={{
                width: "100%", padding: "13px",
                background: "linear-gradient(135deg, var(--violet), var(--cyan))",
                border: "none", color: "#fff", borderRadius: 8, cursor: "pointer",
                fontFamily: "var(--sans)", fontWeight: 800, fontSize: "0.95rem",
                boxShadow: "0 0 28px rgba(139,92,246,0.35)",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8
              }}>
                Generate Payment Invoice
              </button>
            </div>
          </>
        )}

        {step === "awaiting" && (
          <>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ fontSize: "0.75rem", fontFamily: "var(--mono)", color: "var(--amber)", marginBottom: 8 }}>⏱ Invoice expires in {fmt(countdown)}</div>
              <h2 style={{ fontSize: "1.5rem", fontWeight: 800 }}>Send {w.amount} {coin}</h2>
            </div>
            <div className="glass" style={{ padding: 28 }}>
              {/* QR Placeholder */}
              <div style={{
                width: 160, height: 160, margin: "0 auto 24px",
                background: "#fff", borderRadius: 12,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "0.7rem", color: "#333", textAlign: "center", padding: 8,
                fontFamily: "var(--mono)"
              }}>
                [QR Code]<br />{coin}<br />{w.amount}
              </div>
              <div style={{ fontSize: "0.72rem", color: "var(--muted)", fontFamily: "var(--mono)", marginBottom: 8, letterSpacing: "0.05em" }}>WALLET ADDRESS</div>
              <div style={{
                display: "flex", gap: 0,
                background: "var(--surface)", border: "1px solid var(--rim)", borderRadius: 8, overflow: "hidden"
              }}>
                <code style={{ flex: 1, padding: "10px 12px", fontSize: "0.72rem", color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {w.addr}
                </code>
                <button onClick={() => copy(w.addr)} style={{
                  padding: "10px 14px", background: copied ? "var(--green)" : "var(--violet)",
                  border: "none", cursor: "pointer", color: "#fff", transition: "background 0.2s"
                }}>
                  <Icon.Copy />
                </button>
              </div>
              <div style={{ marginTop: 16, padding: 12, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 8, fontSize: "0.78rem", color: "var(--amber)" }}>
                ⚡ Listening for on-chain confirmation. This page auto-updates. Do not close.
              </div>
              <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ flex: 1, height: 4, background: "var(--surface)", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", background: "var(--amber)", width: "30%", animation: "scan-beam 2s ease infinite" }} />
                </div>
                <span style={{ fontSize: "0.72rem", fontFamily: "var(--mono)", color: "var(--muted)" }}>Awaiting TX…</span>
              </div>
            </div>
          </>
        )}

        {step === "confirmed" && (
          <div style={{ textAlign: "center" }}>
            <div style={{
              width: 80, height: 80, borderRadius: "50%", margin: "0 auto 24px",
              background: "rgba(16,185,129,0.15)", border: "2px solid var(--green)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "2rem", boxShadow: "0 0 30px rgba(16,185,129,0.3)"
            }}>✓</div>
            <h2 style={{ fontSize: "1.8rem", fontWeight: 800, marginBottom: 8 }}>Payment Confirmed!</h2>
            <p style={{ color: "var(--muted)", marginBottom: 28 }}>Your full breach report is now unlocked.</p>
            <div className="glass" style={{ padding: 24, marginBottom: 24, textAlign: "left" }}>
              {["All 4 breach sources revealed", "Password hashes visible", "Security recommendations unlocked", "PDF export enabled", "Access valid for 30 days"].map((f, i) => (
                <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10, alignItems: "center" }}>
                  <span style={{ color: "var(--green)" }}><Icon.Check /></span>
                  <span style={{ fontSize: "0.88rem" }}>{f}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setPage("results")} style={{
              background: "linear-gradient(135deg, var(--violet), var(--cyan))",
              border: "none", color: "#fff", padding: "12px 32px",
              borderRadius: 8, cursor: "pointer",
              fontFamily: "var(--sans)", fontWeight: 800, fontSize: "1rem",
              boxShadow: "0 0 30px rgba(139,92,246,0.4)",
              display: "flex", alignItems: "center", gap: 8, margin: "0 auto"
            }}>
              <Icon.Unlock /> View Full Report
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── API DOCS PAGE ────────────────────────────────────────────────────────────
function DocsPage() {
  const [activeTab, setActiveTab] = useState("scan");

  const endpoints = {
    scan: {
      method: "POST", path: "/api/v1/scan",
      desc: "Submit an email or domain for breach scanning.",
      request: `{
  "target": "john@example.com",
  "type": "email",          // "email" | "domain"
  "depth": "full"           // "preview" | "full"
}`,
      response: `{
  "scan_id": "scn_7xKp2mN8qR3wL",
  "status": "queued",
  "target": "john@example.com",
  "estimated_seconds": 8,
  "created_at": "2024-11-20T14:32:00Z"
}`
    },
    result: {
      method: "GET", path: "/api/v1/scan-result/{scan_id}",
      desc: "Retrieve completed scan results. Requires paid access token for full report.",
      request: `// Headers:
// X-API-Key: lw_sk_your_key_here
// X-Access-Token: <token_from_payment>  (optional, for full report)`,
      response: `{
  "scan_id": "scn_7xKp2mN8qR3wL",
  "status": "completed",
  "target": "john@example.com",
  "risk_score": 82,
  "risk_level": "critical",
  "total_exposures": 4,
  "password_reuse_probability": 0.73,
  "first_breach": "2016-08-31",
  "latest_breach": "2021-06-22",
  "breaches": [
    {
      "service": "LinkedIn",
      "date": "2021-06-22",
      "severity": "critical",
      "records_affected": 700000000,
      "data_types": ["email","phone","address"],
      "is_verified": true
    }
    // ... more breaches (full report only)
  ],
  "recommendations": [
    "Change all passwords immediately",
    "Enable 2FA on linked accounts"
  ]
}`
    },
    payment: {
      method: "POST", path: "/api/v1/payment",
      desc: "Create a crypto payment invoice to unlock a scan report.",
      request: `{
  "scan_id": "scn_7xKp2mN8qR3wL",
  "currency": "ETH",       // "BTC" | "ETH" | "USDT"
  "tier": "single"         // "single" | "domain_pack"
}`,
      response: `{
  "payment_id": "pay_9aXt4bK1",
  "status": "pending",
  "currency": "ETH",
  "amount": "0.00183",
  "usd_amount": "4.99",
  "wallet_address": "0x742d35Cc66...",
  "qr_code_url": "https://api.leakwatch.io/qr/pay_9aXt4bK1",
  "expires_at": "2024-11-20T14:52:00Z"
}`
    },
    "payment-status": {
      method: "GET", path: "/api/v1/payment/{payment_id}",
      desc: "Check payment confirmation status and retrieve access token.",
      request: `// Headers:
// X-API-Key: lw_sk_your_key_here`,
      response: `{
  "payment_id": "pay_9aXt4bK1",
  "status": "confirmed",   // "pending"|"confirmed"|"expired"
  "tx_hash": "0xabc123...",
  "confirmed_at": "2024-11-20T14:35:12Z",
  "access_token": "lw_at_Xk9mP2nQ7rT4",
  "expires_at": "2024-12-20T14:35:12Z"
}`
    }
  };

  const ep = endpoints[activeTab];

  return (
    <div style={{ minHeight: "100vh", padding: "100px 32px 60px", maxWidth: 1000, margin: "0 auto" }}>
      <div style={{ marginBottom: 40 }}>
        <span style={{ fontFamily: "var(--mono)", fontSize: "0.72rem", color: "var(--violet)", letterSpacing: "0.1em" }}>API REFERENCE</span>
        <h1 style={{ fontSize: "2rem", fontWeight: 800, marginTop: 8, letterSpacing: "-0.02em" }}>LeakWatch REST API</h1>
        <p style={{ color: "var(--muted)", marginTop: 8 }}>Base URL: <code style={{ fontFamily: "var(--mono)", color: "var(--cyan)", background: "var(--surface)", padding: "2px 8px", borderRadius: 4 }}>https://api.leakwatch.io/api/v1</code></p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 24 }}>
        {/* Sidebar */}
        <div>
          {Object.entries(endpoints).map(([key, ep]) => (
            <button key={key} onClick={() => setActiveTab(key)} style={{
              width: "100%", textAlign: "left", padding: "10px 14px",
              background: activeTab === key ? "rgba(139,92,246,0.15)" : "transparent",
              border: "none", borderLeft: activeTab === key ? "2px solid var(--violet)" : "2px solid transparent",
              borderRadius: "0 6px 6px 0", cursor: "pointer",
              color: activeTab === key ? "var(--text)" : "var(--muted)",
              marginBottom: 4, transition: "all 0.2s"
            }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: "0.65rem", color: ep.method === "POST" ? "var(--amber)" : "var(--cyan)", marginBottom: 2 }}>{ep.method}</div>
              <div style={{ fontFamily: "var(--mono)", fontSize: "0.78rem" }}>{key}</div>
            </button>
          ))}
        </div>

        {/* Content */}
        <div>
          <div className="glass" style={{ padding: 28 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 16 }}>
              <span style={{
                padding: "3px 10px", borderRadius: 4, fontSize: "0.72rem",
                fontFamily: "var(--mono)", fontWeight: 700,
                background: ep.method === "POST" ? "rgba(245,158,11,0.15)" : "rgba(0,229,255,0.1)",
                color: ep.method === "POST" ? "var(--amber)" : "var(--cyan)",
                border: `1px solid currentColor`
              }}>{ep.method}</span>
              <code style={{ fontFamily: "var(--mono)", fontSize: "0.9rem", color: "var(--text)" }}>{ep.path}</code>
            </div>
            <p style={{ color: "var(--muted)", fontSize: "0.88rem", marginBottom: 24 }}>{ep.desc}</p>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: "0.72rem", color: "var(--muted)", fontFamily: "var(--mono)", marginBottom: 8, letterSpacing: "0.05em" }}>REQUEST</div>
              <pre style={{
                background: "var(--ink)", border: "1px solid var(--rim)", borderRadius: 8,
                padding: 16, fontFamily: "var(--mono)", fontSize: "0.78rem",
                color: "#a5f3fc", lineHeight: 1.7, overflow: "auto"
              }}>{ep.request}</pre>
            </div>

            <div>
              <div style={{ fontSize: "0.72rem", color: "var(--muted)", fontFamily: "var(--mono)", marginBottom: 8, letterSpacing: "0.05em" }}>RESPONSE</div>
              <pre style={{
                background: "var(--ink)", border: "1px solid var(--rim)", borderRadius: 8,
                padding: 16, fontFamily: "var(--mono)", fontSize: "0.78rem",
                color: "#bbf7d0", lineHeight: 1.7, overflow: "auto"
              }}>{ep.response}</pre>
            </div>
          </div>

          {/* Auth note */}
          <div className="glass" style={{ padding: 20, marginTop: 16 }}>
            <div style={{ fontSize: "0.72rem", color: "var(--muted)", fontFamily: "var(--mono)", marginBottom: 10, letterSpacing: "0.05em" }}>AUTHENTICATION</div>
            <code style={{ fontFamily: "var(--mono)", fontSize: "0.82rem", color: "var(--cyan)" }}>
              X-API-Key: lw_sk_xxxxxxxxxxxxxxxxxxxxxxxx
            </code>
            <p style={{ fontSize: "0.8rem", color: "var(--muted)", marginTop: 8 }}>API keys available with Developer tier ($79/mo). Rate limit: 100 req/min. Get key after signup.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
export default function LeakWatch() {
  const [page, setPage] = useState("home");
  const [scanData, setScanData] = useState(null);

  return (
    <>
      <style>{css}</style>
      <Nav page={page} setPage={setPage} />

      {page === "home" && <HomePage setPage={setPage} />}
      {page === "scan" && <ScanPage setPage={setPage} setScanData={setScanData} />}
      {page === "results" && <ResultsPage scanData={scanData} setPage={setPage} />}
      {page === "payment" && <PaymentPage scanData={scanData} setPage={setPage} />}
      {page === "docs" && <DocsPage />}

      <footer style={{
        borderTop: "1px solid var(--rim)", padding: "40px 32px",
        textAlign: "center", background: "rgba(6,9,18,0.8)"
      }}>
        <div style={{ fontWeight: 800, fontSize: "1.1rem", marginBottom: 8 }}>
          Leak<span style={{ color: "var(--cyan)" }}>Watch</span>
        </div>
        <div style={{ fontSize: "0.78rem", color: "var(--muted)", fontFamily: "var(--mono)" }}>
          © 2026 LeakWatch · Credential Exposure Intelligence · All rights reserved
        </div>
      </footer>
    </>
  );
}
