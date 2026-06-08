"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { fetchCustomers, fetchInstallations } from "@/lib/data";
import { Customer, Installation } from "@/lib/supabase";
import { getSession } from "@/lib/auth";
import { ChevronRight, Fuel, Truck, Search } from "lucide-react";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [installations, setInstallations] = useState<Installation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [isAdmin, setIsAdmin] = useState(true);
  const [userBranch, setUserBranch] = useState("");

  useEffect(() => {
    const ses = getSession();
    if (ses && !ses.isAdmin) {
      setIsAdmin(false);
      setUserBranch(ses.branch);
    }
    Promise.all([fetchCustomers(), fetchInstallations()]).then(([c, i]) => {
      setCustomers(c);
      setInstallations(i);
      setLoading(false);
    });
  }, []);

  // role-based branch scope: supervisors only see their branch
  const scopedCustomers = isAdmin ? customers : customers.filter((c) => c.branch === userBranch);
  const scopedInstalls = isAdmin ? installations : installations.filter((i) => i.branch === userBranch);

  const filteredCustomers = scopedCustomers.filter((c) =>
    !query || c.name.toLowerCase().includes(query.toLowerCase())
  );

  const customerInstalls = selected
    ? scopedInstalls.filter((i) => i.customer === selected)
    : [];

  const selectedCustomer = selected ? scopedCustomers.find((c) => c.name === selected) : null;

  return (
    <AppShell>
      <div className="page-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">Customers</h1>
            <p className="page-subtitle">
              {scopedCustomers.length} active clients ·{" "}
              {scopedCustomers.reduce((a, c) => a + (c.vehicles ?? 0), 0)} total vehicles
              {!isAdmin && ` · ${userBranch}`}
            </p>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: "60px 20px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
            Loading customer data…
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 16, alignItems: "start" }}>
            {/* Customer list */}
            <div
              style={{
                backgroundColor: "var(--surface-2)",
                border: "1px solid var(--border-subtle)",
                borderRadius: 10,
                overflow: "hidden",
              }}
            >
              <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border-subtle)" }}>
                <div className="search-wrap" style={{ width: "100%" }}>
                  <Search size={13} className="search-icon" />
                  <input
                    className="search-input"
                    placeholder="Search customers…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    style={{ width: "100%" }}
                  />
                </div>
              </div>

              <div style={{ overflowY: "auto", maxHeight: 520 }}>
                {filteredCustomers.length === 0 ? (
                  <div style={{ padding: "24px 16px", textAlign: "center", fontSize: 12, color: "var(--text-muted)" }}>
                    No customers match.
                  </div>
                ) : (
                  filteredCustomers.map((c) => {
                    const isActive = selected === c.name;
                    return (
                      <button
                        key={c.name}
                        onClick={() => setSelected(c.name === selected ? null : c.name)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          padding: "12px 14px",
                          width: "100%",
                          textAlign: "left",
                          backgroundColor: isActive ? "rgba(57,102,255,0.08)" : "transparent",
                          borderBottom: "1px solid var(--border-subtle)",
                          borderTop: "none",
                          borderLeft: "none",
                          borderRight: "none",
                          cursor: "pointer",
                          transition: "background-color 120ms",
                        }}
                      >
                        <div
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 8,
                            backgroundColor: isActive ? "var(--brand-blue)" : "rgba(57,102,255,0.1)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 11,
                            fontWeight: 700,
                            color: isActive ? "white" : "var(--brand-blue)",
                            flexShrink: 0,
                          }}
                        >
                          {c.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: isActive ? "var(--brand-blue)" : "var(--text-primary)",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              lineHeight: 1.3,
                            }}
                          >
                            {c.name}
                          </div>
                          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                            {c.installed} installed · {c.branch}
                          </div>
                        </div>
                        <ChevronRight
                          size={13}
                          color={isActive ? "var(--brand-blue)" : "var(--text-muted)"}
                          style={{ flexShrink: 0 }}
                        />
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Detail panel */}
            {selectedCustomer ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div
                  style={{
                    backgroundColor: "var(--surface-2)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: 10,
                    padding: "24px 28px",
                    display: "flex",
                    gap: 24,
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 14,
                      backgroundColor: "var(--brand-blue)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 20,
                      fontWeight: 700,
                      color: "white",
                      flexShrink: 0,
                    }}
                  >
                    {selectedCustomer.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: 20,
                        fontWeight: 700,
                        color: "var(--text-primary)",
                        letterSpacing: "-0.02em",
                        lineHeight: 1.2,
                      }}
                    >
                      {selectedCustomer.name}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>
                      Primary branch:{" "}
                      <span className="branch-tag" style={{ marginLeft: 4 }}>
                        {selectedCustomer.branch}
                      </span>
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 2,
                      backgroundColor: "var(--surface-1)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: 10,
                      overflow: "hidden",
                    }}
                  >
                    {[
                      { label: "Vehicles", value: selectedCustomer.vehicles, color: "var(--brand-blue)" },
                      { label: "Installed", value: selectedCustomer.installed, color: "var(--brand-green)" },
                      { label: "With Fuel", value: selectedCustomer.with_fuel, color: "#06b6d4" },
                    ].map((m, i) => (
                      <div
                        key={m.label}
                        style={{
                          padding: "16px 24px",
                          textAlign: "center",
                          borderRight: i < 2 ? "1px solid var(--border-subtle)" : "none",
                          backgroundColor: "var(--surface-2)",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 26,
                            fontWeight: 700,
                            color: m.color,
                            letterSpacing: "-0.03em",
                            lineHeight: 1,
                          }}
                        >
                          {m.value}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4, fontWeight: 500 }}>
                          {m.label}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: "var(--surface-2)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: 10,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      padding: "14px 20px",
                      borderBottom: "1px solid var(--border-subtle)",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <Truck size={14} color="var(--text-muted)" />
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>
                      Installed Fleet
                    </span>
                    <span
                      style={{
                        marginLeft: "auto",
                        fontSize: 11,
                        color: "var(--text-muted)",
                        backgroundColor: "var(--surface-3)",
                        padding: "2px 8px",
                        borderRadius: 4,
                      }}
                    >
                      {customerInstalls.length} records
                    </span>
                  </div>
                  <table>
                    <thead>
                      <tr>
                        <th>Vehicle</th>
                        <th>IMEI</th>
                        <th>Model</th>
                        <th>Status</th>
                        <th>Install Date</th>
                        <th>Location</th>
                        <th>Fuel</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customerInstalls.length === 0 ? (
                        <tr>
                          <td colSpan={7} style={{ textAlign: "center", color: "var(--text-muted)", padding: "32px" }}>
                            No installation records found.
                          </td>
                        </tr>
                      ) : (
                        customerInstalls.map((i) => (
                          <tr key={i.id}>
                            <td>
                              <span
                                className="mono"
                                style={{
                                  fontWeight: 700,
                                  color: "var(--brand-blue)",
                                  fontSize: 12,
                                  backgroundColor: "rgba(57,102,255,0.08)",
                                  padding: "2px 7px",
                                  borderRadius: 4,
                                  border: "1px solid rgba(57,102,255,0.18)",
                                  letterSpacing: "0.02em",
                                }}
                              >
                                {i.vehicle ?? "—"}
                              </span>
                            </td>
                            <td><span className="mono">{i.imei}</span></td>
                            <td style={{ fontSize: 11, color: "var(--text-secondary)" }}>{i.model}</td>
                            <td>
                              <span className={`badge badge-${i.status.toLowerCase().replace(/ /g, "-")}`}>{i.status}</span>
                            </td>
                            <td style={{ fontSize: 12 }}>{i.install_date ?? "—"}</td>
                            <td style={{ fontSize: 12 }}>{i.location ?? "—"}</td>
                            <td>
                              {i.fuel_serial ? (
                                <Fuel size={13} color="#06b6d4" />
                              ) : (
                                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>—</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div
                style={{
                  backgroundColor: "var(--surface-2)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: 10,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 80,
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: "50%",
                    backgroundColor: "var(--surface-3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Truck size={24} color="var(--text-muted)" strokeWidth={1.5} />
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-secondary)", marginTop: 6 }}>
                  Select a customer
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  Click any customer to view their fleet details
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
