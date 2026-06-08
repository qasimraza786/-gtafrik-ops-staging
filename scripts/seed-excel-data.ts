import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ctzvvpyubuggicdjlhzr.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN0enZ2cHl1YnVnZ2ljZGpsaHpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3NzkxOTcsImV4cCI6MjA5NjM1NTE5N30.cVHDtRgg5MT4nvif6iWgU6Xww-adU-IyVDdVShIBHmw';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface Installation {
  sim: string;
  imei: string;
  model: string;
  status: string;
  vehicle: string;
  customer: string;
  install_date: string | null;
  location: string;
  fuel_serial: string;
  fuel_mac: string;
  last_repair_date: string | null;
  branch: string;
  notes: string;
}

interface SIM {
  number: string;
  provider: string;
  status: string;
  branch: string;
  date_added: string | null;
}

interface Device {
  imei: string;
  model: string;
  status: string;
  branch: string;
  date_added: string | null;
}

interface FuelSensor {
  serial: string;
  mac: string;
  model: string;
  branch: string;
  date_added: string | null;
}

interface PairedBundle {
  sim: string;
  imei: string;
  model: string;
  branch: string;
  paired_date: string | null;
}

interface RTDBundle {
  sim: string;
  imei: string;
  model: string;
  branch: string;
  activated_date: string | null;
}

interface DamageEvent {
  item_type: string;
  identifier: string;
  reason: string;
  branch: string;
  event_date: string | null;
  reported_by: string;
}

interface Movement {
  action: string;
  item_type: string;
  sim: string;
  imei: string;
  fuel_serial: string;
  vehicle: string;
  from_status: string;
  to_status: string;
  branch: string;
  logged_at: unknown;
  user_id: string;
}

interface Customer {
  name: string;
  branch: string;
  vehicles: number;
  installed: number;
  with_fuel: number;
}

interface SeedData {
  installations: Installation[];
  sims: SIM[];
  devices: Device[];
  fuel_sensors: FuelSensor[];
  paired_bundles: PairedBundle[];
  rtd_bundles: RTDBundle[];
  damage_events: DamageEvent[];
  movements: Movement[];
  customers: Customer[];
}

const SEED_FILE = path.join(__dirname, '..', '..', '_seed_full.json');

async function loadSeedData(): Promise<SeedData> {
  const data = fs.readFileSync(SEED_FILE, 'utf-8');
  return JSON.parse(data);
}

async function seedInstallations(data: Installation[]) {
  console.log(`Seeding ${data.length} installations...`);
  const batchSize = 500;

  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    const { error } = await supabase
      .from('installations')
      .upsert(batch.map(row => ({
        sim: row.sim,
        imei: row.imei,
        model: row.model,
        status: row.status,
        vehicle: row.vehicle,
        customer: row.customer,
        install_date: row.install_date,
        location: row.location,
        fuel_serial: row.fuel_serial || null,
        fuel_mac: row.fuel_mac || null,
        last_repair_date: row.last_repair_date,
        branch: row.branch,
        notes: row.notes,
      })), { onConflict: 'sim' });

    if (error) {
      console.error(`Error seeding installations batch ${i}:`, error);
    } else {
      console.log(`  ✓ Seeded ${Math.min(batchSize, data.length - i)} installations`);
    }
  }
}

async function seedSIMs(data: SIM[]) {
  console.log(`Seeding ${data.length} SIMs...`);
  const batchSize = 500;

  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    const { error } = await supabase
      .from('sims')
      .upsert(batch.map(row => ({
        number: row.number,
        provider: row.provider,
        status: row.status,
        branch: row.branch,
        date_added: row.date_added,
      })), { onConflict: 'number' });

    if (error) {
      console.error(`Error seeding SIMs batch ${i}:`, error);
    } else {
      console.log(`  ✓ Seeded ${Math.min(batchSize, data.length - i)} SIMs`);
    }
  }
}

async function seedDevices(data: Device[]) {
  console.log(`Seeding ${data.length} devices...`);
  const batchSize = 500;

  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    const { error } = await supabase
      .from('devices')
      .upsert(batch.map(row => ({
        imei: row.imei,
        model: row.model,
        status: row.status,
        branch: row.branch,
        date_added: row.date_added,
      })), { onConflict: 'imei' });

    if (error) {
      console.error(`Error seeding devices batch ${i}:`, error);
    } else {
      console.log(`  ✓ Seeded ${Math.min(batchSize, data.length - i)} devices`);
    }
  }
}

async function seedFuelSensors(data: FuelSensor[]) {
  console.log(`Seeding ${data.length} fuel sensors...`);
  const batchSize = 500;

  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    const { error } = await supabase
      .from('fuel_sensors')
      .upsert(batch.map(row => ({
        serial: row.serial,
        mac: row.mac,
        model: row.model,
        branch: row.branch,
        date_added: row.date_added,
      })), { onConflict: 'serial' });

    if (error) {
      console.error(`Error seeding fuel sensors batch ${i}:`, error);
    } else {
      console.log(`  ✓ Seeded ${Math.min(batchSize, data.length - i)} fuel sensors`);
    }
  }
}

async function seedPairedBundles(data: PairedBundle[]) {
  console.log(`Seeding ${data.length} paired bundles...`);
  const { error } = await supabase
    .from('paired_bundles')
    .insert(data.map(row => ({
      sim: row.sim,
      imei: row.imei,
      model: row.model,
      branch: row.branch,
      paired_date: row.paired_date,
    })));

  if (error) {
    console.error('Error seeding paired bundles:', error);
  } else {
    console.log(`  ✓ Seeded ${data.length} paired bundles`);
  }
}

async function seedRTDBundles(data: RTDBundle[]) {
  console.log(`Seeding ${data.length} RTD bundles...`);
  const { error } = await supabase
    .from('rtd_bundles')
    .insert(data.map(row => ({
      sim: row.sim,
      imei: row.imei,
      model: row.model,
      branch: row.branch,
      activated_date: row.activated_date,
    })));

  if (error) {
    console.error('Error seeding RTD bundles:', error);
  } else {
    console.log(`  ✓ Seeded ${data.length} RTD bundles`);
  }
}

async function seedDamageEvents(data: DamageEvent[]) {
  console.log(`Seeding ${data.length} damage events...`);
  const { error } = await supabase
    .from('damage_events')
    .insert(data.map(row => ({
      item_type: row.item_type,
      identifier: row.identifier,
      reason: row.reason,
      branch: row.branch,
      event_date: row.event_date,
      reported_by: row.reported_by,
    })));

  if (error) {
    console.error('Error seeding damage events:', error);
  } else {
    console.log(`  ✓ Seeded ${data.length} damage events`);
  }
}

async function seedMovements(data: Movement[]) {
  console.log(`Seeding ${data.length} movements...`);
  const { error } = await supabase
    .from('movements')
    .insert(data.map(row => ({
      action: row.action,
      item_type: row.item_type,
      sim: row.sim || null,
      imei: row.imei || null,
      fuel_serial: row.fuel_serial || null,
      vehicle: row.vehicle || null,
      from_status: row.from_status,
      to_status: row.to_status,
      branch: row.branch,
      logged_at: new Date().toISOString(),
      user_id: row.user_id,
    })));

  if (error) {
    console.error('Error seeding movements:', error);
  } else {
    console.log(`  ✓ Seeded ${data.length} movements`);
  }
}

async function seedCustomers(data: Customer[]) {
  console.log(`Seeding ${data.length} customers...`);
  const batchSize = 500;

  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    const { error } = await supabase
      .from('customers')
      .upsert(batch.map(row => ({
        name: row.name,
        branch: row.branch,
        vehicles: row.vehicles,
        installed: row.installed,
        with_fuel: row.with_fuel,
      })), { onConflict: 'name' });

    if (error) {
      console.error(`Error seeding customers batch ${i}:`, error);
    } else {
      console.log(`  ✓ Seeded ${Math.min(batchSize, data.length - i)} customers`);
    }
  }
}

async function main() {
  try {
    console.log('Loading seed data from Excel...\n');
    const seedData = await loadSeedData();

    console.log('Starting bulk migration to Supabase...\n');

    await seedInstallations(seedData.installations);
    await seedSIMs(seedData.sims);
    await seedDevices(seedData.devices);
    await seedFuelSensors(seedData.fuel_sensors);
    await seedPairedBundles(seedData.paired_bundles);
    await seedRTDBundles(seedData.rtd_bundles);
    await seedDamageEvents(seedData.damage_events);
    await seedMovements(seedData.movements);
    await seedCustomers(seedData.customers);

    console.log('\n✓ Migration complete!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

main();
