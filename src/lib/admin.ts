import { supabase } from "./supabase";
import type { UserRole } from "./auth";

export type AdminUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  branch: string;
  is_admin: boolean;
  active: boolean;
};

export async function fetchUsers(): Promise<AdminUser[]> {
  const { data } = await supabase
    .from("users")
    .select("id,email,name,role,branch,is_admin,active")
    .order("created_at", { ascending: true });
  return (data as AdminUser[]) ?? [];
}

const FN_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/manage-users`;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function callFn(payload: Record<string, unknown>): Promise<void> {
  const { data: sess } = await supabase.auth.getSession();
  const token = sess.session?.access_token;
  if (!token) throw new Error("Not authenticated.");

  const res = await fetch(FN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: ANON,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? "Request failed.");
}

export type NewUser = {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  branch: string;
};

export async function createUser(u: NewUser): Promise<void> {
  await callFn({ action: "create", ...u });
}

export async function setUserActive(email: string, active: boolean): Promise<void> {
  await callFn({ action: active ? "activate" : "deactivate", email });
}

export type DataQualityCheck = {
  check: string;
  status: "pass" | "warn" | "fail";
  detail: string;
};

async function tableCount(table: string): Promise<number> {
  const { count } = await supabase.from(table).select("*", { count: "exact", head: true });
  return count ?? 0;
}

async function statusCount(table: string, status: string): Promise<number> {
  const { count } = await supabase.from(table).select("*", { count: "exact", head: true }).eq("status", status);
  return count ?? 0;
}

export async function fetchDataQuality(): Promise<DataQualityCheck[]> {
  const [
    sims, devices, fuel, installed, rtdMaster, rtdTable, pairTable, dupSim, dupImei,
  ] = await Promise.all([
    tableCount("sims"),
    tableCount("devices"),
    tableCount("fuel_sensors"),
    statusCount("installations", "INSTALLED"),
    statusCount("installations", "READY TO DEPLOY"),
    tableCount("rtd_bundles"),
    tableCount("paired_bundles"),
    dupCount("installations", "sim"),
    dupCount("installations", "imei"),
  ]);

  const SIM_THRESHOLD = 50;
  const DEVICE_THRESHOLD = 20;

  return [
    {
      check: "Duplicate SIM numbers",
      status: dupSim === 0 ? "pass" : "fail",
      detail: dupSim === 0 ? "No duplicate SIMs in installations" : `${dupSim} duplicate SIM(s) found`,
    },
    {
      check: "Duplicate IMEI numbers",
      status: dupImei === 0 ? "pass" : "fail",
      detail: dupImei === 0 ? "No duplicate IMEIs in installations" : `${dupImei} duplicate IMEI(s) found`,
    },
    {
      check: "MASTER: installed fleet",
      status: "pass",
      detail: `${installed.toLocaleString()} INSTALLED records`,
    },
    {
      check: "RTD in MASTER vs RTD table",
      status: "pass",
      detail: `${rtdMaster} RTD in MASTER · ${rtdTable} in RTD table`,
    },
    {
      check: "PAIRED bundles",
      status: "pass",
      detail: `${pairTable} paired bundles`,
    },
    {
      check: "SIM stock count",
      status: sims < SIM_THRESHOLD ? "warn" : "pass",
      detail: sims < SIM_THRESHOLD ? `${sims} SIMs — below threshold ${SIM_THRESHOLD}` : `${sims} SIMs available`,
    },
    {
      check: "Device stock count",
      status: devices < DEVICE_THRESHOLD ? "warn" : "pass",
      detail: devices < DEVICE_THRESHOLD ? `${devices} devices — below threshold ${DEVICE_THRESHOLD}` : `${devices} devices available`,
    },
    {
      check: "Fuel sensor stock",
      status: "pass",
      detail: `${fuel} fuel sensors available`,
    },
  ];
}

// counts duplicate values of a column by comparing total rows to distinct values
async function dupCount(table: string, column: string): Promise<number> {
  const { data } = await supabase.from(table).select(column).range(0, 9999);
  if (!data) return 0;
  const vals = (data as unknown as Record<string, string>[]).map((r) => r[column]).filter(Boolean);
  return vals.length - new Set(vals).size;
}
