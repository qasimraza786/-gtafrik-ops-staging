"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { fetchSims, fetchDevices, fetchFuelSensors, fetchPairedBundles, fetchRTDBundles } from "@/lib/data";
import { Sim, Device, FuelSensor, PairedBundle, RTDBundle } from "@/lib/supabase";
import { getSession } from "@/lib/auth";
import { AddStockModal } from "@/components/AddStockModal";
import { Plus, Radio, Cpu, Fuel, Package, Link2, Rocket } from "lucide-react";

type StockType = "sims" | "devices" | "fuel";
type View = "stock" | "paired" | "rtd";

const ALL_BRANCHES = ["All", "Kinshasa", "LSHI", "Brazza"];

const TYPE_META: Record<StockType, { label: string; icon: React.ElementType; color: string }> = {
  sims:    { label: "SIM Cards",    icon: Radio, color: "#3966ff" },
  devices: { label: "GPS Devices",  icon: Cpu,   color: "#31c86e" },
  fuel:    { label: "Fuel Sensors", icon: Fuel,  color: "#06b6d4" },
};

const VIEW_META: Record<View, { label: string; icon: React.ElementType }> = {
  stock:  { label: "In Stock",        icon: Package },
  paired: { label: "Paired",          icon: Link2 },
  rtd:    { label: "Ready to Deploy", icon: Rocket },
};

function MonoChip({ value, color }: { value: string; color: string }) {
  return (
    <span className="mono" style={{
      fontWeight: 700, fontSize: 13, color, backgroundColor: color + "14",
      padding: "3px 9px", borderRadius: 5, border: `1px solid ${color}2e`,
      letterSpacing: "0.02em", whiteSpace: "nowrap",
    }}>{value}</span>
  );
}

export default function StockPage() {
  const [type, setType] = useState<StockType>("sims");
  const [view, setView] = useState<View>("stock");
  const [branch, setBranch] = useState("All");
  const [isAdmin, setIsAdmin] = useState(true);
  const [userBranch, setUserBranch] = useState("Kinshasa");
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);

  const [allSims, setSims] = useState<Sim[]>([]);
  const [allDevices, setDevices] = useState<Device[]>([]);
  const [allFuel, setFuel] = useState<FuelSensor[]>([]);
  const [allPaired, setPaired] = useState<PairedBundle[]>([]);
  const [allRtd, setRtd] = useState<RTDBundle[]>([]);

  const load = () => {
    Promise.all([
      fetchSims(), fetchDevices(), fetchFuelSensors(), fetchPairedBundles(), fetchRTDBundles(),
    ]).then(([s, d, f, p, r]) => {
      setSims(s); setDevices(d); setFuel(f); setPaired(p); setRtd(r);
      setLoading(false);
    });
  };

  useEffect(() => {
    const ses = getSession();
    if (ses) {
      setUserBranch(ses.branch);
      if (!ses.isAdmin) { setIsAdmin(false); setBranch(ses.branch); }
    }
    load();
  }, []);

  const byBranch = <T extends { branch: string }>(arr: T[]) =>
    branch === "All" ? arr : arr.filter((x) => x.branch === branch);

  const sims = byBranch(allSims);
  const devices = byBranch(allDevices);
  const fuel = byBranch(allFuel);
  const paired = byBranch(allPaired);
  const rtd = byBranch(allRtd);

  // breakdown per type: stock / paired / rtd
  const breakdown: Record<StockType, { stock: number; paired: number; rtd: number; total: number }> = {
    sims:    { stock: sims.length,    paired: paired.length, rtd: rtd.length, total: sims.length + paired.length + rtd.length },
    devices: { stock: devices.length, paired: paired.length, rtd: rtd.length, total: devices.length + paired.length + rtd.length },
    fuel:    { stock: fuel.length,    paired: 0,             rtd: 0,          total: fuel.length },
  };

  const branchTabs = isAdmin ? ALL_BRANCHES : [branch];
  const meta = TYPE_META[type];
  const fuelSelected = type === "fuel";
  const effView: View = fuelSelected ? "stock" : view;

  const selectType = (t: StockType) => {
    setType(t);
    if (t === "fuel") setView("stock");
  };

  return (
    <AppShell>
      <div className="page-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">Stock Inventory</h1>
            <p className="page-subtitle">
              Raw stock, paired bundles & ready-to-deploy units — everything not yet installed
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
            <Plus size={13} /> Add Stock
          </button>
        </div>

        {showAdd && (
          <AddStockModal
            isAdmin={isAdmin}
            userBranch={userBranch}
            onClose={() => setShowAdd(false)}
            onAdded={(_n, t) => { setShowAdd(false); setType(t); setView("stock"); setLoading(true); load(); }}
          />
        )}

        {/* Branch tabs */}
        <div className="tab-bar" style={{ marginBottom: 18 }}>
          {branchTabs.map((b) => (
            <button key={b} className={`tab-item${branch === b ? " active" : ""}`}
              onClick={() => isAdmin && setBranch(b)} style={{ cursor: isAdmin ? "pointer" : "default" }}>
              {b}
            </button>
          ))}
        </div>

        {/* Type summary cards (selectable) */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 22 }}>
          {(Object.keys(TYPE_META) as StockType[]).map((t) => {
            const m = TYPE_META[t];
            const bd = breakdown[t];
            const on = type === t;
            const Icon = m.icon;
            return (
              <button key={t} onClick={() => selectType(t)} style={{
                textAlign: "left", cursor: "pointer", padding: "18px 20px", borderRadius: 12,
                border: `1px solid ${on ? m.color + "55" : "var(--border-subtle)"}`,
                background: on ? `linear-gradient(135deg, ${m.color}14 0%, ${m.color}06 100%)` : "var(--surface-2)",
                transition: "all 160ms", position: "relative", overflow: "hidden",
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                    <div style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: m.color + "18", border: `1px solid ${m.color}30`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Icon size={15} color={m.color} strokeWidth={2} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: on ? m.color : "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{m.label}</span>
                  </div>
                </div>
                <div style={{ fontSize: 34, fontWeight: 800, color: on ? m.color : "var(--text-primary)", letterSpacing: "-0.03em", lineHeight: 1 }}>
                  {loading ? "…" : bd.total.toLocaleString()}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>total units available</div>

                {/* breakdown chips */}
                <div style={{ display: "flex", gap: 6, marginTop: 14, flexWrap: "wrap" }}>
                  <Chip label="Stock" value={bd.stock} color={m.color} />
                  {t !== "fuel" && <Chip label="Paired" value={bd.paired} color="#f59e0b" />}
                  {t !== "fuel" && <Chip label="RTD" value={bd.rtd} color="#a855f7" />}
                </div>
              </button>
            );
          })}
        </div>

        {/* Sub-state toggle */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", gap: 4, padding: 4, backgroundColor: "var(--surface-2)", borderRadius: 10, border: "1px solid var(--border-subtle)" }}>
            {(Object.keys(VIEW_META) as View[]).map((v) => {
              const vm = VIEW_META[v];
              const disabled = fuelSelected && v !== "stock";
              const on = effView === v;
              const VIcon = vm.icon;
              const cnt = breakdown[type][v];
              return (
                <button key={v} disabled={disabled} onClick={() => setView(v)} style={{
                  display: "flex", alignItems: "center", gap: 7, padding: "8px 16px", borderRadius: 7,
                  border: "none", cursor: disabled ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600,
                  backgroundColor: on ? meta.color : "transparent",
                  color: on ? "white" : disabled ? "var(--text-muted)" : "var(--text-secondary)",
                  opacity: disabled ? 0.4 : 1, transition: "all 130ms", fontFamily: "inherit",
                }}>
                  <VIcon size={14} /> {vm.label}
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: "1px 7px", borderRadius: 20,
                    backgroundColor: on ? "rgba(255,255,255,0.22)" : "var(--surface-3)",
                    color: on ? "white" : "var(--text-muted)",
                  }}>{loading ? "·" : cnt}</span>
                </button>
              );
            })}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
            {meta.label} · {VIEW_META[effView].label} · {branch === "All" ? "All branches" : branch}
          </div>
        </div>

        {/* Table */}
        <div style={{ backgroundColor: "var(--surface-2)", border: "1px solid var(--border-subtle)", borderRadius: 10, overflow: "hidden" }}>
          {loading ? (
            <div style={{ padding: "48px 20px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>Loading stock…</div>
          ) : (
            <StockTable type={type} view={effView} color={meta.color}
              sims={sims} devices={devices} fuel={fuel} paired={paired} rtd={rtd} />
          )}
        </div>
      </div>
    </AppShell>
  );
}

function Chip({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600,
      padding: "3px 9px", borderRadius: 6, backgroundColor: color + "12", color,
      border: `1px solid ${color}26`,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: color }} />
      {label} <strong style={{ fontWeight: 800 }}>{value}</strong>
    </span>
  );
}

function StockTable({
  type, view, color, sims, devices, fuel, paired, rtd,
}: {
  type: StockType; view: View; color: string;
  sims: Sim[]; devices: Device[]; fuel: FuelSensor[]; paired: PairedBundle[]; rtd: RTDBundle[];
}) {
  const empty = (
    <tr><td colSpan={8} style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)", fontSize: 13 }}>No records in this category.</td></tr>
  );

  // ── bundle views (paired / rtd) ──
  if (view === "paired" || view === "rtd") {
    const rows = view === "paired" ? paired : rtd;
    const simEmphasis = type === "sims";
    const dateLabel = view === "paired" ? "Paired Date" : "Activated Date";
    return (
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>SIM (ICCID)</th>
            <th>Device IMEI</th>
            <th>Model</th>
            <th>Branch</th>
            <th>{dateLabel}</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? empty : rows.map((r, i) => {
            const date = view === "paired" ? (r as PairedBundle).paired_date : (r as RTDBundle).activated_date;
            return (
              <tr key={r.id}>
                <td style={{ color: "var(--text-muted)", fontSize: 11 }}>{i + 1}</td>
                <td><MonoChip value={r.sim} color={simEmphasis ? "#3966ff" : "#8b93a8"} /></td>
                <td><MonoChip value={r.imei} color={simEmphasis ? "#8b93a8" : "#06b6d4"} /></td>
                <td><span style={{ fontSize: 11, fontWeight: 600, color: color, backgroundColor: color + "12", padding: "2px 7px", borderRadius: 4 }}>{r.model}</span></td>
                <td><span className="branch-tag">{r.branch}</span></td>
                <td style={{ fontSize: 12, color: "var(--text-secondary)" }}>{date ?? "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  }

  // ── raw stock views ──
  if (type === "sims") {
    return (
      <table>
        <thead><tr><th>#</th><th>SIM Number (ICCID)</th><th>Provider</th><th>Status</th><th>Branch</th><th>Date Added</th></tr></thead>
        <tbody>
          {sims.length === 0 ? empty : sims.map((s, i) => (
            <tr key={s.id}>
              <td style={{ color: "var(--text-muted)", fontSize: 11 }}>{i + 1}</td>
              <td><MonoChip value={s.number} color="#3966ff" /></td>
              <td style={{ textTransform: "capitalize" }}>{s.provider}</td>
              <td><span className="badge badge-installed">{s.status}</span></td>
              <td><span className="branch-tag">{s.branch}</span></td>
              <td style={{ fontSize: 12 }}>{s.date_added ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }
  if (type === "devices") {
    return (
      <table>
        <thead><tr><th>#</th><th>IMEI</th><th>Model</th><th>Status</th><th>Branch</th><th>Date Added</th></tr></thead>
        <tbody>
          {devices.length === 0 ? empty : devices.map((d, i) => (
            <tr key={d.id}>
              <td style={{ color: "var(--text-muted)", fontSize: 11 }}>{i + 1}</td>
              <td><MonoChip value={d.imei} color="#31c86e" /></td>
              <td><span style={{ fontSize: 11, fontWeight: 600, color: "#31c86e", backgroundColor: "rgba(49,200,110,0.12)", padding: "2px 7px", borderRadius: 4 }}>{d.model}</span></td>
              <td><span className="badge badge-installed">{d.status}</span></td>
              <td><span className="branch-tag">{d.branch}</span></td>
              <td style={{ fontSize: 12 }}>{d.date_added ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }
  // fuel
  return (
    <table>
      <thead><tr><th>#</th><th>Serial</th><th>MAC Address</th><th>Model</th><th>Status</th><th>Branch</th><th>Date Added</th></tr></thead>
      <tbody>
        {fuel.length === 0 ? empty : fuel.map((f, i) => (
          <tr key={f.id}>
            <td style={{ color: "var(--text-muted)", fontSize: 11 }}>{i + 1}</td>
            <td><MonoChip value={f.serial} color="#06b6d4" /></td>
            <td><MonoChip value={f.mac} color="#0891b2" /></td>
            <td><span style={{ fontSize: 11, fontWeight: 600, color: "#06b6d4", backgroundColor: "rgba(6,182,212,0.12)", padding: "2px 7px", borderRadius: 4 }}>{f.model}</span></td>
            <td><span className="badge badge-installed">{f.status}</span></td>
            <td><span className="branch-tag">{f.branch}</span></td>
            <td style={{ fontSize: 12 }}>{f.date_added ?? "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
