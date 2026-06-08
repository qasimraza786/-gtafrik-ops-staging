"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { fetchInstallations } from "@/lib/data";
import { Installation } from "@/lib/supabase";
import { getSession } from "@/lib/auth";
import { Search } from "lucide-react";

const allBranches = ["All", "Kinshasa", "LSHI", "Brazza"];

export default function MasterPage() {
  const [installations, setInstallations] = useState<Installation[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [branch, setBranch] = useState("All");
  const [isAdmin, setIsAdmin] = useState(true);

  useEffect(() => {
    const s = getSession();
    if (s && !s.isAdmin) {
      setIsAdmin(false);
      setBranch(s.branch);
    }
    fetchInstallations().then((data) => {
      setInstallations(data);
      setLoading(false);
    });
  }, []);

  const branches = isAdmin ? allBranches : [branch];

  const filtered = installations.filter((r) => {
    const q = query.toLowerCase();
    const matchQ =
      !q ||
      (r.sim ?? "").includes(q) ||
      (r.imei ?? "").includes(q) ||
      (r.vehicle ?? "").toLowerCase().includes(q) ||
      (r.customer ?? "").toLowerCase().includes(q);
    const matchB = branch === "All" || r.branch === branch;
    return matchQ && matchB;
  });

  return (
    <AppShell>
      <div className="page-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">Fleet Master</h1>
            <p className="page-subtitle">
              All installed and historical GPS units ·{" "}
              <strong style={{ color: "var(--text-secondary)" }}>
                {installations.filter((i) => i.status === "INSTALLED").length}
              </strong>{" "}
              active
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="search-wrap">
              <Search size={13} className="search-icon" />
              <input
                className="search-input"
                placeholder="Search SIM, IMEI, vehicle, customer…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="tab-bar">
          {branches.map((b) => (
            <button
              key={b}
              className={`tab-item${branch === b ? " active" : ""}`}
              onClick={() => setBranch(b)}
            >
              {b}
            </button>
          ))}
        </div>

        <div
          style={{
            backgroundColor: "var(--surface-2)",
            border: "1px solid var(--border-subtle)",
            borderRadius: 8,
            overflow: "hidden",
          }}
        >
          {loading ? (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
              Loading fleet data…
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Vehicle</th>
                  <th>Customer</th>
                  <th>SIM (ICCID)</th>
                  <th>IMEI</th>
                  <th>Model</th>
                  <th>Status</th>
                  <th>Install Date</th>
                  <th>Location</th>
                  <th>Fuel Serial</th>
                  <th>Branch</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <span
                        className="mono"
                        style={{
                          fontWeight: 700,
                          color: "var(--brand-blue)",
                          fontSize: 12,
                          backgroundColor: "rgba(57,102,255,0.08)",
                          padding: "3px 8px",
                          borderRadius: 4,
                          border: "1px solid rgba(57,102,255,0.18)",
                          letterSpacing: "0.03em",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {row.vehicle ?? "—"}
                      </span>
                    </td>
                    <td style={{ fontWeight: 500 }}>{row.customer ?? "—"}</td>
                    <td><span className="mono">{row.sim}</span></td>
                    <td><span className="mono">{row.imei}</span></td>
                    <td><span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{row.model}</span></td>
                    <td><StatusBadge status={row.status} /></td>
                    <td style={{ fontSize: 12 }}>{row.install_date ?? "—"}</td>
                    <td style={{ fontSize: 12 }}>{row.location ?? "—"}</td>
                    <td>
                      {row.fuel_serial ? (
                        <span className="mono" style={{ color: "#06b6d4" }}>{row.fuel_serial}</span>
                      ) : (
                        <span style={{ color: "var(--text-muted)", fontSize: 11 }}>—</span>
                      )}
                    </td>
                    <td><span className="branch-tag">{row.branch}</span></td>
                    <td style={{ fontSize: 11, fontStyle: "italic", color: "var(--text-muted)" }}>
                      {row.notes || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!loading && filtered.length === 0 && (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
              No records match your search.
            </div>
          )}
        </div>

        <div
          style={{
            marginTop: 12,
            fontSize: 12,
            color: "var(--text-muted)",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span>Showing {filtered.length} of {installations.length} records</span>
          <span>Live data from Supabase</span>
        </div>
      </div>
    </AppShell>
  );
}
