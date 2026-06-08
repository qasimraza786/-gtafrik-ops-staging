"use client";

import { useState, useEffect, Fragment } from "react";
import { AppShell } from "@/components/AppShell";
import { getSession, type SessionUser } from "@/lib/auth";
import {
  fetchRTDBundles, fetchPairedBundles, fetchInstallations,
  fetchSims, fetchDevices, fetchFuelSensors, fetchCustomers,
} from "@/lib/data";
import { buildTemplate, downloadCsv, type StockType } from "@/lib/stock";

const ITEM_TYPE_TO_STOCK: Record<string, StockType> = {
  SIM: "sims", DEVICE: "devices", FUEL_SENSOR: "fuel",
};

function downloadTransferTemplate(itemType: string): void {
  const t = ITEM_TYPE_TO_STOCK[itemType] ?? "sims";
  downloadCsv(`gtafrik-transfer-${t}-template.csv`, buildTemplate(t));
}
import {
  Plug, Unplug, Link2, Rocket, Wrench, ShieldAlert, ArrowLeftRight, Gauge,
  X, CheckCircle2, Search, ChevronLeft, ChevronRight,
} from "lucide-react";

/* ─── Types ─── */
type Op = {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  stepLabels: string[];
};

/* ─── Operations ─── */
const ops: Op[] = [
  { id: "deploy",    label: "Install Device",       description: "Deploy a Ready-to-Deploy bundle onto a customer vehicle and assign vehicle details.",       icon: Plug,          color: "#31c86e", stepLabels: ["Select Bundle", "Vehicle Details", "Fuel Sensor", "Confirm"] },
  { id: "pair",      label: "Pair SIM + Device",    description: "Link a SIM card with a GPS device from same-branch stock to create a Paired bundle.",       icon: Link2,         color: "#3966ff", stepLabels: ["Select SIM", "Select Device", "Confirm"] },
  { id: "activate",  label: "Activate (RTD)",        description: "Move a Paired bundle to Ready-to-Deploy status, making it available for installation.",     icon: Rocket,        color: "#06b6d4", stepLabels: ["Select Bundle", "Confirm"] },
  { id: "repair",    label: "Repair / Swap",         description: "Replace a faulty SIM, device, or full bundle on an installed vehicle. Set old item fate.",  icon: Wrench,        color: "#a855f7", stepLabels: ["Find Vehicle", "Repair Type", "Replacement", "Old Item Fate", "Confirm"] },
  { id: "uninstall", label: "Uninstall",             description: "Remove GPS unit from a vehicle and return the SIM+Device bundle to RTD status.",            icon: Unplug,        color: "#f97316", stepLabels: ["Find Vehicle", "Fuel Action", "Confirm"] },
  { id: "damage",    label: "Mark Damaged / Lost",   description: "Record a device, SIM, or fuel sensor as damaged or lost with reason and branch context.",   icon: ShieldAlert,   color: "#ef4444", stepLabels: ["Item Source", "Find Item", "Damage Details", "Confirm"] },
  { id: "transfer",  label: "Transfer Stock",        description: "Move stock items between Kinshasa, LSHI, or Brazza branches to rebalance inventory.",       icon: ArrowLeftRight, color: "#eab308", stepLabels: ["Direction & Type", "Select Items", "Branch Route", "Confirm"] },
  { id: "fuel",      label: "Add Fuel Sensor",       description: "Attach a fuel sensor to an existing installation that currently has no sensor installed.",  icon: Gauge,         color: "#0ea5e9", stepLabels: ["Find Vehicle", "Select Sensor", "Confirm"] },
];

/* ─── Shared styles ─── */
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 13px",
  border: "1px solid var(--border-default)", borderRadius: 7,
  fontSize: 14, color: "var(--text-primary)", backgroundColor: "var(--surface-1)",
  outline: "none", fontFamily: "inherit", boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: "var(--text-muted)",
  textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 7, display: "block",
};

/* ─── Live data shapes (fed from Supabase) ─── */
type Bundle = { id: number; imei: string; sim: string; model: string; branch: string };
type InstalledItem = { id: number; vehicle: string; customer: string; imei: string; branch: string; hasFuel: boolean };
type StockSim = { id: number; number: string; branch: string };
type StockDevice = { id: number; imei: string; model: string; branch: string };
type StockFuel = { id: number; serial: string; mac: string; branch: string };
type CustomerLite = { id: number; name: string; branch: string };

type OpsData = {
  rtd: Bundle[];
  paired: Bundle[];
  installed: InstalledItem[];
  sims: StockSim[];
  devices: StockDevice[];
  fuel: StockFuel[];
  customers: CustomerLite[];
};

const emptyOpsData: OpsData = {
  rtd: [], paired: [], installed: [], sims: [], devices: [], fuel: [], customers: [],
};

/* ─── Step content ─── */
function StepContent({
  opId, step, form, setField, color, isAdmin, userBranch, data,
}: {
  opId: string; step: number;
  form: Record<string, string>;
  setField: (k: string, v: string) => void;
  color: string;
  isAdmin: boolean;
  userBranch: string;
  data: OpsData;
}) {
  const radioRow = (active: boolean): React.CSSProperties => ({
    display: "flex", alignItems: "center", gap: 10,
    padding: "10px 14px", borderRadius: 7, marginBottom: 8, cursor: "pointer",
    border: `1px solid ${active ? color + "44" : "var(--border-subtle)"}`,
    backgroundColor: active ? color + "0c" : "var(--surface-1)",
    transition: "all 120ms",
  });
  const itemRow = (active: boolean): React.CSSProperties => ({
    display: "flex", alignItems: "center", gap: 12,
    padding: "10px 14px", borderRadius: 7, marginBottom: 6, cursor: "pointer",
    border: `1px solid ${active ? color + "44" : "var(--border-subtle)"}`,
    backgroundColor: active ? color + "0c" : "var(--surface-1)",
    transition: "all 120ms",
  });
  const dot = (active: boolean, square?: boolean): React.CSSProperties => ({
    width: square ? 16 : 14, height: square ? 16 : 14, flexShrink: 0,
    borderRadius: square ? 4 : "50%",
    border: `2px solid ${active ? color : "var(--border-default)"}`,
    backgroundColor: active ? color : "transparent",
    transition: "all 120ms",
    display: "flex", alignItems: "center", justifyContent: "center",
  });

  const SearchBox = ({ placeholder }: { placeholder: string }) => (
    <div style={{ position: "relative", marginBottom: 12 }}>
      <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
      <input style={{ ...inputStyle, paddingLeft: 32 }} placeholder={placeholder} />
    </div>
  );

  const ConfirmRow = ({ label, value }: { label: string; value: string }) => (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border-subtle)" }}>
      <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>{value || "—"}</span>
    </div>
  );

  const SummaryBox = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div style={{ backgroundColor: "var(--surface-1)", borderRadius: 8, padding: "16px 18px", marginBottom: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  );

  const note = (text: string) => (
    <p style={{ fontSize: 12, color: "var(--text-muted)", fontStyle: "italic", marginTop: 12 }}>{text}</p>
  );

  /* ── DEPLOY ── */
  if (opId === "deploy") {
    if (step === 0) return (
      <div>
        <SearchBox placeholder="Search by IMEI or SIM number…" />
        {data.rtd.map(r => {
          const active = form.bundleId === String(r.id);
          return (
            <div key={r.id} style={itemRow(active)} onClick={() => setField("bundleId", String(r.id))}>
              <div style={dot(active)} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, fontFamily: "monospace", color: "var(--text-primary)" }}>{r.imei}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>SIM: {r.sim.slice(0, 12)}… · {r.model} · {r.branch}</div>
              </div>
              {active && <CheckCircle2 size={14} color={color} />}
            </div>
          );
        })}
      </div>
    );
    if (step === 1) {
      const today = new Date().toISOString().slice(0, 10);
      const custMode = form.customerMode || "existing";
      const selectedCustomer = data.customers.find(c => String(c.id) === form.customerId);
      const filtered = data.customers.filter(c =>
        !form.customerSearch || c.name.toLowerCase().includes(form.customerSearch.toLowerCase())
      );
      const avatarStyle = (bg: string, fg: string): React.CSSProperties => ({
        width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
        backgroundColor: bg, color: fg,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 13, fontWeight: 700,
      });
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>

          {/* Vehicle Number */}
          <div>
            <label style={labelStyle}>Vehicle Number *</label>
            <input
              style={{ ...inputStyle, fontSize: 17, fontWeight: 700, letterSpacing: "0.05em", padding: "12px 14px" }}
              placeholder="e.g. 8470-BT-01"
              value={form.vehicle || ""}
              onChange={e => setField("vehicle", e.target.value)}
            />
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 5 }}>Official plate or fleet ID assigned to the vehicle</div>
          </div>

          {/* Customer */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>Customer *</label>
              <div style={{ display: "flex", border: "1px solid var(--border-default)", borderRadius: 6, overflow: "hidden", backgroundColor: "var(--surface-2)" }}>
                {[{ k: "existing", l: "Existing" }, { k: "new", l: "New" }].map(m => (
                  <button key={m.k}
                    onClick={() => { setField("customerMode", m.k); setField("customerId", ""); setField("customer", ""); setField("customerSearch", ""); }}
                    style={{
                      padding: "5px 14px", border: "none", cursor: "pointer",
                      fontSize: 12, fontWeight: 600,
                      backgroundColor: custMode === m.k ? color : "transparent",
                      color: custMode === m.k ? "white" : "var(--text-muted)",
                      transition: "all 130ms",
                    }}
                  >{m.l}</button>
                ))}
              </div>
            </div>

            {custMode === "existing" ? (
              selectedCustomer ? (
                /* Collapsed selected card */
                <div style={{
                  display: "flex", alignItems: "center", gap: 14, padding: "13px 16px",
                  borderRadius: 10, backgroundColor: color + "0d", border: `1.5px solid ${color}3a`,
                }}>
                  <div style={avatarStyle(color + "22", color)}>{selectedCustomer.name[0]}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>{selectedCustomer.name}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{selectedCustomer.branch} · Existing account</div>
                  </div>
                  <CheckCircle2 size={18} color={color} />
                  <button
                    onClick={() => { setField("customerId", ""); setField("customer", ""); setField("customerSearch", ""); }}
                    style={{ fontSize: 12, fontWeight: 600, color: color, background: "none", border: `1px solid ${color}44`, borderRadius: 6, padding: "5px 12px", cursor: "pointer", whiteSpace: "nowrap" }}
                  >Change</button>
                </div>
              ) : (
                /* Search + bounded list */
                <div style={{ border: "1px solid var(--border-default)", borderRadius: 10, overflow: "hidden", backgroundColor: "var(--surface-1)" }}>
                  <div style={{ position: "relative", borderBottom: "1px solid var(--border-subtle)" }}>
                    <Search size={14} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                    <input
                      autoFocus
                      style={{ ...inputStyle, paddingLeft: 38, border: "none", borderRadius: 0, backgroundColor: "transparent", fontSize: 13 }}
                      placeholder="Search customers…"
                      value={form.customerSearch || ""}
                      onChange={e => setField("customerSearch", e.target.value)}
                    />
                  </div>
                  <div style={{ maxHeight: 188, overflowY: "auto" }}>
                    {filtered.length > 0 ? filtered.map((c, idx) => (
                      <div
                        key={c.id}
                        onClick={() => { setField("customerId", String(c.id)); setField("customer", c.name); }}
                        style={{
                          display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", cursor: "pointer",
                          borderBottom: idx < filtered.length - 1 ? "1px solid var(--border-subtle)" : "none",
                          transition: "background 100ms",
                        }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = color + "08")}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
                      >
                        <div style={avatarStyle("var(--surface-3)", "var(--text-muted)")}>{c.name[0]}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>{c.name}</div>
                          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>{c.branch}</div>
                        </div>
                        <ChevronRight size={13} color="var(--text-muted)" />
                      </div>
                    )) : (
                      <div style={{ padding: "22px 16px", textAlign: "center" }}>
                        <div style={{ fontSize: 13, color: "var(--text-muted)" }}>No customers match</div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4, fontStyle: "italic" }}>Switch to "New" to add this customer</div>
                      </div>
                    )}
                  </div>
                </div>
              )
            ) : (
              <div>
                <input style={inputStyle} placeholder="Enter full customer name" value={form.customer || ""} onChange={e => setField("customer", e.target.value)} autoFocus />
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 5 }}>New customers are registered automatically on confirmation</div>
              </div>
            )}
          </div>

          {/* Date + Location */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <label style={labelStyle}>Install Date</label>
              <input type="date" style={inputStyle} value={form.installDate || today} onChange={e => setField("installDate", e.target.value)} />
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 5 }}>Defaults to today if not changed</div>
            </div>
            <div>
              <label style={labelStyle}>Location</label>
              {isAdmin ? (
                <select style={{ ...inputStyle, cursor: "pointer" }} value={form.location || ""} onChange={e => setField("location", e.target.value)}>
                  <option value="">Select location…</option>
                  <option value="Kinshasa, DRC">Kinshasa, DRC</option>
                  <option value="Lubumbashi, DRC">Lubumbashi (LSHI), DRC</option>
                  <option value="Brazzaville, RC">Brazzaville, Republic of Congo</option>
                  <option value="custom">Other…</option>
                </select>
              ) : (
                <div style={{ ...inputStyle, backgroundColor: "var(--surface-2)", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)", cursor: "not-allowed", display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ flex: 1 }}>{userBranch}, DRC</span>
                  <span style={{ fontSize: 11, color: "var(--text-muted)", backgroundColor: "var(--surface-3)", padding: "2px 8px", borderRadius: 4, fontWeight: 600 }}>Auto</span>
                </div>
              )}
            </div>
            {isAdmin && form.location === "custom" && (
              <div style={{ gridColumn: "1/-1" }}>
                <label style={labelStyle}>Specify Location</label>
                <input style={inputStyle} placeholder="City / district / address" value={form.customLocation || ""} onChange={e => setField("customLocation", e.target.value)} />
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label style={labelStyle}>Notes (optional)</label>
            <input style={inputStyle} placeholder="Any additional notes about this installation" value={form.notes || ""} onChange={e => setField("notes", e.target.value)} />
          </div>
        </div>
      );
    }
    if (step === 2) return (
      <div>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 14 }}>Does this vehicle require a fuel sensor?</p>
        {[{ v: "none", l: "No fuel sensor", s: "Skip — proceed without sensor" }, { v: "add", l: "Add fuel sensor", s: "Select from available branch stock" }].map(o => (
          <div key={o.v} style={radioRow(form.fuelOpt === o.v)} onClick={() => setField("fuelOpt", o.v)}>
            <div style={dot(form.fuelOpt === o.v)} />
            <div><div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{o.l}</div><div style={{ fontSize: 11, color: "var(--text-muted)" }}>{o.s}</div></div>
          </div>
        ))}
        {form.fuelOpt === "add" && (
          <div style={{ marginTop: 14 }}>
            <label style={labelStyle}>Select Fuel Sensor</label>
            <div style={{ position: "relative", marginBottom: 10 }}>
              <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
              <input style={{ ...inputStyle, paddingLeft: 32 }} placeholder="Search by serial or MAC address…" value={form.fuelSearch || ""} onChange={e => setField("fuelSearch", e.target.value)} />
            </div>
            {data.fuel
              .filter(f => !form.fuelSearch || f.serial.toLowerCase().includes(form.fuelSearch.toLowerCase()) || f.mac.toLowerCase().includes(form.fuelSearch.toLowerCase()))
              .map(f => {
              const active = form.fuelId === String(f.id);
              return (
                <div key={f.id} style={itemRow(active)} onClick={() => setField("fuelId", String(f.id))}>
                  <div style={dot(active)} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "monospace", color: "var(--text-primary)" }}>{f.serial}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>MAC: {f.mac} · {f.branch}</div>
                  </div>
                  {active && <CheckCircle2 size={14} color={color} />}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
    if (step === 3) return (
      <div>
        <SummaryBox title="Installation Summary">
          <ConfirmRow label="Bundle IMEI" value={data.rtd.find(r => String(r.id) === form.bundleId)?.imei || ""} />
          <ConfirmRow label="Vehicle" value={form.vehicle || ""} />
          <ConfirmRow label="Customer" value={form.customer || ""} />
          <ConfirmRow label="Install Date" value={form.installDate || ""} />
          <ConfirmRow label="Location" value={form.location || ""} />
          <ConfirmRow label="Fuel Sensor" value={form.fuelOpt === "add" ? data.fuel.find(f => String(f.id) === form.fuelId)?.serial || "Pending" : "None"} />
        </SummaryBox>
        {note("This action is logged to the movement audit trail and cannot be undone by SUPERVISOR roles.")}
      </div>
    );
  }

  /* ── PAIR ── */
  if (opId === "pair") {
    if (step === 0) return (
      <div>
        <SearchBox placeholder="Search SIM by ICCID number…" />
        {data.sims.map(s => {
          const active = form.simId === String(s.id);
          return (
            <div key={s.id} style={itemRow(active)} onClick={() => setField("simId", String(s.id))}>
              <div style={dot(active)} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, fontFamily: "monospace", color: "var(--text-primary)" }}>{s.number}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{s.branch} · In stock</div>
              </div>
              {active && <CheckCircle2 size={14} color={color} />}
            </div>
          );
        })}
      </div>
    );
    if (step === 1) return (
      <div>
        <SearchBox placeholder="Search device by IMEI…" />
        {data.devices.map(d => {
          const active = form.deviceId === String(d.id);
          return (
            <div key={d.id} style={itemRow(active)} onClick={() => setField("deviceId", String(d.id))}>
              <div style={dot(active)} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, fontFamily: "monospace", color: "var(--text-primary)" }}>{d.imei}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{d.model} · {d.branch} · In stock</div>
              </div>
              {active && <CheckCircle2 size={14} color={color} />}
            </div>
          );
        })}
      </div>
    );
    if (step === 2) return (
      <div>
        <SummaryBox title="Pairing Summary">
          <ConfirmRow label="SIM (ICCID)" value={data.sims.find(s => String(s.id) === form.simId)?.number || "Not selected"} />
          <ConfirmRow label="Device (IMEI)" value={data.devices.find(d => String(d.id) === form.deviceId)?.imei || "Not selected"} />
          <ConfirmRow label="Branch" value="Kinshasa" />
        </SummaryBox>
        {note("Both items must be from the same branch. Cross-branch pairing is rejected.")}
      </div>
    );
  }

  /* ── ACTIVATE ── */
  if (opId === "activate") {
    if (step === 0) return (
      <div>
        <SearchBox placeholder="Search paired bundle by IMEI…" />
        {data.paired.map(p => {
          const active = form.pairId === String(p.id);
          return (
            <div key={p.id} style={itemRow(active)} onClick={() => setField("pairId", String(p.id))}>
              <div style={dot(active)} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, fontFamily: "monospace", color: "var(--text-primary)" }}>{p.imei}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>SIM: {p.sim.slice(0, 12)}… · {p.model} · {p.branch} · PAIRED</div>
              </div>
              {active && <CheckCircle2 size={14} color={color} />}
            </div>
          );
        })}
      </div>
    );
    if (step === 1) return (
      <div>
        <SummaryBox title="Activation Summary">
          <ConfirmRow label="Bundle IMEI" value={data.paired.find(p => String(p.id) === form.pairId)?.imei || "Not selected"} />
          <ConfirmRow label="New Status" value="Ready to Deploy" />
        </SummaryBox>
        {note("Bundle will move from PAIRED → READY TO DEPLOY status.")}
      </div>
    );
  }

  /* ── REPAIR ── */
  if (opId === "repair") {
    if (step === 0) return (
      <div>
        <SearchBox placeholder="Search vehicle by number, IMEI, or customer…" />
        {data.installed.map(v => {
          const active = form.vehicleId === String(v.id);
          return (
            <div key={v.id} style={itemRow(active)} onClick={() => setField("vehicleId", String(v.id))}>
              <div style={dot(active)} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{v.vehicle}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{v.customer} · {v.branch} · IMEI: {v.imei.slice(0, 10)}…</div>
              </div>
              {active && <CheckCircle2 size={14} color={color} />}
            </div>
          );
        })}
      </div>
    );
    if (step === 1) return (
      <div>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 14 }}>What type of swap is needed?</p>
        {[
          { v: "DEVICE_SWAP", l: "Device Swap",  s: "Replace GPS device only — keep SIM" },
          { v: "SIM_SWAP",    l: "SIM Swap",     s: "Replace SIM card only — keep device" },
          { v: "FULL_SWAP",   l: "Full Swap",    s: "Replace both via a Ready-to-Deploy bundle" },
        ].map(o => (
          <div key={o.v} style={radioRow(form.repairType === o.v)} onClick={() => setField("repairType", o.v)}>
            <div style={dot(form.repairType === o.v)} />
            <div><div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{o.l}</div><div style={{ fontSize: 11, color: "var(--text-muted)" }}>{o.s}</div></div>
          </div>
        ))}
      </div>
    );
    if (step === 2) {
      const srcItems = form.repairType === "SIM_SWAP"
        ? data.sims.map(s => ({ id: String(s.id), label: s.number, sub: `SIM · ${s.branch}` }))
        : form.repairType === "FULL_SWAP"
        ? data.rtd.map(r => ({ id: String(r.id), label: r.imei, sub: `${r.model} · ${r.branch} · RTD` }))
        : data.devices.map(d => ({ id: String(d.id), label: d.imei, sub: `${d.model} · ${d.branch}` }));
      return (
        <div>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 14 }}>
            {form.repairType === "SIM_SWAP" ? "Select replacement SIM:" : form.repairType === "FULL_SWAP" ? "Select RTD bundle:" : "Select replacement device:"}
          </p>
          <SearchBox placeholder="Search by IMEI, SIM, or model…" />
          {srcItems.map(item => {
            const active = form.newItemId === item.id;
            return (
              <div key={item.id} style={itemRow(active)} onClick={() => setField("newItemId", item.id)}>
                <div style={dot(active)} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, fontFamily: "monospace", color: "var(--text-primary)" }}>{item.label}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{item.sub}</div>
                </div>
                {active && <CheckCircle2 size={14} color={color} />}
              </div>
            );
          })}
        </div>
      );
    }
    if (step === 3) return (
      <div>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 14 }}>What is the fate of the old item?</p>
        {[
          { v: "DAMAGED",           l: "Mark as Damaged",    s: "Physically broken or unusable" },
          { v: "LOST",              l: "Mark as Lost",       s: "Item cannot be recovered" },
          { v: "RETURNED TO STOCK", l: "Return to Stock",    s: "Item reusable after testing" },
          { v: "UNDER TESTING",     l: "Under Testing",      s: "Needs diagnosis before decision" },
        ].map(o => (
          <div key={o.v} style={radioRow(form.oldItemFate === o.v)} onClick={() => setField("oldItemFate", o.v)}>
            <div style={dot(form.oldItemFate === o.v)} />
            <div><div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{o.l}</div><div style={{ fontSize: 11, color: "var(--text-muted)" }}>{o.s}</div></div>
          </div>
        ))}
        <div style={{ marginTop: 14 }}><label style={labelStyle}>Reason for repair</label><input style={inputStyle} placeholder="Brief description of the issue" value={form.reason || ""} onChange={e => setField("reason", e.target.value)} /></div>
      </div>
    );
    if (step === 4) return (
      <div>
        <SummaryBox title="Repair Summary">
          <ConfirmRow label="Vehicle"       value={data.installed.find(v => String(v.id) === form.vehicleId)?.vehicle || ""} />
          <ConfirmRow label="Repair Type"   value={form.repairType || ""} />
          <ConfirmRow label="Old Item Fate" value={form.oldItemFate || ""} />
          <ConfirmRow label="Reason"        value={form.reason || ""} />
        </SummaryBox>
        {note("This action is permanent. Movement log will be updated with all swap details.")}
      </div>
    );
  }

  /* ── UNINSTALL ── */
  if (opId === "uninstall") {
    const selVehicle = data.installed.find(v => String(v.id) === form.vehicleId);
    if (step === 0) return (
      <div>
        <SearchBox placeholder="Search vehicle by number, IMEI, or customer…" />
        {data.installed.map(v => {
          const active = form.vehicleId === String(v.id);
          return (
            <div key={v.id} style={itemRow(active)} onClick={() => setField("vehicleId", String(v.id))}>
              <div style={dot(active)} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{v.vehicle}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{v.customer} · {v.branch} · {v.hasFuel ? "Has fuel sensor" : "No fuel sensor"}</div>
              </div>
              {active && <CheckCircle2 size={14} color={color} />}
            </div>
          );
        })}
      </div>
    );
    if (step === 1) return (
      <div>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 14 }}>
          {selVehicle?.hasFuel ? "This vehicle has a fuel sensor. What should happen to it?" : "No fuel sensor on this vehicle."}
        </p>
        {selVehicle?.hasFuel ? [
          { v: "1", l: "Leave sensor on vehicle",  s: "Vehicle loses tracking but keeps sensor" },
          { v: "2", l: "Return sensor to stock",   s: "Sensor goes back into branch inventory" },
          { v: "3", l: "Mark sensor as damaged",   s: "Sensor is broken — log to damage record" },
        ].map(o => (
          <div key={o.v} style={radioRow(form.fuelAction === o.v)} onClick={() => setField("fuelAction", o.v)}>
            <div style={dot(form.fuelAction === o.v)} />
            <div><div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{o.l}</div><div style={{ fontSize: 11, color: "var(--text-muted)" }}>{o.s}</div></div>
          </div>
        )) : <p style={{ fontSize: 13, color: "var(--text-muted)", fontStyle: "italic" }}>No fuel action needed. Click Next to confirm.</p>}
        <div style={{ marginTop: 14 }}><label style={labelStyle}>Reason for uninstall</label><input style={inputStyle} placeholder="e.g. Contract ended, customer request" value={form.reason || ""} onChange={e => setField("reason", e.target.value)} /></div>
      </div>
    );
    if (step === 2) {
      const fuelLabel = selVehicle?.hasFuel
        ? (form.fuelAction === "1" ? "Leave on vehicle" : form.fuelAction === "2" ? "Return to stock" : form.fuelAction === "3" ? "Mark damaged" : "Pending selection")
        : "No sensor";
      return (
        <div>
          <SummaryBox title="Uninstall Summary">
            <ConfirmRow label="Vehicle"     value={selVehicle?.vehicle || ""} />
            <ConfirmRow label="Customer"    value={selVehicle?.customer || ""} />
            <ConfirmRow label="IMEI"        value={selVehicle?.imei || ""} />
            <ConfirmRow label="Fuel Action" value={fuelLabel} />
            <ConfirmRow label="Reason"      value={form.reason || ""} />
          </SummaryBox>
          {note("The SIM+Device bundle will return to Ready-to-Deploy status.")}
        </div>
      );
    }
  }

  /* ── DAMAGE ── */
  if (opId === "damage") {
    if (step === 0) return (
      <div>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 14 }}>Where is the item being marked?</p>
        {[
          { v: "stock", l: "From Stock",          s: "Item is in SIM, device, or fuel sensor stock" },
          { v: "fleet", l: "From Installed Fleet", s: "Item is currently installed on a vehicle" },
        ].map(o => (
          <div key={o.v} style={radioRow(form.damageSource === o.v)} onClick={() => setField("damageSource", o.v)}>
            <div style={dot(form.damageSource === o.v)} />
            <div><div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{o.l}</div><div style={{ fontSize: 11, color: "var(--text-muted)" }}>{o.s}</div></div>
          </div>
        ))}
      </div>
    );
    if (step === 1) {
      const items = form.damageSource === "fleet"
        ? data.installed.map(v => ({ id: String(v.id), label: v.vehicle, sub: v.customer }))
        : [
            ...data.devices.map(d => ({ id: "d" + d.id, label: d.imei, sub: `Device · ${d.model}` })),
            ...data.sims.map(s => ({ id: "s" + s.id, label: s.number, sub: "SIM Card" })),
          ];
      return (
        <div>
          <SearchBox placeholder={form.damageSource === "fleet" ? "Search vehicle by number or IMEI…" : "Search item by IMEI, SIM, or serial…"} />
          {items.map(item => {
            const active = form.itemId === item.id;
            return (
              <div key={item.id} style={itemRow(active)} onClick={() => setField("itemId", item.id)}>
                <div style={dot(active)} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, fontFamily: "monospace", color: "var(--text-primary)" }}>{item.label}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{item.sub}</div>
                </div>
                {active && <CheckCircle2 size={14} color={color} />}
              </div>
            );
          })}
        </div>
      );
    }
    if (step === 2) return (
      <div>
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Damage Status</label>
          {[{ v: "DAMAGED", l: "Damaged", s: "Physically broken or unusable" }, { v: "LOST", l: "Lost", s: "Cannot be located or recovered" }].map(o => (
            <div key={o.v} style={radioRow(form.damageStatus === o.v)} onClick={() => setField("damageStatus", o.v)}>
              <div style={dot(form.damageStatus === o.v)} />
              <div><div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{o.l}</div><div style={{ fontSize: 11, color: "var(--text-muted)" }}>{o.s}</div></div>
            </div>
          ))}
        </div>
        <div>
          <label style={labelStyle}>Reason (required)</label>
          <textarea style={{ ...inputStyle, resize: "vertical", minHeight: 76 } as React.CSSProperties} placeholder="Describe how the item was damaged or lost" value={form.damageReason || ""} onChange={e => setField("damageReason", e.target.value)} />
        </div>
      </div>
    );
    if (step === 3) return (
      <div>
        <SummaryBox title="Damage Record">
          <ConfirmRow label="Source" value={form.damageSource === "fleet" ? "Installed Fleet" : "Stock"} />
          <ConfirmRow label="Status" value={form.damageStatus || ""} />
          <ConfirmRow label="Reason" value={form.damageReason || ""} />
        </SummaryBox>
        {note("Item will be removed from stock or MASTER and recorded in the damage log.")}
      </div>
    );
  }

  /* ── TRANSFER ── */
  if (opId === "transfer") {
    const allBranches = ["Kinshasa", "LSHI", "Brazza"];
    const availableBranches = allBranches.filter(b => b !== userBranch);
    const direction = form.direction || "";
    const useTemplate = form.useTemplate === "1";

    const directionCard = (val: string, label: string, sub: string, icon: string): React.CSSProperties => ({
      flex: 1, padding: "14px 16px", borderRadius: 10, cursor: "pointer", userSelect: "none",
      border: `2px solid ${direction === val ? color + "66" : "var(--border-subtle)"}`,
      backgroundColor: direction === val ? color + "0e" : "var(--surface-1)",
      transition: "all 140ms",
    });

    if (step === 0) return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <label style={labelStyle}>Transfer Direction</label>
          <div style={{ display: "flex", gap: 10 }}>
            {[
              { v: "out", l: "Stock OUT", s: "Send items to another branch", icon: "↑" },
              { v: "in",  l: "Stock IN",  s: "Receive items from another branch", icon: "↓" },
            ].map(d => (
              <div key={d.v} style={directionCard(d.v, d.l, d.s, d.icon)} onClick={() => setField("direction", d.v)}>
                <div style={{ fontSize: 22, marginBottom: 6, color: direction === d.v ? color : "var(--text-muted)" }}>{d.icon}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 3 }}>{d.l}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.4 }}>{d.s}</div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <label style={labelStyle}>Item Type</label>
          {[
            { v: "SIM",         l: "SIM Cards",    s: "Mobile SIM cards" },
            { v: "DEVICE",      l: "GPS Devices",  s: "Teltonika trackers and GPS units" },
            { v: "FUEL_SENSOR", l: "Fuel Sensors", s: "Fuel level monitoring sensors" },
          ].map(o => (
            <div key={o.v} style={radioRow(form.itemType === o.v)} onClick={() => setField("itemType", o.v)}>
              <div style={dot(form.itemType === o.v)} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{o.l}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{o.s}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );

    if (step === 1) {
      const transferItems = form.itemType === "SIM"
        ? data.sims.map(s => ({ id: String(s.id), label: s.number, sub: s.branch }))
        : form.itemType === "DEVICE"
        ? data.devices.map(d => ({ id: String(d.id), label: d.imei, sub: `${d.model} · ${d.branch}` }))
        : data.fuel.map(f => ({ id: String(f.id), label: f.serial, sub: f.branch }));
      const selectedArr = (form.selectedItems || "").split(",").filter(Boolean);

      if (direction === "out") return (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>Select Items to Send</label>
            <button
              onClick={() => setField("useTemplate", useTemplate ? "0" : "1")}
              style={{
                fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 5, cursor: "pointer",
                border: `1px solid ${useTemplate ? color : "var(--border-default)"}`,
                backgroundColor: useTemplate ? color + "14" : "transparent",
                color: useTemplate ? color : "var(--text-muted)",
              }}
            >
              {useTemplate ? "✓ Using template" : "Upload template instead"}
            </button>
          </div>

          {useTemplate ? (
            <div>
              <label
                htmlFor="transfer-tpl-out"
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  gap: 8, padding: "28px 20px", borderRadius: 9, cursor: "pointer",
                  border: `2px dashed ${form.templateFile ? color : "var(--border-default)"}`,
                  backgroundColor: form.templateFile ? color + "08" : "var(--surface-1)",
                  textAlign: "center",
                }}
              >
                <span style={{ fontSize: 22 }}>{form.templateFile ? "📄" : "☁"}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: form.templateFile ? color : "var(--text-primary)" }}>
                  {form.templateFile || "Click to upload Excel / CSV template"}
                </span>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  {form.templateFile ? "Template ready — click to replace" : ".xlsx or .csv • Max 5MB"}
                </span>
                <input id="transfer-tpl-out" type="file" accept=".xlsx,.csv" style={{ display: "none" }}
                  onChange={e => setField("templateFile", e.target.files?.[0]?.name || "")} />
              </label>
              <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8, textAlign: "center" }}>
                Need the template? <span onClick={() => downloadTransferTemplate(form.itemType || "SIM")} style={{ color: color, fontWeight: 600, cursor: "pointer", textDecoration: "underline" }}>Download blank template ↓</span>
              </p>
            </div>
          ) : (
            <div>
              <div style={{ position: "relative", marginBottom: 10 }}>
                <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                <input
                  style={{ ...inputStyle, paddingLeft: 32 }}
                  placeholder="Search by serial, IMEI, or SIM number…"
                  value={form.itemSearch || ""}
                  onChange={e => setField("itemSearch", e.target.value)}
                />
              </div>
              <div style={{ maxHeight: 240, overflowY: "auto" }}>
                {transferItems
                  .filter(item => !form.itemSearch || item.label.toLowerCase().includes(form.itemSearch.toLowerCase()))
                  .map(item => {
                    const sel = selectedArr.includes(item.id);
                    return (
                      <div key={item.id} style={itemRow(sel)} onClick={() => {
                        const next = sel ? selectedArr.filter(x => x !== item.id) : [...selectedArr, item.id];
                        setField("selectedItems", next.join(","));
                      }}>
                        <div style={{ ...dot(sel, true), borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {sel && <span style={{ fontSize: 10, color: "white", fontWeight: 700 }}>✓</span>}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, fontFamily: "monospace", color: "var(--text-primary)" }}>{item.label}</div>
                          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{item.sub}</div>
                        </div>
                      </div>
                    );
                  })}
              </div>
              {selectedArr.length > 0 && (
                <div style={{ marginTop: 8, fontSize: 12, fontWeight: 600, color: color }}>
                  {selectedArr.length} item{selectedArr.length > 1 ? "s" : ""} selected
                </div>
              )}
            </div>
          )}
        </div>
      );

      /* direction === "in" */
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={labelStyle}>Upload Transfer Template</label>
            <label
              htmlFor="transfer-tpl-in"
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                gap: 8, padding: "28px 20px", borderRadius: 9, cursor: "pointer",
                border: `2px dashed ${form.templateFile ? color : "var(--border-default)"}`,
                backgroundColor: form.templateFile ? color + "08" : "var(--surface-1)",
                textAlign: "center",
              }}
            >
              <span style={{ fontSize: 22 }}>{form.templateFile ? "📄" : "☁"}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: form.templateFile ? color : "var(--text-primary)" }}>
                {form.templateFile || "Click to upload incoming stock template"}
              </span>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                {form.templateFile ? "Template ready — click to replace" : ".xlsx or .csv • Max 5MB"}
              </span>
              <input id="transfer-tpl-in" type="file" accept=".xlsx,.csv" style={{ display: "none" }}
                onChange={e => setField("templateFile", e.target.files?.[0]?.name || "")} />
            </label>
            <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8, textAlign: "center" }}>
              Need the template? <span style={{ color: color, fontWeight: 600, cursor: "pointer" }}>Download blank template ↓</span>
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1, height: 1, backgroundColor: "var(--border-subtle)" }} />
            <span style={{ fontSize: 11, color: "var(--text-muted)", whiteSpace: "nowrap" }}>or enter manually</span>
            <div style={{ flex: 1, height: 1, backgroundColor: "var(--border-subtle)" }} />
          </div>
          <div>
            <label style={labelStyle}>Expected Quantity</label>
            <input
              type="number" min={1} style={{ ...inputStyle, width: 120 }}
              placeholder="0"
              value={form.qty || ""}
              onChange={e => setField("qty", e.target.value)}
            />
            <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>Items will be verified on arrival and added to your branch stock.</p>
          </div>
        </div>
      );
    }

    if (step === 2) {
      const fromBranch = direction === "out" ? userBranch : (form.fromBranch || "");
      const toBranch   = direction === "in"  ? userBranch : (form.toBranch  || "");

      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* FROM */}
            <div style={{ flex: 1, textAlign: "center" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>From</div>
              {direction === "out" ? (
                <div style={{
                  padding: "14px 12px", borderRadius: 10, textAlign: "center",
                  border: `2px solid ${color}44`, backgroundColor: color + "0e",
                }}>
                  <div style={{ fontSize: 11, color: color, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>Your Branch</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>{userBranch}</div>
                </div>
              ) : (
                <div>
                  {availableBranches.map(b => (
                    <div key={b} style={{ ...radioRow(form.fromBranch === b), justifyContent: "center", flexDirection: "column", textAlign: "center", padding: "10px 8px" }}
                      onClick={() => setField("fromBranch", b)}>
                      <div style={{ ...dot(form.fromBranch === b), margin: "0 auto 4px" }} />
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{b}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {/* Arrow */}
            <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
              <div style={{ fontSize: 20, color: color }}>→</div>
              <div style={{ fontSize: 9, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Transfer</div>
            </div>
            {/* TO */}
            <div style={{ flex: 1, textAlign: "center" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>To</div>
              {direction === "in" ? (
                <div style={{
                  padding: "14px 12px", borderRadius: 10, textAlign: "center",
                  border: `2px solid ${color}44`, backgroundColor: color + "0e",
                }}>
                  <div style={{ fontSize: 11, color: color, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>Your Branch</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>{userBranch}</div>
                </div>
              ) : (
                <div>
                  {availableBranches.map(b => (
                    <div key={b} style={{ ...radioRow(form.toBranch === b), justifyContent: "center", flexDirection: "column", textAlign: "center", padding: "10px 8px" }}
                      onClick={() => setField("toBranch", b)}>
                      <div style={{ ...dot(form.toBranch === b), margin: "0 auto 4px" }} />
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{b}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          {fromBranch && toBranch && (
            <div style={{ padding: "10px 14px", borderRadius: 8, backgroundColor: color + "0a", border: `1px solid ${color}22`, textAlign: "center" }}>
              <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Route confirmed: </span>
              <span style={{ fontSize: 12, fontWeight: 700, color: color }}>{fromBranch} → {toBranch}</span>
            </div>
          )}
        </div>
      );
    }

    if (step === 3) {
      const selectedArr = (form.selectedItems || "").split(",").filter(Boolean);
      const fromBranch = direction === "out" ? userBranch : (form.fromBranch || "");
      const toBranch   = direction === "in"  ? userBranch : (form.toBranch  || "");
      const itemTypeLabel = form.itemType === "SIM" ? "SIM Cards" : form.itemType === "DEVICE" ? "GPS Devices" : "Fuel Sensors";
      const itemsSummary = form.templateFile ? `Template: ${form.templateFile}` : `${selectedArr.length} item${selectedArr.length !== 1 ? "s" : ""} selected`;
      return (
        <div>
          <SummaryBox title="Transfer Summary">
            <ConfirmRow label="Direction"  value={direction === "out" ? "Stock OUT (Sending)" : "Stock IN (Receiving)"} />
            <ConfirmRow label="Item Type"  value={itemTypeLabel} />
            <ConfirmRow label="Items"      value={itemsSummary} />
            <ConfirmRow label="From"       value={fromBranch} />
            <ConfirmRow label="To"         value={toBranch} />
          </SummaryBox>
          {note("Stock will be updated in both branches once this transfer is confirmed.")}
        </div>
      );
    }
  }

  /* ── FUEL ONLY ── */
  if (opId === "fuel") {
    const noFuel = data.installed.filter(v => !v.hasFuel);
    if (step === 0) return (
      <div>
        <SearchBox placeholder="Search vehicle without fuel sensor…" />
        {noFuel.map(v => {
          const active = form.vehicleId === String(v.id);
          return (
            <div key={v.id} style={itemRow(active)} onClick={() => setField("vehicleId", String(v.id))}>
              <div style={dot(active)} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{v.vehicle}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{v.customer} · {v.branch} · No sensor</div>
              </div>
              {active && <CheckCircle2 size={14} color={color} />}
            </div>
          );
        })}
      </div>
    );
    if (step === 1) return (
      <div>
        <SearchBox placeholder="Search sensor by serial or MAC…" />
        {data.fuel.map(f => {
          const active = form.fuelId === String(f.id);
          return (
            <div key={f.id} style={itemRow(active)} onClick={() => setField("fuelId", String(f.id))}>
              <div style={dot(active)} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, fontFamily: "monospace", color: "var(--text-primary)" }}>{f.serial}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>MAC: {f.mac} · {f.branch}</div>
              </div>
              {active && <CheckCircle2 size={14} color={color} />}
            </div>
          );
        })}
      </div>
    );
    if (step === 2) return (
      <div>
        <SummaryBox title="Fuel Sensor Install">
          <ConfirmRow label="Vehicle"      value={noFuel.find(v => String(v.id) === form.vehicleId)?.vehicle || ""} />
          <ConfirmRow label="Customer"     value={noFuel.find(v => String(v.id) === form.vehicleId)?.customer || ""} />
          <ConfirmRow label="Fuel Sensor"  value={data.fuel.find(f => String(f.id) === form.fuelId)?.serial || ""} />
        </SummaryBox>
        {note("Sensor will be removed from stock and attached to the installation record.")}
      </div>
    );
  }

  return <div style={{ padding: "24px 0", color: "var(--text-muted)", fontSize: 13 }}>Select a step to continue.</div>;
}

/* ─── Card ─── */
function OpCard({ op, selected, onClick }: { op: Op; selected: boolean; onClick: () => void }) {
  const Icon = op.icon;
  return (
    <button
      onClick={onClick}
      style={{
        position: "relative",
        backgroundColor: selected ? op.color + "09" : "var(--surface-2)",
        border: `1px solid ${selected ? op.color + "44" : "var(--border-subtle)"}`,
        borderTop: `3px solid ${op.color}`,
        borderRadius: 10,
        padding: "20px 20px 18px",
        cursor: "pointer",
        textAlign: "left",
        width: "100%",
        transition: "all 180ms cubic-bezier(0.25,1,0.5,1)",
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = op.color + "44";
        el.style.backgroundColor = op.color + "07";
        el.style.transform = "translateY(-1px)";
        el.style.boxShadow = `0 4px 16px ${op.color}1a`;
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = selected ? op.color + "44" : "var(--border-subtle)";
        el.style.backgroundColor = selected ? op.color + "09" : "var(--surface-2)";
        el.style.transform = "translateY(0)";
        el.style.boxShadow = "none";
      }}
    >
      <div style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: op.color + "18", border: `1px solid ${op.color}28`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
        <Icon size={20} color={op.color} strokeWidth={1.8} />
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.01em", marginBottom: 6 }}>{op.label}</div>
      <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>{op.description}</div>
      {selected && (
        <div style={{ position: "absolute", top: 12, right: 12 }}>
          <CheckCircle2 size={14} color={op.color} />
        </div>
      )}
    </button>
  );
}

/* ─── Wizard Modal ─── */
function WizardPanel({ op, onClose, isAdmin, userBranch, data }: { op: Op; onClose: () => void; isAdmin: boolean; userBranch: string; data: OpsData }) {
  const [step, setStep] = useState(0);
  const [form, setFormState] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);

  const setField = (k: string, v: string) => setFormState(prev => ({ ...prev, [k]: v }));
  const isLast = step === op.stepLabels.length - 1;
  const isDestructive = ["damage", "uninstall", "repair"].includes(op.id);
  const confirmColor = isDestructive ? "#ef4444" : "#31c86e";

  // Close on ESC
  useState(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape" && !done) onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  });

  const canProceed = (): boolean => {
    const id = op.id;
    if (id === "deploy")    return [!!form.bundleId, !!(form.vehicle && form.customer), true, true][step] ?? true;
    if (id === "pair")      return [!!form.simId, !!form.deviceId, true][step] ?? true;
    if (id === "activate")  return [!!form.pairId, true][step] ?? true;
    if (id === "repair")    return [!!form.vehicleId, !!form.repairType, !!form.newItemId, !!form.oldItemFate, true][step] ?? true;
    if (id === "uninstall") return [!!form.vehicleId, true, true][step] ?? true;
    if (id === "damage")    return [!!form.damageSource, !!form.itemId, !!(form.damageStatus && form.damageReason), true][step] ?? true;
    if (id === "transfer") {
      const dir = form.direction || "";
      const hasItems = dir === "out"
        ? !!(form.useTemplate === "1" ? form.templateFile : form.selectedItems?.split(",").filter(Boolean).length)
        : !!(form.templateFile || form.qty);
      const hasBranch = dir === "out" ? !!form.toBranch : !!form.fromBranch;
      return [!!(dir && form.itemType), hasItems, hasBranch, true][step] ?? true;
    }
    if (id === "fuel")      return [!!form.vehicleId, !!form.fuelId, true][step] ?? true;
    return true;
  };

  const ok = canProceed();

  /* backdrop */
  const backdrop: React.CSSProperties = {
    position: "fixed", inset: 0, zIndex: 999,
    backgroundColor: "rgba(10,14,26,0.72)",
    backdropFilter: "blur(3px)",
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: 24,
  };

  if (done) return (
    <div style={backdrop}>
      <div style={{ backgroundColor: "var(--surface-0)", borderRadius: 16, padding: "56px 48px", display: "flex", flexDirection: "column", alignItems: "center", gap: 20, textAlign: "center", maxWidth: 440, width: "100%", border: "1px solid var(--border-default)", boxShadow: "0 32px 96px rgba(0,0,0,0.3)" }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", backgroundColor: "#31c86e12", border: "2px solid #31c86e55", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <CheckCircle2 size={32} color="#31c86e" />
        </div>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em", marginBottom: 8 }}>Operation Complete</div>
          <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>"{op.label}" has been recorded and logged to the movement audit trail.</div>
        </div>
        <button onClick={onClose} style={{ marginTop: 4, padding: "10px 28px", borderRadius: 8, border: "1px solid var(--border-default)", backgroundColor: "var(--surface-2)", fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", cursor: "pointer" }}>
          Done
        </button>
      </div>
    </div>
  );

  return (
    <div style={backdrop} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ backgroundColor: "var(--surface-0)", borderRadius: 16, width: "100%", maxWidth: 760, maxHeight: "calc(100vh - 48px)", display: "flex", flexDirection: "column", border: "1px solid var(--border-default)", boxShadow: "0 32px 96px rgba(0,0,0,0.3)", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, backgroundColor: "var(--surface-1)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: op.color + "18", border: `1px solid ${op.color}28`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <op.icon size={18} color={op.color} strokeWidth={1.8} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>{op.label}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Operation Wizard · Step {step + 1} of {op.stepLabels.length}</div>
            </div>
            {isDestructive && (
              <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 5, backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", marginLeft: 6 }}>
                <ShieldAlert size={11} color="#ef4444" />
                <span style={{ fontSize: 11, fontWeight: 600, color: "#ef4444" }}>Irreversible</span>
              </div>
            )}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "1px solid var(--border-subtle)", cursor: "pointer", padding: "5px 7px", borderRadius: 7, display: "flex", alignItems: "center", color: "var(--text-muted)" }}>
            <X size={14} />
          </button>
        </div>

        {/* Body: left steps + right content */}
        <div style={{ display: "flex", flex: 1, minHeight: 0, overflow: "hidden" }}>

          {/* Left: vertical step tracker */}
          <div style={{ width: 196, flexShrink: 0, borderRight: "1px solid var(--border-subtle)", backgroundColor: "var(--surface-1)", padding: "24px 20px", overflowY: "auto" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 18 }}>Progress</div>
            {op.stepLabels.map((label, i) => (
              <div key={i} style={{ display: "flex", gap: 12, marginBottom: i < op.stepLabels.length - 1 ? 0 : 0 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
                    backgroundColor: i < step ? "#31c86e" : i === step ? op.color : "var(--surface-3)",
                    border: `2px solid ${i < step ? "#31c86e" : i === step ? op.color : "var(--border-default)"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10, fontWeight: 700,
                    color: i <= step ? "white" : "var(--text-muted)",
                    transition: "all 220ms",
                  }}>
                    {i < step ? "✓" : i + 1}
                  </div>
                  {i < op.stepLabels.length - 1 && (
                    <div style={{ width: 2, flex: 1, minHeight: 24, margin: "4px 0", backgroundColor: i < step ? "#31c86e44" : "var(--border-subtle)", borderRadius: 1 }} />
                  )}
                </div>
                <div style={{ paddingBottom: i < op.stepLabels.length - 1 ? 24 : 0, paddingTop: 3 }}>
                  <div style={{ fontSize: 12, fontWeight: i === step ? 700 : 500, color: i === step ? "var(--text-primary)" : i < step ? "var(--text-secondary)" : "var(--text-muted)", lineHeight: 1.3 }}>{label}</div>
                  {i === step && <div style={{ width: 20, height: 2, backgroundColor: op.color, borderRadius: 1, marginTop: 5 }} />}
                </div>
              </div>
            ))}
          </div>

          {/* Right: step content */}
          <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
            {isDestructive && isLast && (
              <div style={{ display: "flex", gap: 10, padding: "11px 14px", borderRadius: 8, backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.22)", marginBottom: 18 }}>
                <ShieldAlert size={14} color="#ef4444" style={{ flexShrink: 0, marginTop: 1 }} />
                <span style={{ fontSize: 12, color: "#ef4444", lineHeight: 1.5 }}>Review every detail carefully. This operation cannot be undone once confirmed.</span>
              </div>
            )}
            <StepContent opId={op.id} step={step} form={form} setField={setField} color={op.color} isAdmin={isAdmin} userBranch={userBranch} data={data} />
          </div>
        </div>

        {/* Footer navigation */}
        <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border-subtle)", backgroundColor: "var(--surface-1)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, gap: 12 }}>
          <button
            onClick={step === 0 ? onClose : () => setStep(s => s - 1)}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 8, border: "1px solid var(--border-default)", backgroundColor: "var(--surface-2)", fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", cursor: "pointer" }}
          >
            <ChevronLeft size={13} />{step === 0 ? "Cancel" : "Back"}
          </button>

          <div style={{ display: "flex", gap: 5 }}>
            {op.stepLabels.map((_, i) => (
              <div key={i} style={{ width: i === step ? 16 : 6, height: 6, borderRadius: 3, backgroundColor: i < step ? "#31c86e88" : i === step ? op.color : "var(--border-default)", transition: "all 220ms" }} />
            ))}
          </div>

          {!ok && (
            <div style={{ flex: 1, textAlign: "center" }}>
              <span style={{ fontSize: 11, color: "var(--text-muted)", fontStyle: "italic" }}>Complete this step to continue</span>
            </div>
          )}

          <button
            onClick={ok ? (isLast ? () => setDone(true) : () => setStep(s => s + 1)) : undefined}
            style={{
              display: "flex", alignItems: "center", gap: 7,
              padding: "9px 22px", borderRadius: 8,
              border: `1px solid ${ok ? (isLast ? confirmColor + "55" : op.color + "44") : "var(--border-subtle)"}`,
              backgroundColor: ok ? (isLast ? confirmColor : op.color) : "var(--surface-3)",
              fontSize: 13, fontWeight: 600,
              color: ok ? "white" : "var(--text-muted)",
              cursor: ok ? "pointer" : "not-allowed",
              opacity: ok ? 1 : 0.6,
              transition: "all 180ms",
            }}
          >
            {isLast ? "Confirm & Execute" : "Next"}
            {!isLast && <ChevronRight size={13} />}
            {isLast && <CheckCircle2 size={13} />}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Page ─── */
export default function OpsPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [session, setSession] = useState<SessionUser | null>(null);
  const [data, setData] = useState<OpsData>(emptyOpsData);

  useEffect(() => {
    setSession(getSession());
  }, []);

  useEffect(() => {
    Promise.all([
      fetchRTDBundles(),
      fetchPairedBundles(),
      fetchInstallations(),
      fetchSims(),
      fetchDevices(),
      fetchFuelSensors(),
      fetchCustomers(),
    ]).then(([rtd, paired, installs, sims, devices, fuel, customers]) => {
      setData({
        rtd: rtd.map(r => ({ id: r.id, imei: r.imei, sim: r.sim, model: r.model, branch: r.branch })),
        paired: paired.map(p => ({ id: p.id, imei: p.imei, sim: p.sim, model: p.model, branch: p.branch })),
        installed: installs
          .filter(i => i.status === "INSTALLED")
          .map(i => ({ id: i.id, vehicle: i.vehicle, customer: i.customer, imei: i.imei, branch: i.branch, hasFuel: !!i.fuel_serial })),
        sims: sims
          .filter(s => s.status.toUpperCase() === "AVAILABLE")
          .map(s => ({ id: s.id, number: s.number, branch: s.branch })),
        devices: devices
          .filter(d => d.status.toUpperCase() === "AVAILABLE")
          .map(d => ({ id: d.id, imei: d.imei, model: d.model, branch: d.branch })),
        fuel: fuel
          .filter(f => f.status.toUpperCase() === "AVAILABLE")
          .map(f => ({ id: f.id, serial: f.serial, mac: f.mac, branch: f.branch })),
        customers: customers.map(c => ({ id: c.id, name: c.name, branch: c.branch })),
      });
    });
  }, []);

  const isAdmin = session?.isAdmin ?? false;
  const userBranch = session?.branch ?? "Kinshasa";
  const selectedOp = ops.find(o => o.id === selectedId);

  // supervisors operate only on their own branch's stock/fleet
  const scopedData: OpsData = isAdmin ? data : {
    rtd: data.rtd.filter(x => x.branch === userBranch),
    paired: data.paired.filter(x => x.branch === userBranch),
    installed: data.installed.filter(x => x.branch === userBranch),
    sims: data.sims.filter(x => x.branch === userBranch),
    devices: data.devices.filter(x => x.branch === userBranch),
    fuel: data.fuel.filter(x => x.branch === userBranch),
    customers: data.customers.filter(x => x.branch === userBranch),
  };

  return (
    <AppShell>
      <div className="page-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">Operations Hub</h1>
            <p className="page-subtitle">8 lifecycle operations · Select a card to launch the step-by-step wizard</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ padding: "6px 14px", backgroundColor: "rgba(57,102,255,0.1)", borderRadius: 6, border: "1px solid rgba(57,102,255,0.2)", fontSize: 12, color: "var(--brand-blue)", fontWeight: 600 }}>
              {isAdmin ? "All Branches" : userBranch}
            </div>
          </div>
        </div>

        {/* Card grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 20 }}>
          {ops.map(op => (
            <OpCard
              key={op.id}
              op={op}
              selected={selectedId === op.id}
              onClick={() => setSelectedId(selectedId === op.id ? null : op.id)}
            />
          ))}
        </div>

        {/* Prompt bar */}
        <div style={{ backgroundColor: "var(--surface-2)", border: "1px solid var(--border-subtle)", borderRadius: 10, padding: "16px 20px", display: "flex", alignItems: "center", gap: 12 }}>
          <ShieldAlert size={14} color="var(--text-muted)" />
          <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
            Select any operation card to launch its guided wizard. All operations require final confirmation before execution and are logged to the audit trail.
          </span>
        </div>

        {/* Modal — rendered outside page flow via fixed positioning */}
        {selectedOp && (
          <WizardPanel key={selectedOp.id} op={selectedOp} onClose={() => setSelectedId(null)} isAdmin={isAdmin} userBranch={userBranch} data={scopedData} />
        )}
      </div>
    </AppShell>
  );
}
