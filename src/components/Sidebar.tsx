"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Zap,
  Map,
  Users,
  Package,
  ScrollText,
  ShieldCheck,
  LogOut,
  MapPin,
  ChevronRight,
} from "lucide-react";
import { Logo } from "./Logo";
import { getSession, signOut, getInitials, type SessionUser } from "@/lib/auth";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/ops", label: "Operations", icon: Zap },
  { href: "/master", label: "Fleet Master", icon: Map },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/stock", label: "Stock", icon: Package },
  { href: "/log", label: "Movement Log", icon: ScrollText },
];

const adminItems = [
  { href: "/admin", label: "Admin Panel", icon: ShieldCheck },
];

const roleCssClass: Record<string, string> = {
  FOUNDER: "role-founder",
  ADMIN: "role-admin",
  SUPERVISOR: "role-supervisor",
};

const avatarColor: Record<string, string> = {
  FOUNDER: "#6d28d9",
  ADMIN: "var(--brand-blue)",
  SUPERVISOR: "#b45309",
};

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSessionState] = useState<SessionUser | null>(null);

  useEffect(() => {
    setSessionState(getSession());
  }, []);

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  const branchLabel = session?.isAdmin ? "All Branches" : (session?.branch ?? "—");
  const initials = session ? getInitials(session.name) : "—";

  return (
    <aside
      style={{
        width: 240,
        minHeight: "100vh",
        backgroundColor: "var(--surface-0)",
        borderRight: "1px solid var(--border-subtle)",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        position: "sticky",
        top: 0,
        height: "100vh",
        overflowY: "auto",
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: "20px 20px 16px",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <Logo size={26} />
        <div
          style={{
            marginTop: 8,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <MapPin size={11} color="var(--brand-blue)" />
          <span
            style={{
              fontSize: 11,
              color: "var(--text-muted)",
              fontWeight: 500,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            {branchLabel}
          </span>
        </div>
      </div>

      {/* User pill */}
      <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border-subtle)" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "8px 10px",
            borderRadius: 6,
            backgroundColor: "var(--surface-2)",
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              backgroundColor: session ? avatarColor[session.role] : "var(--brand-blue)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              fontWeight: 700,
              color: "white",
              flexShrink: 0,
            }}
          >
            {initials}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize: 12, fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.3,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {session?.name ?? "Loading…"}
            </div>
            <div
              className={`badge ${roleCssClass[session?.role ?? "SUPERVISOR"]}`}
              style={{ marginTop: 2, display: "inline-flex", fontSize: 9, padding: "1px 5px" }}
            >
              {session?.role ?? "—"}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: "12px 10px" }}>
        <div className="section-label" style={{ padding: "0 8px", marginBottom: 6 }}>
          Platform
        </div>
        <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 1 }}>
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 10px",
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: active ? 600 : 400,
                    color: active ? "white" : "var(--text-secondary)",
                    backgroundColor: active ? "var(--brand-blue)" : "transparent",
                    textDecoration: "none",
                    transition: "all 120ms",
                  }}
                >
                  <Icon size={15} strokeWidth={active ? 2.5 : 1.8} />
                  <span style={{ flex: 1 }}>{label}</span>
                  {active && <ChevronRight size={12} opacity={0.6} />}
                </Link>
              </li>
            );
          })}
        </ul>

        {session?.isAdmin && (
          <>
            <div
              className="section-label"
              style={{ padding: "0 8px", marginBottom: 6, marginTop: 20 }}
            >
              Admin
            </div>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 1 }}>
              {adminItems.map(({ href, label, icon: Icon }) => {
                const active = pathname.startsWith(href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "8px 10px",
                        borderRadius: 6,
                        fontSize: 13,
                        fontWeight: active ? 600 : 400,
                        color: active ? "white" : "var(--text-secondary)",
                        backgroundColor: active ? "var(--brand-blue)" : "transparent",
                        textDecoration: "none",
                        transition: "all 120ms",
                      }}
                    >
                      <Icon size={15} strokeWidth={active ? 2.5 : 1.8} />
                      <span>{label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </nav>

      {/* Bottom */}
      <div style={{ padding: "12px 10px", borderTop: "1px solid var(--border-subtle)" }}>
        <button
          onClick={handleSignOut}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "8px 10px",
            borderRadius: 6,
            fontSize: 13,
            color: "var(--text-muted)",
            background: "none",
            border: "none",
            cursor: "pointer",
            width: "100%",
            transition: "color 120ms",
            fontFamily: "inherit",
          }}
        >
          <LogOut size={14} />
          <span>Sign out</span>
        </button>
        <div
          style={{
            marginTop: 12,
            padding: "0 10px",
            fontSize: 10,
            color: "var(--text-muted)",
            letterSpacing: "0.04em",
          }}
        >
          GT Afrik OPS v1.0{" "}
          <span style={{ opacity: 0.6 }}>· 2026</span>
        </div>
      </div>
    </aside>
  );
}
