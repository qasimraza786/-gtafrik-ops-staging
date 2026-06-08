"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import {
  AlertTriangle, Cpu, Fuel, Radio, CheckCircle2,
  PackagePlus, Link2, XCircle, Search, TrendingUp, BarChart3,
} from "lucide-react";
import { MonthlyTrend, BranchBars, TrendPoint } from "@/components/Charts";
import {
  fetchInstallations, fetchMovements, fetchSims, fetchDevices,
  fetchFuelSensors, fetchCustomers, fetchPairedBundles,
  fetchRTDBundles, fetchDamageEvents, actionColors,
} from "@/lib/data";
import { Installation, Movement, Sim, Device, FuelSensor, Customer, PairedBundle, RTDBundle, DamageEvent } from "@/lib/supabase";
import { getSession } from "@/lib/auth";

const branches = ["All", "Kinshasa", "LSHI", "Brazza"] as const;
type Branch = (typeof branches)[number];


const BRANCH_COLOR: Record<string, string> = { Kinshasa: "#3866ff", LSHI: "#06b6d4", Brazza: "#3f2e75" };
const BRANCH_BG: Record<string, string>    = { Kinshasa: "rgba(56,102,255,0.1)", LSHI: "rgba(6,182,212,0.1)", Brazza: "rgba(63,46,117,0.1)" };

type RangeKey = "6M" | "12M" | "All";
const RANGE_MONTHS: Record<RangeKey, number> = { "6M": 6, "12M": 12, All: 0 };

/**
 * Build a monthly installation count series from install_date, bounded to the
 * selected look-back window. Returns chronologically ordered points.
 */
function buildMonthlySeries(installs: Installation[], months: number): TrendPoint[] {
  const counts = new Map<string, number>();
  for (const it of installs) {
    const raw = it.install_date;
    if (!raw) continue;
    const d = new Date(raw);
    if (isNaN(d.getTime())) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  if (counts.size === 0) return [];

  const sortedKeys = Array.from(counts.keys()).sort();
  const sliced = months > 0 ? sortedKeys.slice(-months) : sortedKeys;
  const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return sliced.map((k) => {
    const [y, m] = k.split("-");
    return { label: `${MONTH_ABBR[Number(m) - 1]} ${y.slice(2)}`, value: counts.get(k) ?? 0 };
  });
}

function BranchPill({ branch }: { branch: string }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4,
      backgroundColor: BRANCH_BG[branch] ?? "var(--surface-2)",
      color: BRANCH_COLOR[branch] ?? "var(--text-muted)",
      letterSpacing: "0.04em",
    }}>{branch}</span>
  );
}

function MonoId({ val, color = "#3966ff" }: { val: string | null; color?: string }) {
  if (!val) return <span style={{ color: "var(--text-muted)" }}>—</span>;
  return <span className="mono" style={{ fontSize: 11, fontWeight: 700, color }}>{val}</span>;
}

function VehicleTag({ v }: { v: string }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 5,
      backgroundColor: "rgba(49,200,110,0.10)", color: "#1a8c4a",
      fontFamily: "var(--font-geist-mono, monospace)",
    }}>{v}</span>
  );
}

const TH: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase",
  letterSpacing: "0.1em", paddingBottom: 10, paddingRight: 16, textAlign: "left",
  whiteSpace: "nowrap", borderBottom: "2px solid var(--border-default)",
};
const TD: React.CSSProperties = {
  fontSize: 13, color: "var(--text-primary)", paddingTop: 11, paddingBottom: 11,
  paddingRight: 16, verticalAlign: "middle",
};

type Col = { key: string; header: string; render?: (r: Record<string, unknown>) => React.ReactNode };
type DVDef = {
  eyebrow: string; title: string; subtitle: string; actionLabel: string;
  stats: { label: string; value: string; note?: string }[];
  searchPlaceholder: string;
  rows: Record<string, unknown>[];
  columns: Col[];
};

function buildDeepView(id: string, branch: Branch, data: {
  installations: Installation[];
  sims: Sim[];
  devices: Device[];
  fuelSensors: FuelSensor[];
  pairedBundles: PairedBundle[];
  rtdBundles: RTDBundle[];
  damageEvents: DamageEvent[];
}): DVDef {
  const byBranch = <T extends { branch: string }>(arr: T[]) =>
    branch === "All" ? arr : arr.filter(r => r.branch === branch);
  const eye = branch === "All" ? "ALL BRANCH INTELLIGENCE" : `${branch.toUpperCase()} BRANCH`;
  const bl  = branch === "All" ? "All branches" : branch;

  if (id === "installed") {
    const rows = byBranch(data.installations.filter(m => m.status === "INSTALLED")) as Record<string, unknown>[];
    return {
      eyebrow: eye, title: "Installed Units", subtitle: "Installed units with SIM, IMEI, fuel serial, and customer trace.",
      actionLabel: "Open Fleet Master →",
      stats: [
        { label: "Installed Units", value: String(rows.length), note: bl },
        { label: "With Fuel Sensor", value: String(rows.filter(r => (r.fuel_serial as string | null)).length), note: "fuel traced" },
        { label: "Trace Fields", value: "SIM + IMEI", note: "bold identifiers" },
      ],
      searchPlaceholder: "Search vehicle, customer, SIM, IMEI...",
      rows,
      columns: [
        { key: "vehicle",    header: "Vehicle",     render: r => <VehicleTag v={r.vehicle as string} /> },
        { key: "customer",   header: "Customer",    render: r => <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-secondary)" }}>{r.customer as string}</span> },
        { key: "sim",        header: "SIM",         render: r => <MonoId val={r.sim as string} color="#3966ff" /> },
        { key: "imei",       header: "IMEI",        render: r => <MonoId val={r.imei as string} color="#06b6d4" /> },
        { key: "model",      header: "Model",       render: r => <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>{r.model as string}</span> },
        { key: "branch",     header: "Branch",      render: r => <BranchPill branch={r.branch as string} /> },
        { key: "fuel_serial", header: "Fuel Serial", render: r => <MonoId val={r.fuel_serial as string | null} color="#31c86e" /> },
      ],
    };
  }

  if (id === "sims") {
    const rows = byBranch(data.sims) as Record<string, unknown>[];
    return {
      eyebrow: eye, title: "SIMs in Stock", subtitle: "Available SIM cards by branch, provider, and date of entry.",
      actionLabel: "Open Stock →",
      stats: [
        { label: "Total Available", value: String(rows.length), note: bl },
        { label: "Provider", value: "Truephone", note: "primary supplier" },
        { label: "Status", value: "All Available", note: "ready for deployment" },
      ],
      searchPlaceholder: "Search SIM number, branch...",
      rows,
      columns: [
        { key: "number",     header: "SIM Number", render: r => <MonoId val={r.number as string} color="#3966ff" /> },
        { key: "provider",   header: "Provider",   render: r => <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", textTransform: "capitalize" }}>{r.provider as string}</span> },
        { key: "branch",     header: "Branch",     render: r => <BranchPill branch={r.branch as string} /> },
        { key: "date_added", header: "Date Added", render: r => <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{r.date_added as string}</span> },
        { key: "status",     header: "Status",     render: r => <span className="badge badge-rtd" style={{ fontSize: 10 }}>{r.status as string}</span> },
      ],
    };
  }

  if (id === "devices") {
    const rows = byBranch(data.devices) as Record<string, unknown>[];
    return {
      eyebrow: eye, title: "GPS Devices in Stock", subtitle: "Available GPS units by model, branch, and date received.",
      actionLabel: "Open Stock →",
      stats: [
        { label: "Total Available", value: String(rows.length), note: bl },
        { label: "Models", value: "FMB920 / FMB125", note: "primary models" },
        { label: "Status", value: "All Available", note: "ready for deployment" },
      ],
      searchPlaceholder: "Search IMEI, model, branch...",
      rows,
      columns: [
        { key: "imei",       header: "IMEI",       render: r => <MonoId val={r.imei as string} color="#06b6d4" /> },
        { key: "model",      header: "Model",      render: r => <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>{r.model as string}</span> },
        { key: "branch",     header: "Branch",     render: r => <BranchPill branch={r.branch as string} /> },
        { key: "date_added", header: "Date Added", render: r => <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{r.date_added as string}</span> },
        { key: "status",     header: "Status",     render: r => <span className="badge badge-rtd" style={{ fontSize: 10 }}>{r.status as string}</span> },
      ],
    };
  }

  if (id === "fuel") {
    const rows = byBranch(data.fuelSensors) as Record<string, unknown>[];
    return {
      eyebrow: eye, title: "Fuel Sensors in Stock", subtitle: "Available fuel sensors with MAC address and model tracing.",
      actionLabel: "Open Stock →",
      stats: [
        { label: "Total Available", value: String(rows.length), note: bl },
        { label: "Model", value: "TD_BLE", note: "Bluetooth Low Energy" },
        { label: "Coverage", value: String(new Set(rows.map(r => r.branch)).size) + " branches", note: "Kin / LSHI / Brazza" },
      ],
      searchPlaceholder: "Search serial, MAC, branch...",
      rows,
      columns: [
        { key: "serial",     header: "Serial",      render: r => <MonoId val={r.serial as string} color="#31c86e" /> },
        { key: "mac",        header: "MAC Address", render: r => <MonoId val={r.mac as string} color="#06b6d4" /> },
        { key: "model",      header: "Model",       render: r => <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>{r.model as string}</span> },
        { key: "branch",     header: "Branch",      render: r => <BranchPill branch={r.branch as string} /> },
        { key: "date_added", header: "Date Added",  render: r => <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{r.date_added as string}</span> },
        { key: "status",     header: "Status",      render: r => <span className="badge badge-rtd" style={{ fontSize: 10 }}>{r.status as string}</span> },
      ],
    };
  }

  if (id === "paired") {
    const rows = byBranch(data.pairedBundles) as Record<string, unknown>[];
    return {
      eyebrow: eye, title: "Paired Bundles", subtitle: "SIM + device pairs awaiting activation to Ready-to-Deploy status.",
      actionLabel: "Open Operations →",
      stats: [
        { label: "Paired Bundles", value: String(rows.length), note: bl },
        { label: "Next Step", value: "Activate", note: "move to RTD" },
        { label: "Ready", value: "~2 days", note: "avg before activation" },
      ],
      searchPlaceholder: "Search SIM, IMEI, model, branch...",
      rows,
      columns: [
        { key: "sim",         header: "SIM",        render: r => <MonoId val={r.sim as string} color="#3966ff" /> },
        { key: "imei",        header: "IMEI",       render: r => <MonoId val={r.imei as string} color="#06b6d4" /> },
        { key: "model",       header: "Model",      render: r => <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>{r.model as string}</span> },
        { key: "branch",      header: "Branch",     render: r => <BranchPill branch={r.branch as string} /> },
        { key: "paired_date", header: "Paired",     render: r => <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{r.paired_date as string}</span> },
      ],
    };
  }

  if (id === "rtd") {
    const rows = byBranch(data.rtdBundles) as Record<string, unknown>[];
    return {
      eyebrow: eye, title: "Ready to Deploy", subtitle: "Activated bundles ready for technician installation on vehicles.",
      actionLabel: "Open Operations →",
      stats: [
        { label: "RTD Bundles", value: String(rows.length), note: bl },
        { label: "Deploy Wait", value: "~3 days", note: "avg before install" },
        { label: "Cycle Time", value: "Pair → RTD", note: "2-step activation" },
      ],
      searchPlaceholder: "Search SIM, IMEI, model, branch...",
      rows,
      columns: [
        { key: "sim",            header: "SIM",       render: r => <MonoId val={r.sim as string} color="#3966ff" /> },
        { key: "imei",           header: "IMEI",      render: r => <MonoId val={r.imei as string} color="#06b6d4" /> },
        { key: "model",          header: "Model",     render: r => <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>{r.model as string}</span> },
        { key: "branch",         header: "Branch",    render: r => <BranchPill branch={r.branch as string} /> },
        { key: "activated_date", header: "Activated", render: r => <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{r.activated_date as string}</span> },
      ],
    };
  }

  if (id === "fuelCoverage") {
    const rows = byBranch(data.installations.filter(m => m.fuel_serial !== null)) as Record<string, unknown>[];
    return {
      eyebrow: eye, title: "Fuel Sensor Coverage", subtitle: "Installed units with active fuel sensor monitoring attached.",
      actionLabel: "Open Fleet Master →",
      stats: [
        { label: "With Fuel Sensor", value: String(rows.length), note: bl },
        { label: "Coverage Rate", value: String(Math.round((rows.length / data.installations.length) * 100)) + "%", note: "of installed fleet" },
        { label: "Sensor Model", value: "TD_BLE", note: "Bluetooth tracing" },
      ],
      searchPlaceholder: "Search vehicle, customer, fuel serial...",
      rows,
      columns: [
        { key: "vehicle",     header: "Vehicle",     render: r => <VehicleTag v={r.vehicle as string} /> },
        { key: "customer",    header: "Customer",    render: r => <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-secondary)" }}>{r.customer as string}</span> },
        { key: "sim",         header: "SIM",         render: r => <MonoId val={r.sim as string} color="#3966ff" /> },
        { key: "imei",        header: "IMEI",        render: r => <MonoId val={r.imei as string} color="#06b6d4" /> },
        { key: "fuel_serial", header: "Fuel Serial", render: r => <MonoId val={r.fuel_serial as string} color="#31c86e" /> },
        { key: "branch",      header: "Branch",      render: r => <BranchPill branch={r.branch as string} /> },
      ],
    };
  }

  const rows = byBranch(data.damageEvents) as Record<string, unknown>[];
  return {
    eyebrow: eye, title: "Damage & Loss Events", subtitle: "Devices, SIMs, and sensors marked damaged or lost with reason trace.",
    actionLabel: "View Movement Log →",
    stats: [
      { label: "Total Events", value: String(rows.length), note: bl },
      { label: "This Month", value: String(rows.filter(r => new Date(r.event_date as string).getMonth() === new Date().getMonth()).length), note: "June 2026" },
      { label: "Item Types", value: "Device / SIM / Fuel", note: "all categories" },
    ],
    searchPlaceholder: "Search identifier, reason, branch...",
    rows,
    columns: [
      { key: "identifier", header: "Identifier",  render: r => <MonoId val={r.identifier as string} color="#ef4444" /> },
      { key: "item_type",  header: "Type",        render: r => <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 7px", borderRadius: 4, backgroundColor: "rgba(239,68,68,0.08)", color: "#ef4444" }}>{r.item_type as string}</span> },
      { key: "reason",     header: "Reason",      render: r => <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{r.reason as string}</span> },
      { key: "branch",     header: "Branch",      render: r => <BranchPill branch={r.branch as string} /> },
      { key: "event_date", header: "Date",        render: r => <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{r.event_date as string}</span> },
      { key: "reported_by", header: "Reported By", render: r => <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{r.reported_by as string}</span> },
    ],
  };
}

function DeepViewPanel({
  id, branch, data, onClose,
}: {
  id: string; branch: Branch; data: Parameters<typeof buildDeepView>[2]; onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState("");
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 10);
    return () => clearTimeout(t);
  }, []);

  const cfg = buildDeepView(id, branch, data);
  const ACTION_ROUTE: Record<string, string> = {
    "Open Fleet Master →": "/master",
    "Open Stock →": "/stock",
    "Open Operations →": "/ops",
    "View Movement Log →": "/log",
  };
  const actionRoute = ACTION_ROUTE[cfg.actionLabel];
  const rows = cfg.rows.filter(r =>
    search === "" ||
    Object.values(r).some(v => v !== null && String(v).toLowerCase().includes(search.toLowerCase()))
  );

  const slideIn: React.CSSProperties = {
    opacity: mounted ? 1 : 0,
    transform: mounted ? "translateY(0)" : "translateY(18px)",
    transition: "opacity 280ms ease-out, transform 280ms ease-out",
  };

  return (
    <div style={slideIn}>
      <div style={{
        background: "oklch(13% 0.06 155)",
        borderRadius: 10, padding: "24px 28px 22px", marginBottom: 16,
        display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20,
      }}>
        <div style={{ minWidth: 0 }}>
          <button onClick={onClose} style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            fontSize: 12, fontWeight: 600, color: "oklch(60% 0.04 155)",
            background: "none", border: "1px solid oklch(27% 0.04 155)",
            borderRadius: 6, padding: "4px 12px", cursor: "pointer", marginBottom: 18,
            fontFamily: "inherit", transition: "border-color 120ms, color 120ms",
          }}>
            ← Fleet Overview
          </button>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#31c86e", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 7 }}>
            {cfg.eyebrow}
          </div>
          <h2 style={{
            fontSize: 26, fontWeight: 800, color: "oklch(95% 0.008 155)",
            letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 7,
          }}>
            {cfg.title}
          </h2>
          <p style={{ fontSize: 13, color: "oklch(50% 0.04 155)", lineHeight: 1.55, maxWidth: 540 }}>
            {cfg.subtitle}
          </p>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <button
            onClick={() => actionRoute && router.push(actionRoute)}
            style={{
              fontSize: 12, fontWeight: 600, padding: "6px 14px", borderRadius: 7,
              border: "1px solid oklch(32% 0.04 155)", background: "none",
              color: "oklch(76% 0.025 155)", cursor: "pointer", fontFamily: "inherit",
              display: "block", marginLeft: "auto", marginBottom: 12,
              transition: "border-color 120ms, color 120ms",
            }}
          >
            {cfg.actionLabel}
          </button>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "oklch(42% 0.04 155)", textTransform: "uppercase" }}>
            {cfg.rows.length.toLocaleString()} VISIBLE RECORDS
          </div>
        </div>
      </div>

      <div style={{
        display: "flex", backgroundColor: "var(--surface-2)", borderRadius: 8,
        border: "1px solid var(--border-subtle)", overflow: "hidden", marginBottom: 14,
      }}>
        {cfg.stats.map((s, i) => (
          <div key={s.label} style={{
            flex: 1, padding: "13px 20px",
            borderRight: i < cfg.stats.length - 1 ? "1px solid var(--border-subtle)" : "none",
          }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 4 }}>
              {s.label}
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em", lineHeight: 1 }}>
              {s.value}
            </div>
            {s.note && (
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>{s.note}</div>
            )}
          </div>
        ))}
      </div>

      <div style={{ position: "relative", marginBottom: 12 }}>
        <Search size={13} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={cfg.searchPlaceholder}
          style={{
            width: "100%", padding: "9px 14px 9px 36px",
            border: "1px solid var(--border-default)", borderRadius: 7,
            fontSize: 13, backgroundColor: "var(--surface-1)",
            color: "var(--text-primary)", outline: "none", fontFamily: "inherit",
            boxSizing: "border-box",
          }}
        />
        {search && (
          <span style={{ position: "absolute", right: 13, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: "var(--text-muted)" }}>
            {rows.length} result{rows.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      <div style={{ backgroundColor: "var(--surface-0)", borderRadius: 8, border: "1px solid var(--border-subtle)", overflow: "hidden" }}>
        {rows.length === 0 ? (
          <div style={{ padding: "48px 0", textAlign: "center", fontSize: 13, color: "var(--text-muted)" }}>
            No records match your search.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {cfg.columns.map((col, ci) => (
                    <th key={col.key} style={{ ...TH, paddingLeft: ci === 0 ? 20 : 0 }}>
                      {col.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, ri) => (
                  <tr key={ri} style={{ transition: "background 100ms" }}>
                    {cfg.columns.map((col, ci) => (
                      <td key={col.key} style={{
                        ...TD,
                        paddingLeft: ci === 0 ? 20 : 0,
                        borderBottom: ri === rows.length - 1 ? "none" : "1px solid var(--border-subtle)",
                      }}>
                        {col.render ? col.render(row) : (
                          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                            {row[col.key] != null ? String(row[col.key]) : "—"}
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function KpiTile({
  label, value, sub, icon: Icon, accent, alert, onPress,
}: {
  label: string; value: number; sub?: string;
  icon: React.ElementType; accent?: string; alert?: boolean;
  onPress?: () => void;
}) {
  return (
    <div
      onClick={onPress}
      style={{
        backgroundColor: "var(--surface-2)",
        border: `1px solid ${alert ? "rgba(245,158,11,0.3)" : "var(--border-subtle)"}`,
        borderRadius: 8, padding: "16px 18px",
        display: "flex", flexDirection: "column", gap: 10,
        position: "relative", overflow: "hidden",
        cursor: onPress ? "pointer" : "default",
        transition: "border-color 120ms, background-color 120ms",
      }}
    >
      {alert && (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, backgroundColor: "#f59e0b" }} />
      )}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          {label}
        </span>
        <Icon size={14} color={alert ? "#f59e0b" : (accent ?? "var(--text-muted)")} strokeWidth={2} />
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.03em", color: alert ? "#f59e0b" : (accent ?? "var(--text-primary)"), lineHeight: 1 }}>
        {value.toLocaleString()}
      </div>
      {sub && (
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: -4 }}>{sub}</div>
      )}
    </div>
  );
}

function ActivityItem({ item }: { item: Movement }) {
  const color = actionColors[item.action] ?? "#8b93a8";
  const time = new Date(item.logged_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const date = new Date(item.logged_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });

  return (
    <div className="activity-item">
      <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: color, marginTop: 5, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            {item.action.replace("_", " ")}
          </span>
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{item.item_type}</span>
          {item.vehicle && (
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", backgroundColor: "var(--surface-3)", padding: "1px 6px", borderRadius: 3 }}>
              {item.vehicle}
            </span>
          )}
        </div>
        <div style={{ marginTop: 3, fontSize: 12, color: "var(--text-secondary)" }}>
          {item.imei && <span className="mono" style={{ marginRight: 8 }}>{item.imei}</span>}
          <span style={{ color: "var(--text-muted)" }}>{item.from_status} → {item.to_status}</span>
        </div>
        <div style={{ marginTop: 2, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{item.user_id}</span>
          <span className="branch-tag" style={{ fontSize: 9, padding: "1px 5px" }}>{item.branch}</span>
          {item.notes && <span style={{ fontSize: 11, color: "var(--text-muted)", fontStyle: "italic" }}>{item.notes}</span>}
        </div>
      </div>
      <div style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontWeight: 600 }}>{time}</div>
        <div>{date}</div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [branch, setBranch] = useState<Branch>("All");
  const [isAdmin, setIsAdmin] = useState(true);
  const [deepView, setDeepView] = useState<string | null>(null);
  const [range, setRange] = useState<RangeKey>("12M");

  useEffect(() => {
    const s = getSession();
    if (s && !s.isAdmin) {
      setIsAdmin(false);
      setBranch(s.branch as Branch);
    }
  }, []);
  const [data, setData] = useState({
    installations: [] as Installation[],
    movements: [] as Movement[],
    sims: [] as Sim[],
    devices: [] as Device[],
    fuelSensors: [] as FuelSensor[],
    customers: [] as Customer[],
    pairedBundles: [] as PairedBundle[],
    rtdBundles: [] as RTDBundle[],
    damageEvents: [] as DamageEvent[],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [installations, movements, sims, devices, fuelSensors, customers, pairedBundles, rtdBundles, damageEvents] = await Promise.all([
          fetchInstallations(),
          fetchMovements(),
          fetchSims(),
          fetchDevices(),
          fetchFuelSensors(),
          fetchCustomers(),
          fetchPairedBundles(),
          fetchRTDBundles(),
          fetchDamageEvents(),
        ]);
        setData({ installations, movements, sims, devices, fuelSensors, customers, pairedBundles, rtdBundles, damageEvents });
      } catch (err) {
        console.error("Failed to load data from Supabase:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const inBranch = <T extends { branch: string }>(arr: T[]) =>
    branch === "All" ? arr : arr.filter(x => x.branch === branch);

  const kpi = {
    installed: inBranch(data.installations).filter(i => i.status === "INSTALLED").length,
    total:     inBranch(data.installations).length,
    paired:    inBranch(data.pairedBundles).length,
    rtd:       inBranch(data.rtdBundles).length,
    damaged:   inBranch(data.damageEvents).length,
  };
  const open = (id: string) => setDeepView(id);
  const close = () => setDeepView(null);

  const filteredMovements = branch === "All" ? data.movements : data.movements.filter(m => m.branch === branch);
  const distSegments = [
    { label: "Installed", value: kpi.installed, color: "#32c96f" },
    { label: "RTD", value: kpi.rtd, color: "#3866ff" },
    { label: "Paired", value: kpi.paired, color: "#f59e0b" },
    { label: "Damaged", value: kpi.damaged, color: "#ef4444" },
  ];
  const distTotal = distSegments.reduce((a, s) => a + s.value, 0);

  // Analytics: monthly installation trend (range-scoped) + per-branch breakdown
  const scopedInstalls = inBranch(data.installations);
  const trendPoints = buildMonthlySeries(scopedInstalls, RANGE_MONTHS[range]);
  const trendTotal = trendPoints.reduce((a, p) => a + p.value, 0);
  const branchBreakdown = (isAdmin && branch === "All"
    ? ["Kinshasa", "LSHI", "Brazza"]
    : [branch]
  ).map((b) => ({
    label: b,
    value: data.installations.filter((i) => i.branch === b && i.status === "INSTALLED").length,
    color: BRANCH_COLOR[b] ?? "var(--brand-blue)",
  }));
  const RANGE_LABEL: Record<RangeKey, string> = { "6M": "Last 6 months", "12M": "Last 12 months", All: "All time" };

  if (loading) {
    return (
      <AppShell>
        <div className="page-content" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
          <div style={{ textAlign: "center", color: "var(--text-muted)" }}>Loading data from Supabase...</div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="page-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">Fleet Overview</h1>
            <p className="page-subtitle">Live operational status across Kinshasa · LSHI · Brazza</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {isAdmin ? (
              branches.map(b => (
                <button key={b} onClick={() => { setBranch(b); if (deepView) close(); }} style={{
                  padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer",
                  transition: "all 150ms",
                  border: branch === b ? "1px solid var(--brand-blue)" : "1px solid var(--border-default)",
                  backgroundColor: branch === b ? "var(--brand-blue)" : "var(--surface-2)",
                  color: branch === b ? "white" : "var(--text-secondary)",
                }}>{b}</button>
              ))
            ) : (
              <span style={{
                padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                border: "1px solid var(--brand-blue)", backgroundColor: "var(--brand-blue)", color: "white",
              }}>{branch}</span>
            )}
          </div>
        </div>

        {deepView ? (
          <DeepViewPanel id={deepView} branch={branch} data={data} onClose={close} />
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 28 }}>
              <KpiTile label="Installed" value={kpi.installed} sub={`${kpi.installed} units`} icon={CheckCircle2} accent="var(--brand-green)" onPress={() => open("installed")} />
              <KpiTile label="SIMs in Stock" value={data.sims.length} sub={`${data.sims.length} available`} icon={Radio} onPress={() => open("sims")} />
              <KpiTile label="GPS Devices" value={data.devices.length} sub={`${data.devices.length} available`} icon={Cpu} onPress={() => open("devices")} />
              <KpiTile label="Fuel Sensors" value={data.fuelSensors.length} sub={`${data.fuelSensors.length} available`} icon={Fuel} onPress={() => open("fuel")} />
              <KpiTile label="Paired" value={kpi.paired} sub="Waiting activation" icon={Link2} accent="#f59e0b" onPress={() => open("paired")} />
              <KpiTile label="Ready to Deploy" value={kpi.rtd} sub={`${kpi.rtd} deployable`} icon={PackagePlus} accent="var(--brand-blue)" onPress={() => open("rtd")} />
              <KpiTile label="With Fuel Sensor" value={inBranch(data.installations).filter(i => i.fuel_serial).length} sub="fuel monitored" icon={Fuel} accent="#06b6d4" onPress={() => open("fuelCoverage")} />
              <KpiTile label="Damage / Loss" value={kpi.damaged} sub={`${kpi.damaged} total events`} icon={XCircle} accent="#ef4444" onPress={() => open("damaged")} />
            </div>

            {/* Analytics — installation trend + branch breakdown */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16, marginBottom: 24, alignItems: "stretch" }}>
              <div className="card" style={{ padding: 20, display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4, gap: 12, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <TrendingUp size={16} color="var(--brand-blue)" strokeWidth={2.2} />
                    <h2 style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>
                      Installations Trend
                    </h2>
                  </div>
                  <div style={{ display: "flex", gap: 4, backgroundColor: "var(--surface-1)", border: "1px solid var(--border-subtle)", borderRadius: 8, padding: 3 }}>
                    {(Object.keys(RANGE_MONTHS) as RangeKey[]).map((rk) => (
                      <button
                        key={rk}
                        onClick={() => setRange(rk)}
                        style={{
                          padding: "4px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer",
                          border: "none", transition: "all 150ms var(--ease-out-quart)",
                          backgroundColor: range === rk ? "var(--brand-blue)" : "transparent",
                          color: range === rk ? "#fff" : "var(--text-muted)",
                        }}
                      >
                        {rk === "All" ? "All" : rk}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>
                  {trendTotal.toLocaleString()} installs · {RANGE_LABEL[range]}
                  {branch !== "All" && ` · ${branch}`}
                </div>
                <div style={{ flex: 1, minHeight: 200 }}>
                  <MonthlyTrend points={trendPoints} />
                </div>
              </div>

              <div className="card" style={{ padding: 20, display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                  <BarChart3 size={16} color="var(--brand-green)" strokeWidth={2.2} />
                  <h3 style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>
                    Installed by Branch
                  </h3>
                </div>
                <BranchBars items={branchBreakdown} />
                <div style={{ marginTop: "auto", paddingTop: 16, borderTop: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Total installed</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
                    {branchBreakdown.reduce((a, b) => a + b.value, 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 16, marginBottom: 24 }}>
              <div className="card" style={{ padding: 20 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <h2 style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>Recent Activity</h2>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {filteredMovements.slice(0, 5).map(m => (
                    <ActivityItem key={m.id} item={m} />
                  ))}
                </div>
              </div>

              <div className="card" style={{ padding: 16 }}>
                <h3 style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", marginBottom: 12 }}>Fleet Distribution</h3>
                <div style={{ display: "flex", height: 4, borderRadius: 2, overflow: "hidden", gap: 1 }}>
                  {distSegments.map(s => (
                    <div key={s.label} style={{ height: "100%", width: `${(s.value / distTotal) * 100}%`, backgroundColor: s.color }} />
                  ))}
                </div>
                <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                  {distSegments.map(s => (
                    <div key={s.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                      <span style={{ color: "var(--text-muted)" }}>{s.label}</span>
                      <span style={{ fontWeight: 600, color: s.color }}>{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
