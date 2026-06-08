import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Installation = {
  id: number;
  sim: string;
  imei: string;
  model: string;
  status: string;
  vehicle: string;
  customer: string;
  install_date: string;
  location: string;
  fuel_serial: string | null;
  fuel_mac: string | null;
  last_repair: string | null;
  branch: string;
  notes: string;
};

export type Movement = {
  id: number;
  logged_at: string;
  action: string;
  item_type: string;
  sim: string | null;
  imei: string | null;
  fuel_serial: string | null;
  vehicle: string | null;
  from_status: string;
  to_status: string;
  user_id: string;
  branch: string;
  notes: string;
};

export type Sim = {
  id: number;
  number: string;
  provider: string;
  status: string;
  branch: string;
  date_added: string;
};

export type Device = {
  id: number;
  imei: string;
  model: string;
  status: string;
  branch: string;
  date_added: string;
};

export type FuelSensor = {
  id: number;
  serial: string;
  mac: string;
  model: string;
  status: string;
  branch: string;
  date_added: string;
};

export type Customer = {
  id: number;
  name: string;
  vehicles: number;
  installed: number;
  with_fuel: number;
  branch: string;
};

export type PairedBundle = {
  id: number;
  sim: string;
  imei: string;
  model: string;
  branch: string;
  paired_date: string;
};

export type RTDBundle = {
  id: number;
  sim: string;
  imei: string;
  model: string;
  branch: string;
  activated_date: string;
};

export type DamageEvent = {
  id: number;
  item_type: string;
  identifier: string;
  reason: string;
  branch: string;
  event_date: string;
  reported_by: string;
};
