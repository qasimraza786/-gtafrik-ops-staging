"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { Plus, ShieldCheck, UserX, UserCheck, X } from "lucide-react";
import {
  fetchUsers, fetchDataQuality, createUser, setUserActive,
  type AdminUser, type DataQualityCheck,
} from "@/lib/admin";
import type { UserRole } from "@/lib/auth";

const BRANCHES = ["Kinshasa", "LSHI", "Brazza"];

function RoleBadge({ role }: { role: string }) {
  const map: Record<string, string> = {
    FOUNDER: "role-founder",
    ADMIN: "role-admin",
    SUPERVISOR: "role-supervisor",
  };
  return <span className={`badge ${map[role] ?? ""}`} style={{ fontSize: 10 }}>{role}</span>;
}

type FormState = { name: string; email: string; password: string; role: UserRole; branch: string };

function NewUserModal({
  preset, onClose, onCreated,
}: {
  preset: "ADMIN" | "SUPERVISOR";
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState<FormState>({
    name: "", email: "", password: "",
    role: preset, branch: preset === "SUPERVISOR" ? "Kinshasa" : "Kinshasa",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const set = (k: keyof FormState, v: string) => setForm(p => ({ ...p, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(""); setBusy(true);
    try {
      await createUser({
        name: form.name, email: form.email, password: form.password,
        role: form.role, branch: form.role === "ADMIN" ? "Kinshasa" : form.branch,
      });
      onCreated();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to create user.");
      setBusy(false);
    }
  };

  const label: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6, display: "block" };
  const input: React.CSSProperties = { width: "100%", padding: "10px 12px", border: "1px solid var(--border-default)", borderRadius: 7, fontSize: 14, backgroundColor: "var(--surface-1)", color: "var(--text-primary)", boxSizing: "border-box", fontFamily: "inherit" };

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }} style={{
      position: "fixed", inset: 0, zIndex: 999, backgroundColor: "rgba(10,14,26,0.72)",
      backdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
    }}>
      <form onSubmit={submit} style={{
        backgroundColor: "var(--surface-0)", borderRadius: 14, width: "100%", maxWidth: 440,
        border: "1px solid var(--border-default)", boxShadow: "0 32px 96px rgba(0,0,0,0.3)", overflow: "hidden",
      }}>
        <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>
            New {preset === "ADMIN" ? "Admin" : "Supervisor"}
          </span>
          <button type="button" onClick={onClose} style={{ background: "none", border: "1px solid var(--border-subtle)", borderRadius: 7, padding: "5px 7px", cursor: "pointer", color: "var(--text-muted)", display: "flex" }}>
            <X size={14} />
          </button>
        </div>

        <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={label}>Full Name</label>
            <input style={input} value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Jean Mukendi" required />
          </div>
          <div>
            <label style={label}>Email</label>
            <input style={input} type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="name@gtafrik.com" required />
          </div>
          <div>
            <label style={label}>Temporary Password</label>
            <input style={input} type="text" value={form.password} onChange={e => set("password", e.target.value)} placeholder="min 6 characters" minLength={6} required />
          </div>
          {preset === "SUPERVISOR" && (
            <div>
              <label style={label}>Branch</label>
              <select style={{ ...input, cursor: "pointer" }} value={form.branch} onChange={e => set("branch", e.target.value)}>
                {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          )}
          {err && (
            <div style={{ fontSize: 12, color: "#b91c1c", backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, padding: "9px 12px" }}>{err}</div>
          )}
        </div>

        <div style={{ padding: "16px 22px", borderTop: "1px solid var(--border-subtle)", display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button type="button" onClick={onClose} className="btn btn-ghost">Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? "Creating…" : "Create account"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function AdminPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [quality, setQuality] = useState<DataQualityCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"ADMIN" | "SUPERVISOR" | null>(null);

  const load = () => {
    Promise.all([fetchUsers(), fetchDataQuality()]).then(([u, q]) => {
      setUsers(u); setQuality(q); setLoading(false);
    });
  };
  useEffect(load, []);

  const toggleActive = async (u: AdminUser) => {
    await setUserActive(u.email, !u.active);
    load();
  };

  return (
    <AppShell>
      <div className="page-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">Admin Panel</h1>
            <p className="page-subtitle">User management · Role-based access · Data quality</p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn btn-ghost" onClick={() => setModal("SUPERVISOR")}>
              <Plus size={13} /> New Supervisor
            </button>
            <button className="btn btn-primary" onClick={() => setModal("ADMIN")}>
              <Plus size={13} /> New Admin
            </button>
          </div>
        </div>

        <div style={{ backgroundColor: "var(--surface-2)", border: "1px solid var(--border-subtle)", borderRadius: 8, overflow: "hidden", marginBottom: 24 }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", gap: 8 }}>
            <ShieldCheck size={14} color="var(--brand-blue)" />
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>User Accounts</span>
            <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-muted)", backgroundColor: "var(--surface-3)", padding: "2px 8px", borderRadius: 4 }}>
              {loading ? "…" : `${users.length} accounts`}
            </span>
          </div>
          {loading ? (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>Loading users…</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Name</th><th>Email</th><th>Role</th><th>Branch</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 600 }}>{u.name}</td>
                    <td><span className="mono">{u.email}</span></td>
                    <td><RoleBadge role={u.role} /></td>
                    <td>
                      {u.is_admin ? (
                        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>All branches</span>
                      ) : (
                        <span className="branch-tag">{u.branch}</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${u.active ? "badge-installed" : ""}`} style={u.active ? {} : { backgroundColor: "rgba(239,68,68,0.1)", color: "#ef4444" }}>
                        {u.active ? "ACTIVE" : "DISABLED"}
                      </span>
                    </td>
                    <td>
                      {u.role !== "FOUNDER" && (
                        <button
                          onClick={() => toggleActive(u)}
                          style={{
                            display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px",
                            borderRadius: 5, fontSize: 11, fontWeight: 600, cursor: "pointer",
                            backgroundColor: u.active ? "rgba(239,68,68,0.1)" : "rgba(49,200,110,0.1)",
                            color: u.active ? "#ef4444" : "#1a8c4a",
                            border: `1px solid ${u.active ? "rgba(239,68,68,0.2)" : "rgba(49,200,110,0.2)"}`,
                          }}
                        >
                          {u.active ? <><UserX size={11} /> Deactivate</> : <><UserCheck size={11} /> Reactivate</>}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div style={{ backgroundColor: "var(--surface-2)", border: "1px solid var(--border-subtle)", borderRadius: 8, padding: 20 }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 16 }}>Data Quality</h2>
          {loading ? (
            <div style={{ color: "var(--text-muted)", fontSize: 12 }}>Computing…</div>
          ) : quality.map(item => (
            <div key={item.check} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: "1px solid var(--border-subtle)" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                backgroundColor: item.status === "pass" ? "var(--brand-green)" : item.status === "warn" ? "#f59e0b" : "#ef4444" }} />
              <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", flex: 1 }}>{item.check}</span>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{item.detail}</span>
            </div>
          ))}
        </div>
      </div>

      {modal && (
        <NewUserModal
          preset={modal}
          onClose={() => setModal(null)}
          onCreated={() => { setModal(null); load(); }}
        />
      )}
    </AppShell>
  );
}
