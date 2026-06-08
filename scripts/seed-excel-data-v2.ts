import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ctzvvpyubuggicdjlhzr.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN0enZ2cHl1YnVnZ2ljZGpsaHpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3NzkxOTcsImV4cCI6MjA5NjM1NTE5N30.cVHDtRgg5MT4nvif6iWgU6Xww-adU-IyVDdVShIBHmw';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface SeedData {
  installations: any[];
  sims: any[];
  devices: any[];
  fuel_sensors: any[];
  paired_bundles: any[];
  rtd_bundles: any[];
  damage_events: any[];
  movements: any[];
  customers: any[];
}

const SEED_FILE = path.join(__dirname, '..', '..', '_seed_full.json');

async function loadSeedData(): Promise<SeedData> {
  const data = fs.readFileSync(SEED_FILE, 'utf-8');
  return JSON.parse(data);
}

function getBranchId(branch: string): number {
  switch (branch) {
    case 'Kinshasa':
      return 1;
    case 'LSHI':
      return 2;
    case 'Brazza':
      return 3;
    default:
      return 1; // default to Kinshasa
  }
}

async function seedSIMs(data: any[]) {
  console.log(`Seeding ${data.length} SIMs...`);
  const batchSize = 500;

  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    const { error } = await supabase
      .from('sims')
      .upsert(
        batch.map(row => ({
          number: row.number,
          provider: row.provider || 'truephone',
          status: (row.status || 'Available').toUpperCase(),
          branch_id: getBranchId(row.branch),
          date_added: row.date_added,
        })),
        { onConflict: 'number' }
      );

    if (error) {
      console.error(`Error seeding SIMs batch ${i}:`, error);
    } else {
      console.log(
        `  ✓ Seeded ${Math.min(batchSize, data.length - i)} SIMs`
      );
    }
  }
}

async function seedDevices(data: any[]) {
  console.log(`Seeding ${data.length} devices...`);
  const batchSize = 500;

  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    const { error } = await supabase
      .from('devices')
      .upsert(
        batch.map(row => ({
          imei: row.imei,
          model: row.model,
          status: (row.status || 'Available').toUpperCase(),
          branch_id: getBranchId(row.branch),
          date_added: row.date_added,
        })),
        { onConflict: 'imei' }
      );

    if (error) {
      console.error(`Error seeding devices batch ${i}:`, error);
    } else {
      console.log(
        `  ✓ Seeded ${Math.min(batchSize, data.length - i)} devices`
      );
    }
  }
}

async function seedFuelSensors(data: any[]) {
  console.log(`Seeding ${data.length} fuel sensors...`);
  const batchSize = 500;

  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    const { error } = await supabase
      .from('fuel_sensors')
      .upsert(
        batch.map(row => ({
          serial: row.serial,
          mac: row.mac,
          model: row.model || 'TD_BLE',
          status: 'Available',
          branch_id: getBranchId(row.branch),
          date_added: row.date_added,
        })),
        { onConflict: 'serial' }
      );

    if (error) {
      console.error(`Error seeding fuel sensors batch ${i}:`, error);
    } else {
      console.log(
        `  ✓ Seeded ${Math.min(batchSize, data.length - i)} fuel sensors`
      );
    }
  }
}

async function seedInstallations(data: any[]) {
  console.log(`Seeding ${data.length} installations...`);

  // Need to fetch SIM/Device/FuelSensor IDs by their unique values
  const { data: allSims } = await supabase.from('sims').select('id, number');
  const { data: allDevices } = await supabase.from('devices').select('id, imei');
  const { data: allFuelSensors } = await supabase.from('fuel_sensors').select('id, serial');

  const simMap = new Map(allSims?.map((s: any) => [s.number, s.id]) || []);
  const deviceMap = new Map(allDevices?.map((d: any) => [d.imei, d.id]) || []);
  const fuelMap = new Map(allFuelSensors?.map((f: any) => [f.serial, f.id]) || []);

  const batchSize = 100;

  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    const toInsert = batch
      .map(row => ({
        sim_id: row.sim ? simMap.get(row.sim) : null,
        device_id: row.imei ? deviceMap.get(row.imei) : null,
        fuel_sensor_id: row.fuel_serial ? fuelMap.get(row.fuel_serial) : null,
        vehicle_number: row.vehicle || 'UNKNOWN',
        customer: row.customer || 'UNKNOWN',
        install_date: row.install_date || new Date().toISOString().split('T')[0],
        branch_id: getBranchId(row.branch),
        location: row.location,
        status: row.status === 'INSTALLED' ? 'INSTALLED' : 'UNINSTALLED',
        notes: row.notes,
      }))
      .filter(r => r.sim_id || r.device_id); // only insert if we have either SIM or Device

    if (toInsert.length === 0) {
      console.log(`  ⊘ Batch ${i}: no valid SIM/Device references found`);
      continue;
    }

    const { error } = await supabase
      .from('installations')
      .insert(toInsert);

    if (error) {
      console.error(`Error seeding installations batch ${i}:`, error);
    } else {
      console.log(`  ✓ Seeded ${toInsert.length} installations`);
    }
  }
}

async function main() {
  try {
    console.log('Loading seed data from Excel...\n');
    const seedData = await loadSeedData();

    console.log('Starting bulk migration to Supabase...\n');

    // Seed base tables first (in order of dependency)
    await seedSIMs(seedData.sims);
    await seedDevices(seedData.devices);
    await seedFuelSensors(seedData.fuel_sensors);

    // Then seed related data
    await seedInstallations(seedData.installations);

    console.log('\n✓ Migration complete!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

main();
