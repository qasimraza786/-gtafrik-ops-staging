import { supabase, Installation, Movement, Sim, Device, FuelSensor, Customer, PairedBundle, RTDBundle, DamageEvent } from './supabase';

const PAGE_SIZE = 1000;

/**
 * Supabase / PostgREST caps every response at `db-max-rows` (1000 by default),
 * so `.limit(10000)` is silently clamped. Page through with `.range()` to pull
 * every row. `buildQuery` is called fresh per page because a query builder is
 * single-use.
 */
async function fetchAll<T>(
  buildQuery: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  // Force the auth session to hydrate from storage before issuing queries.
  // Under branch-isolation RLS an anonymous request returns zero rows, so a
  // hard page reload must wait for the JWT to be attached to the client.
  await supabase.auth.getSession();

  const all: T[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await buildQuery(from, from + PAGE_SIZE - 1);
    if (error || !data) break;
    all.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return all;
}

export async function fetchInstallations(branch?: string): Promise<Installation[]> {
  return fetchAll<Installation>((from, to) => {
    let q = supabase.from('installations').select('*').range(from, to);
    if (branch && branch !== 'All') q = q.eq('branch', branch);
    return q;
  });
}

export async function fetchMovements(branch?: string): Promise<Movement[]> {
  return fetchAll<Movement>((from, to) => {
    let q = supabase.from('movements').select('*').order('logged_at', { ascending: false }).range(from, to);
    if (branch && branch !== 'All') q = q.eq('branch', branch);
    return q;
  });
}

export async function fetchSims(branch?: string): Promise<Sim[]> {
  return fetchAll<Sim>((from, to) => {
    let q = supabase.from('sims').select('*').range(from, to);
    if (branch && branch !== 'All') q = q.eq('branch', branch);
    return q;
  });
}

export async function fetchDevices(branch?: string): Promise<Device[]> {
  return fetchAll<Device>((from, to) => {
    let q = supabase.from('devices').select('*').range(from, to);
    if (branch && branch !== 'All') q = q.eq('branch', branch);
    return q;
  });
}

export async function fetchFuelSensors(branch?: string): Promise<FuelSensor[]> {
  return fetchAll<FuelSensor>((from, to) => {
    let q = supabase.from('fuel_sensors').select('*').range(from, to);
    if (branch && branch !== 'All') q = q.eq('branch', branch);
    return q;
  });
}

export async function fetchCustomers(branch?: string): Promise<Customer[]> {
  return fetchAll<Customer>((from, to) => {
    let q = supabase.from('customers').select('*').range(from, to);
    if (branch && branch !== 'All') q = q.eq('branch', branch);
    return q;
  });
}

export async function fetchPairedBundles(branch?: string): Promise<PairedBundle[]> {
  return fetchAll<PairedBundle>((from, to) => {
    let q = supabase.from('paired_bundles').select('*').range(from, to);
    if (branch && branch !== 'All') q = q.eq('branch', branch);
    return q;
  });
}

export async function fetchRTDBundles(branch?: string): Promise<RTDBundle[]> {
  return fetchAll<RTDBundle>((from, to) => {
    let q = supabase.from('rtd_bundles').select('*').range(from, to);
    if (branch && branch !== 'All') q = q.eq('branch', branch);
    return q;
  });
}

export async function fetchDamageEvents(branch?: string): Promise<DamageEvent[]> {
  return fetchAll<DamageEvent>((from, to) => {
    let q = supabase.from('damage_events').select('*').order('event_date', { ascending: false }).range(from, to);
    if (branch && branch !== 'All') q = q.eq('branch', branch);
    return q;
  });
}

export const actionColors: Record<string, string> = {
  DEPLOY: "#31c86e",
  PAIR: "#3966ff",
  ACTIVATE: "#06b6d4",
  UNINSTALL: "#f97316",
  REPAIR: "#a855f7",
  MARK_DAMAGED: "#ef4444",
  MARK_LOST: "#dc2626",
  TRANSFER: "#eab308",
  FUEL_DEPLOY: "#06b6d4",
  CORRECTION: "#8b93a8",
};
