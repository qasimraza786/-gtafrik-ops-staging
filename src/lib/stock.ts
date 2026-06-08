import { supabase } from "./supabase";

export type StockType = "sims" | "devices" | "fuel";

type FieldDef = { key: string; label: string; required: boolean; default?: string };

export const STOCK_CONFIG: Record<StockType, {
  table: string;
  title: string;
  fields: FieldDef[];
  templateHeaders: string[];
}> = {
  sims: {
    table: "sims",
    title: "SIM Cards",
    fields: [
      { key: "number", label: "SIM Number (ICCID)", required: true },
      { key: "provider", label: "Provider", required: false, default: "truephone" },
    ],
    templateHeaders: ["SIM Number", "Provider", "Date Added"],
  },
  devices: {
    table: "devices",
    title: "GPS Devices",
    fields: [
      { key: "imei", label: "Device IMEI", required: true },
      { key: "model", label: "Model", required: true, default: "FMB920" },
    ],
    templateHeaders: ["Device IMEI", "Model", "Date Added"],
  },
  fuel: {
    table: "fuel_sensors",
    title: "Fuel Sensors",
    fields: [
      { key: "serial", label: "Serial Number", required: true },
      { key: "mac", label: "MAC Address", required: true },
      { key: "model", label: "Model", required: false, default: "TD_BLE" },
    ],
    templateHeaders: ["Serial Number", "MAC Address", "Model", "Date Added"],
  },
};

const STATUS: Record<StockType, string> = { sims: "AVAILABLE", devices: "AVAILABLE", fuel: "Available" };

export function normalizeBranch(v: string): string {
  const s = (v || "").trim().toLowerCase();
  if (s.startsWith("kin")) return "Kinshasa";
  if (s.startsWith("lsh") || s.startsWith("lub")) return "LSHI";
  if (s.startsWith("braz")) return "Brazza";
  return "Kinshasa";
}

export type StockRow = Record<string, string | null>;

/** Build a CSV blank template (headers only) for the given stock type. */
export function buildTemplate(type: StockType): string {
  return STOCK_CONFIG[type].templateHeaders.join(",") + "\n";
}

export function downloadCsv(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Parse a CSV string into stock rows mapped to DB columns for the given type + branch. */
export function parseTemplate(type: StockType, csv: string, branch: string): StockRow[] {
  const lines = csv.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const cfg = STOCK_CONFIG[type];
  const rows: StockRow[] = [];

  // skip header row (line 0)
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(",").map((c) => c.trim());
    if (!cells[0]) continue;
    const row = buildRow(type, cells, branch);
    if (row) rows.push(row);
  }
  void cfg;
  return rows;
}

function buildRow(type: StockType, cells: string[], branch: string): StockRow | null {
  const b = normalizeBranch(branch);
  const dateAt = (v?: string) => (v && v.trim() ? v.trim() : null);

  if (type === "sims") {
    if (!cells[0]) return null;
    return { number: cells[0], provider: cells[1] || "truephone", status: STATUS.sims, branch: b, date_added: dateAt(cells[2]) };
  }
  if (type === "devices") {
    if (!cells[0]) return null;
    return { imei: cells[0], model: cells[1] || "FMB920", status: STATUS.devices, branch: b, date_added: dateAt(cells[2]) };
  }
  // fuel
  if (!cells[0]) return null;
  return { serial: cells[0], mac: cells[1] || "", model: cells[2] || "TD_BLE", status: STATUS.fuel, branch: b, date_added: dateAt(cells[3]) };
}

/** Build a single row from a manual-entry form object. */
export function buildManualRow(type: StockType, form: Record<string, string>, branch: string): StockRow {
  const b = normalizeBranch(branch);
  const dateAt = form.date_added?.trim() || null;
  if (type === "sims") {
    return { number: form.number.trim(), provider: form.provider?.trim() || "truephone", status: STATUS.sims, branch: b, date_added: dateAt };
  }
  if (type === "devices") {
    return { imei: form.imei.trim(), model: form.model?.trim() || "FMB920", status: STATUS.devices, branch: b, date_added: dateAt };
  }
  return { serial: form.serial.trim(), mac: form.mac.trim(), model: form.model?.trim() || "TD_BLE", status: STATUS.fuel, branch: b, date_added: dateAt };
}

export async function addStock(type: StockType, rows: StockRow[]): Promise<number> {
  if (rows.length === 0) throw new Error("No rows to add.");
  const { error } = await supabase.from(STOCK_CONFIG[type].table).insert(rows);
  if (error) throw new Error(error.message);
  return rows.length;
}
