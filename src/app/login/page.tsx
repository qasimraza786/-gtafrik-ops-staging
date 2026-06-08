"use client";

import { useState, useEffect } from "react";
import { Logo } from "@/components/Logo";
import { Eye, EyeOff, UserRound, ShieldCheck, CircleUserRound } from "lucide-react";
import { DEMO_ACCOUNTS, DEMO_PASSWORD, signIn, setSession } from "@/lib/auth";

const CURRENT = 1356;
const GOAL    = 10000;
const PCT     = (CURRENT / GOAL) * 100;

const BRANCHES = [
  { name: "Kinshasa",     units: 581,  pct: 42.8 },
  { name: "Lubumbashi",   units: 574,  pct: 42.3 },
  { name: "Brazzaville",  units: 201,  pct: 14.8 },
];

export default function LoginPage() {
  const [showPass, setShowPass] = useState(false);
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [mounted,  setMounted]  = useState(false);
  const [barW,     setBarW]     = useState(0);

  const demoPresets = [
    { label: "Founder demo", email: DEMO_ACCOUNTS[0], icon: ShieldCheck },
    { label: "Admin demo", email: DEMO_ACCOUNTS[1], icon: UserRound },
    { label: "Supervisor demo", email: DEMO_ACCOUNTS[4], icon: CircleUserRound },
  ];

  const quickDemoLogin = async (email: string) => {
    const profile = await signIn(email, DEMO_PASSWORD);
    setSession(profile);
    window.location.href = "/";
  };

  useEffect(() => {
    setMounted(true);
    const t = setTimeout(() => setBarW(PCT), 600);
    return () => clearTimeout(t);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);
    try {
      await signIn(email, password);
      window.location.href = "/";
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Sign in failed.");
      setLoading(false);
    }
  };

  const reveal = (delay = 0): React.CSSProperties => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? "translateY(0)" : "translateY(12px)",
    transition: `opacity 600ms ${delay}ms ease-out, transform 600ms ${delay}ms ease-out`,
  });

  return (
    <>
      <style>{`
        .lf { outline: none; }
        .lf:focus { border-color: #3966ff !important; box-shadow: 0 0 0 3px rgba(57,102,255,0.12) !important; }
        .sb:hover { background-color: oklch(46% 0.22 262) !important; }
        @media (max-width: 840px) { .ll { display: none !important; } }
      `}</style>

      <div style={{
        minHeight: "100vh",
        display: "flex",
        backgroundColor: "oklch(99% 0.003 250)",
        fontFamily: "var(--font-geist-sans, system-ui, sans-serif)",
      }}>

        {/* ── LEFT: Goal panel ── */}
        <div className="ll" style={{
          flex: "0 0 58%",
          display: "flex",
          flexDirection: "column",
          padding: "44px 56px 40px",
          background: [
            "radial-gradient(ellipse 70% 50% at 15% 40%, oklch(88% 0.06 260 / 0.55) 0%, transparent 70%)",
            "oklch(95% 0.022 260)",
          ].join(", "),
          position: "relative",
          overflow: "hidden",
        }}>

          {/* Subtle dot grid */}
          <div style={{
            position: "absolute",
            inset: 0,
            backgroundImage: "radial-gradient(circle, oklch(60% 0.08 260 / 0.18) 1.5px, transparent 1.5px)",
            backgroundSize: "24px 24px",
            pointerEvents: "none",
          }} />

          {/* Green glow bottom-right */}
          <div style={{
            position: "absolute",
            bottom: -80,
            right: -60,
            width: 320,
            height: 320,
            borderRadius: "50%",
            background: "oklch(68% 0.20 145 / 0.12)",
            filter: "blur(60px)",
            pointerEvents: "none",
          }} />

          {/* Logo — BIG */}
          <div style={{ position: "relative", ...reveal(0) }}>
            <Logo size={52} />
          </div>

          {/* Main goal block */}
          <div style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            position: "relative",
            paddingBottom: 48,
          }}>

            <div style={{ ...reveal(80), marginBottom: 6 }}>
              <span style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "#3966ff",
                background: "rgba(57,102,255,0.10)",
                padding: "4px 10px",
                borderRadius: 20,
                border: "1px solid rgba(57,102,255,0.18)",
              }}>
                The Goal
              </span>
            </div>

            {/* Giant number */}
            <div style={{
              ...reveal(160),
              fontSize: "clamp(88px, 12vw, 152px)",
              fontWeight: 800,
              color: "#3966ff",
              lineHeight: 0.87,
              letterSpacing: "-0.05em",
              fontFeatureSettings: '"tnum" 1',
            }}>
              10,000
            </div>

            <div style={{ ...reveal(240), marginTop: 10 }}>
              <span style={{
                fontSize: "clamp(24px, 3vw, 38px)",
                fontWeight: 700,
                color: "oklch(15% 0.012 250)",
                letterSpacing: "-0.03em",
                lineHeight: 1.1,
              }}>
                Vehicles
              </span>
              <span style={{
                fontSize: "clamp(24px, 3vw, 38px)",
                fontWeight: 700,
                color: "#31c86e",
                letterSpacing: "-0.03em",
                marginLeft: 10,
              }}>
                + Gensets
              </span>
            </div>

            <div style={{
              ...reveal(320),
              marginTop: 14,
              fontSize: 14,
              color: "oklch(40% 0.015 250)",
              lineHeight: 1.65,
              maxWidth: 400,
              fontStyle: "italic",
            }}>
              Every installation by every technician in every branch moves us closer.
              This is the mission.
            </div>

            {/* SCOREBOARD */}
            <div style={{ ...reveal(400), marginTop: 36 }}>
              {/* Numbers row */}
              <div style={{
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "space-between",
                marginBottom: 12,
              }}>
                <div>
                  <div style={{
                    fontSize: "clamp(32px, 4vw, 52px)",
                    fontWeight: 800,
                    color: "#3966ff",
                    letterSpacing: "-0.04em",
                    lineHeight: 1,
                    fontFeatureSettings: '"tnum" 1',
                  }}>
                    {CURRENT.toLocaleString()}
                  </div>
                  <div style={{ fontSize: 12, color: "oklch(50% 0.015 250)", marginTop: 4, fontWeight: 500 }}>
                    Active units today
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{
                    fontSize: "clamp(32px, 4vw, 52px)",
                    fontWeight: 800,
                    color: "oklch(75% 0.04 260)",
                    letterSpacing: "-0.04em",
                    lineHeight: 1,
                    fontFeatureSettings: '"tnum" 1',
                  }}>
                    {GOAL.toLocaleString()}
                  </div>
                  <div style={{ fontSize: 12, color: "oklch(60% 0.015 250)", marginTop: 4, fontWeight: 500 }}>
                    The target
                  </div>
                </div>
              </div>

              {/* Progress bar — thick */}
              <div style={{
                height: 10,
                backgroundColor: "oklch(88% 0.018 260)",
                borderRadius: 6,
                overflow: "hidden",
              }}>
                <div style={{
                  height: "100%",
                  width: `${barW}%`,
                  background: "linear-gradient(90deg, #3966ff 0%, oklch(58% 0.22 260) 100%)",
                  borderRadius: 6,
                  transition: "width 1500ms 600ms cubic-bezier(0.16, 1, 0.3, 1)",
                }} />
              </div>

              <div style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: 8,
                fontSize: 12,
              }}>
                <span style={{ color: "#3966ff", fontWeight: 700 }}>
                  {PCT.toFixed(1)}% complete
                </span>
                <span style={{ color: "oklch(55% 0.015 250)" }}>
                  {(GOAL - CURRENT).toLocaleString()} units to go
                </span>
              </div>
            </div>

            {/* Branch breakdown */}
            <div style={{ ...reveal(500), marginTop: 28, display: "flex", gap: 12 }}>
              {BRANCHES.map(b => (
                <div key={b.name} style={{
                  flex: 1,
                  padding: "10px 12px",
                  backgroundColor: "oklch(99% 0.005 250)",
                  border: "1px solid oklch(88% 0.020 260)",
                  borderRadius: 8,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#31c86e", flexShrink: 0 }} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: "oklch(25% 0.012 250)" }}>{b.name}</span>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#3966ff", letterSpacing: "-0.02em" }}>
                    {b.units.toLocaleString()}
                  </div>
                  <div style={{ fontSize: 10, color: "oklch(55% 0.012 250)", marginTop: 1 }}>
                    {b.pct}% of fleet
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer tag */}
          <div style={{ position: "relative", fontSize: 11, color: "oklch(58% 0.015 250)" }}>
            gtafrik.com · GPS Fleet Operations · Central Africa
          </div>
        </div>

        {/* ── Divider ── */}
        <div style={{ width: 1, backgroundColor: "oklch(88% 0.016 260)", flexShrink: 0 }} />

        {/* ── RIGHT: Form ── */}
        <div style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 48px",
          backgroundColor: "oklch(99% 0.003 250)",
          position: "relative",
          minHeight: "100vh",
        }}>

          <div style={{
            width: "100%",
            maxWidth: 340,
            ...reveal(100),
          }}>
            {/* Logo on form side */}
            <div style={{ marginBottom: 32 }}>
              <Logo size={38} />
              <div style={{ marginTop: 16 }}>
                <div style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: "oklch(12% 0.012 250)",
                  letterSpacing: "-0.03em",
                  marginBottom: 4,
                }}>
                  Sign in to OPS
                </div>
              <div style={{ fontSize: 13, color: "oklch(52% 0.012 250)" }}>
                  Welcome back. Let's build the fleet.
                </div>
              </div>
            </div>

            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 8,
              marginBottom: 18,
            }}>
              {demoPresets.map(({ label, email, icon: Icon }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => quickDemoLogin(email)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    padding: "10px 8px",
                    borderRadius: 8,
                    border: "1px solid oklch(88% 0.016 260)",
                    background: "oklch(98% 0.004 250)",
                    color: "oklch(25% 0.012 250)",
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  <Icon size={13} />
                  {label}
                </button>
              ))}
            </div>

            <div style={{
              marginBottom: 18,
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid rgba(57,102,255,0.14)",
              background: "rgba(57,102,255,0.06)",
              fontSize: 12,
              color: "oklch(34% 0.015 250)",
              lineHeight: 1.5,
            }}>
              Demo password: <strong>{DEMO_PASSWORD}</strong>. The buttons above log you in directly.
            </div>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div>
                <label htmlFor="email" style={{
                  display: "block",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "oklch(38% 0.012 250)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  marginBottom: 7,
                }}>
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@gtafrik.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="lf"
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    backgroundColor: "oklch(97% 0.005 250)",
                    border: "1.5px solid oklch(88% 0.016 260)",
                    borderRadius: 8,
                    fontSize: 14,
                    color: "oklch(12% 0.012 250)",
                    fontFamily: "inherit",
                    boxSizing: "border-box",
                    transition: "border-color 150ms, box-shadow 150ms",
                  }}
                />
              </div>

              <div>
                <label htmlFor="password" style={{
                  display: "block",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "oklch(38% 0.012 250)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  marginBottom: 7,
                }}>
                  Password
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    id="password"
                    type={showPass ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    className="lf"
                    style={{
                      width: "100%",
                      padding: "12px 42px 12px 14px",
                      backgroundColor: "oklch(97% 0.005 250)",
                      border: "1.5px solid oklch(88% 0.016 260)",
                      borderRadius: 8,
                      fontSize: 14,
                      color: "oklch(12% 0.012 250)",
                      fontFamily: "inherit",
                      boxSizing: "border-box",
                      transition: "border-color 150ms, box-shadow 150ms",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(s => !s)}
                    style={{
                      position: "absolute",
                      right: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 3,
                      color: "oklch(55% 0.012 250)",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {errorMsg && (
                <div style={{
                  fontSize: 12,
                  color: "#b91c1c",
                  backgroundColor: "rgba(239,68,68,0.08)",
                  border: "1px solid rgba(239,68,68,0.25)",
                  borderRadius: 8,
                  padding: "9px 12px",
                }}>
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="sb"
                style={{
                  width: "100%",
                  padding: "13px 16px",
                  backgroundColor: "#3966ff",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  color: "oklch(99% 0.003 250)",
                  cursor: loading ? "not-allowed" : "pointer",
                  fontFamily: "inherit",
                  letterSpacing: "0.01em",
                  transition: "background-color 150ms, opacity 150ms",
                  opacity: loading ? 0.7 : 1,
                  marginTop: 2,
                }}
              >
                {loading ? "Signing in…" : "Sign in"}
              </button>
            </form>

            <div style={{
              marginTop: 24,
              paddingTop: 20,
              borderTop: "1px solid oklch(90% 0.010 260)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}>
              <span style={{ fontSize: 11, color: "oklch(62% 0.010 250)" }}>
                Authorized personnel only
              </span>
              <span style={{ fontSize: 11, color: "oklch(62% 0.010 250)" }}>
                Session · 12 hours
              </span>
            </div>
          </div>

          <div style={{
            position: "absolute",
            bottom: 20,
            fontSize: 11,
            color: "oklch(70% 0.010 250)",
          }}>
            GT Afrik OPS v1.0
          </div>
        </div>
      </div>
    </>
  );
}
