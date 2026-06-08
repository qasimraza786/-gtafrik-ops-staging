"use client";

import { useState } from "react";
import { X, Upload, PencilLine, Download, CheckCircle2, Radio, Cpu, Fuel } from "lucide-react";
import {
  STOCK_CONFIG, buildTemplate, downloadCsv, parseTemplate, buildManualRow, addStock,
  type StockType, type StockRow,
} from "@/lib/stock";

const TYPES: { key: StockType; label: string; icon: React.ElementType; color: string }[] = [
  { key: "sims", label: "SIM Cards", icon: Radio, color: "#3966ff" },
  { key: "devices", label: "GPS Devices", icon: Cpu, color: "#31c86e" },
  { key: "fuel", label: "Fuel Sensors", icon: Fuel, color: "#06b6d4" },
];

const BRANCHES = ["Kinshasa", "LSHI", "Brazza"];

export function AddStockModal({
  isAdmin, userBranch, onClose, onAdded,
}: {
  isAdmin: boolean;
  userBranch: string;
  onClose: () => void;
  onAdded: (count: number, type: StockType) => void;
}) {
  const [type, setType] = useState<StockType>("sims");
  const [mode, setMode] = useState<"manual" | "upload">("manual");
  const [branch, setBranch] = useState(isAdmin ? "Kinshasa" : userBranch);
  const [form, setForm] = useState<Record<string, string>>({});
  const [fileName, setFileName] = useState("");
  const [fileRows, setFileRows] = useState<StockRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const cfg = STOCK_CONFIG[type];
  const active = TYPES.find((t) => t.key === type)!;

  const setField = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const switchType = (t: StockType) => {
    setType(t);
    setForm({});
    setFileRows([]);
    setFileName("");
    setErr("");
  };

  const handleFile = async (file: File) => {
    setErr("");
    setFileName(file.name);
    const text = await file.text();
    try {
      const rows = parseTemplate(type, text, branch);
      if (rows.length === 0) { setErr("No valid rows found in file."); setFileRows([]); return; }
      setFileRows(rows);
    } catch {
      setErr("Could not parse file. Use the blank template as a guide.");
      setFileRows([]);
    }
  };

  const submit = async () => {
    setErr(""); setBusy(true);
    try {
      let rows: StockRow[];
      if (mode === "upload") {
        if (fileRows.length === 0) throw new Error("Upload a CSV with at least one row.");
        rows = fileRows.map((r) => ({ ...r, branch }));
      } else {
        for (const f of cfg.fields) {
          if (f.required && !form[f.key]?.trim()) throw new Error(`${f.label} is required.`);
        }
        rows = [buildManualRow(type, form, branch)];
      }
      const n = await addStock(type, rows);
      onAdded(n, type);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to add stock.");
      setBusy(false);
    }
  };

  const label: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6, display: "block" };
  const input: React.CSSProperties = { width: "100%", padding: "10px 12px", border: "1px solid var(--border-default)", borderRadius: 7, fontSize: 14, backgroundColor: "var(--surface-1)", color: "var(--text-primary)", boxSizing: "border-box", fontFamily: "inherit" };

  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} style={{
      position: "fixed", inset: 0, zIndex: 999, backgroundColor: "rgba(10,14,26,0.72)",
      backdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
    }}>
      <div style={{
        backgroundColor: "var(--surface-0)", borderRadius: 16, width: "100%", maxWidth: 560,
        maxHeight: "calc(100vh - 48px)", display: "flex", flexDirection: "column",
        border: "1px solid var(--border-default)", boxShadow: "0 32px 96px rgba(0,0,0,0.3)", overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: active.color + "18", border: `1px solid ${active.color}28`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <active.icon size={18} color={active.color} strokeWidth={1.8} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>Add Stock</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Manual entry or bulk CSV upload</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "1px solid var(--border-subtle)", borderRadius: 7, padding: "5px 7px", cursor: "pointer", color: "var(--text-muted)", display: "flex" }}>
            <X size={14} />
          </button>
        </div>

        <div style={{ padding: 22, overflowY: "auto", display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Type selector */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
            {TYPES.map((t) => {
              const on = type === t.key;
              return (
                <button key={t.key} onClick={() => switchType(t.key)} style={{
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "12px 8px",
                  borderRadius: 9, cursor: "pointer", transition: "all 120ms",
                  border: `1px solid ${on ? t.color + "55" : "var(--border-subtle)"}`,
                  backgroundColor: on ? t.color + "0e" : "var(--surface-1)",
                }}>
                  <t.icon size={18} color={on ? t.color : "var(--text-muted)"} strokeWidth={1.9} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: on ? t.color : "var(--text-secondary)" }}>{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* Branch */}
          <div>
            <label style={label}>Destination Branch</label>
            {isAdmin ? (
              <select style={{ ...input, cursor: "pointer" }} value={branch} onChange={(e) => setBranch(e.target.value)}>
                {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            ) : (
              <div style={{ ...input, backgroundColor: "var(--surface-2)", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ flex: 1 }}>{branch}</span>
                <span style={{ fontSize: 11, color: "var(--text-muted)", backgroundColor: "var(--surface-3)", padding: "2px 8px", borderRadius: 4, fontWeight: 600 }}>Your branch</span>
              </div>
            )}
          </div>

          {/* Mode toggle */}
          <div style={{ display: "flex", border: "1px solid var(--border-default)", borderRadius: 8, overflow: "hidden", backgroundColor: "var(--surface-2)" }}>
            {[
              { k: "manual" as const, l: "Manual Entry", icon: PencilLine },
              { k: "upload" as const, l: "Upload CSV", icon: Upload },
            ].map((m) => (
              <button key={m.k} onClick={() => { setMode(m.k); setErr(""); }} style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                padding: "9px 0", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
                backgroundColor: mode === m.k ? active.color : "transparent",
                color: mode === m.k ? "white" : "var(--text-muted)", transition: "all 130ms",
              }}>
                <m.icon size={14} /> {m.l}
              </button>
            ))}
          </div>

          {/* Manual fields */}
          {mode === "manual" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {cfg.fields.map((f) => (
                <div key={f.key}>
                  <label style={label}>{f.label}{f.required && " *"}</label>
                  <input style={input} value={form[f.key] ?? ""} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.default ? `Default: ${f.default}` : ""} />
                </div>
              ))}
              <div>
                <label style={label}>Date Added (optional)</label>
                <input type="date" style={input} value={form.date_added ?? ""} onChange={(e) => setField("date_added", e.target.value)} />
              </div>
            </div>
          )}

          {/* Upload */}
          {mode === "upload" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <label htmlFor="stock-file" style={{
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8,
                padding: "28px 20px", borderRadius: 10, cursor: "pointer", textAlign: "center",
                border: `2px dashed ${fileRows.length ? active.color : "var(--border-default)"}`,
                backgroundColor: fileRows.length ? active.color + "08" : "var(--surface-1)",
              }}>
                {fileRows.length ? <CheckCircle2 size={26} color={active.color} /> : <Upload size={26} color="var(--text-muted)" />}
                <span style={{ fontSize: 13, fontWeight: 600, color: fileRows.length ? active.color : "var(--text-primary)" }}>
                  {fileRows.length ? `${fileName} — ${fileRows.length} row${fileRows.length > 1 ? "s" : ""} ready` : "Click to upload CSV file"}
                </span>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>.csv · matches the blank template columns</span>
                <input id="stock-file" type="file" accept=".csv,text/csv" style={{ display: "none" }}
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
              </label>
              <button onClick={() => downloadCsv(`gtafrik-${type}-template.csv`, buildTemplate(type))} style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
                fontSize: 12, fontWeight: 600, color: active.color, background: "none",
                border: `1px solid ${active.color}33`, borderRadius: 7, padding: "8px 12px", cursor: "pointer",
              }}>
                <Download size={13} /> Download blank {cfg.title} template
              </button>
              <p style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "center" }}>
                Columns: {cfg.templateHeaders.join(" · ")}
              </p>
            </div>
          )}

          {err && (
            <div style={{ fontSize: 12, color: "#b91c1c", backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, padding: "9px 12px" }}>{err}</div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "16px 22px", borderTop: "1px solid var(--border-subtle)", display: "flex", justifyContent: "flex-end", gap: 10, flexShrink: 0 }}>
          <button onClick={onClose} className="btn btn-ghost">Cancel</button>
          <button onClick={submit} className="btn btn-primary" disabled={busy} style={{ backgroundColor: active.color, borderColor: active.color }}>
            {busy ? "Adding…" : mode === "upload" ? `Add ${fileRows.length || ""} to stock` : "Add to stock"}
          </button>
        </div>
      </div>
    </div>
  );
}
