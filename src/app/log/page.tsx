"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { fetchMovements, actionColors } from "@/lib/data";
import { Movement } from "@/lib/supabase";
import { getSession } from "@/lib/auth";

function ActionBadge({ action }: { action: string }) {
  const color = actionColors[action] ?? "#8b93a8";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 8px",
        borderRadius: 4,
        fontSize: 10,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.07em",
        backgroundColor: color + "18",
        color,
        whiteSpace: "nowrap",
      }}
    >
      {action.replace("_", " ")}
    </span>
  );
}

export default function LogPage() {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(true);
  const [userBranch, setUserBranch] = useState("");

  useEffect(() => {
    const ses = getSession();
    if (ses && !ses.isAdmin) {
      setIsAdmin(false);
      setUserBranch(ses.branch);
    }
    fetchMovements().then((data) => {
      setMovements(data);
      setLoading(false);
    });
  }, []);

  const scopedMovements = isAdmin ? movements : movements.filter((m) => m.branch === userBranch);

  return (
    <AppShell>
      <div className="page-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">Movement Log</h1>
            <p className="page-subtitle">
              Append-only audit trail — every operation logged permanently
            </p>
          </div>
          <div
            style={{
              padding: "6px 14px",
              backgroundColor: "rgba(49,200,110,0.1)",
              border: "1px solid rgba(49,200,110,0.2)",
              borderRadius: 6,
              fontSize: 12,
              color: "var(--brand-green)",
              fontWeight: 600,
            }}
          >
            Append-only
          </div>
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
              Loading movement log…
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Action</th>
                  <th>Type</th>
                  <th>SIM / IMEI</th>
                  <th>Vehicle</th>
                  <th>Status Change</th>
                  <th>User</th>
                  <th>Branch</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {scopedMovements.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>
                        {new Date(row.logged_at).toLocaleTimeString("en-GB", {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        {new Date(row.logged_at).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "2-digit",
                        })}
                      </div>
                    </td>
                    <td>
                      <ActionBadge action={row.action} />
                    </td>
                    <td style={{ fontSize: 12 }}>{row.item_type}</td>
                    <td>
                      <div>
                        {row.sim && (
                          <span className="mono" style={{ fontSize: 11, display: "block" }}>
                            {row.sim.slice(-8)}
                          </span>
                        )}
                        {row.imei && (
                          <span className="mono" style={{ fontSize: 11, display: "block" }}>
                            {row.imei}
                          </span>
                        )}
                        {!row.sim && !row.imei && (
                          <span style={{ color: "var(--text-muted)", fontSize: 11 }}>—</span>
                        )}
                      </div>
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {row.vehicle ? (
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            backgroundColor: "var(--surface-3)",
                            padding: "2px 6px",
                            borderRadius: 3,
                            color: "var(--text-secondary)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {row.vehicle}
                        </span>
                      ) : (
                        <span style={{ color: "var(--text-muted)", fontSize: 11 }}>—</span>
                      )}
                    </td>
                    <td>
                      <div style={{ fontSize: 11 }}>
                        <span style={{ color: "var(--text-muted)" }}>{row.from_status}</span>
                        <span style={{ color: "var(--text-muted)", margin: "0 4px" }}>→</span>
                        <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>
                          {row.to_status}
                        </span>
                      </div>
                    </td>
                    <td style={{ fontSize: 12 }}>{row.user_id}</td>
                    <td>
                      <span className="branch-tag">{row.branch}</span>
                    </td>
                    <td style={{ fontSize: 11, fontStyle: "italic", color: "var(--text-muted)" }}>
                      {row.notes || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div
          style={{
            marginTop: 16,
            padding: "12px 16px",
            backgroundColor: "var(--surface-2)",
            border: "1px solid var(--border-subtle)",
            borderRadius: 6,
            fontSize: 12,
            color: "var(--text-muted)",
          }}
        >
          {loading ? "Loading…" : `Showing ${scopedMovements.length} entries. Live data from Supabase.`}
        </div>
      </div>
    </AppShell>
  );
}
