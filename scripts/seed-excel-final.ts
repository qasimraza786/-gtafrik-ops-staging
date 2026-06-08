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

function normalizeDate(date: string | null): string | null {
  if (!date) return null;
  const dateStr = String(date).trim();
  if (!dateStr || dateStr === '' || dateStr === '=TODAY()') return null;

  // Try to parse various date formats
  try {
    // MM/DD/YYYY or DD/MM/YYYY formats
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        const [part1, part2, part3] = parts;
        // Assume DD/MM/YYYY format (common in Europe/Africa)
        if (parseInt(part1) > 12) {
          // part1 is day
          return `${part3}-${part2.padStart(2, '0')}-${part1.padStart(2, '0')}`;
        } else {
          // Could be MM/DD/YYYY or DD/MM/YYYY; try MM/DD first
          const month = parseInt(part1);
          const day = parseInt(part2);
          if (day > 12) {
            // part2 is day
            return `${part3}-${part1.padStart(2, '0')}-${part2.padStart(2, '0')}`;
          } else {
            // Assume MM/DD/YYYY
            return `${part3}-${part1.padStart(2, '0')}-${part2.padStart(2, '0')}`;
          }
        }
      }
    }

    // DD-MM-YYYY format
    if (dateStr.includes('-') && dateStr.length === 10) {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const [part1, part2, part3] = parts;
        if (parseInt(part1) > 12) {
          // DD-MM-YYYY
          return `${part3}-${part2}-${part1}`;
        } else {
          // YYYY-MM-DD (already correct)
          return dateStr;
        }
      }
    }

    return null;
  } catch {
    return null;
  }
}

async function seedTable(
  tableName: string,
  data: any[],
  mapper: (row: any) => any,
  batchSize: number = 500,
  useInsertOnly: boolean = true
) {
  console.log(`Seeding ${data.length} ${tableName}...`);

  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    const mapped = batch.map(mapper);

    const { error } = await supabase.from(tableName).insert(mapped);

    if (error) {
      console.error(
        `  ✗ Error seeding batch ${i}: ${error.message}`
      );
    } else {
      console.log(
        `  ✓ Seeded ${Math.min(batchSize, data.length - i)} rows`
      );
    }
  }
}

async function main() {
  try {
    console.log('Loading seed data from Excel...\n');
    const seedData = await loadSeedData();

    console.log('Starting bulk migration to Supabase...\n');

    // Seed base tables (insert only)
    await seedTable(
      'sims',
      seedData.sims,
      (row: any) => ({
        number: row.number,
        provider: row.provider || 'truephone',
        status: (row.status || 'Available').toUpperCase(),
        branch: row.branch,
        date_added: normalizeDate(row.date_added),
      }),
      500
    );

    await seedTable(
      'devices',
      seedData.devices,
      (row: any) => ({
        imei: row.imei,
        model: row.model,
        status: (row.status || 'Available').toUpperCase(),
        branch: row.branch,
        date_added: normalizeDate(row.date_added),
      }),
      500
    );

    await seedTable(
      'fuel_sensors',
      seedData.fuel_sensors,
      (row: any) => ({
        serial: row.serial,
        mac: row.mac,
        model: row.model || 'TD_BLE',
        status: 'Available',
        branch: row.branch,
        date_added: normalizeDate(row.date_added),
      }),
      500
    );

    // Seed installations (insert only, no upsert)
    await seedTable(
      'installations',
      seedData.installations,
      (row: any) => ({
        sim: row.sim,
        imei: row.imei,
        model: row.model,
        status: row.status || 'UNINSTALLED',
        vehicle: row.vehicle || 'UNKNOWN',
        customer: row.customer || 'UNKNOWN',
        install_date: normalizeDate(row.install_date),
        location: row.location,
        fuel_serial: row.fuel_serial || null,
        fuel_mac: row.fuel_mac || null,
        last_repair: null,
        branch: row.branch,
        notes: row.notes || '',
      }),
      100
    );

    // Seed paired bundles
    await seedTable(
      'paired_bundles',
      seedData.paired_bundles,
      (row: any) => ({
        sim: row.sim,
        imei: row.imei,
        model: row.model,
        branch: row.branch,
        paired_date: normalizeDate(row.paired_date),
      }),
      100
    );

    // Seed RTD bundles
    await seedTable(
      'rtd_bundles',
      seedData.rtd_bundles,
      (row: any) => ({
        sim: row.sim,
        imei: row.imei,
        model: row.model,
        branch: row.branch,
        activated_date: normalizeDate(row.activated_date),
      }),
      100
    );

    // Seed damage events
    await seedTable(
      'damage_events',
      seedData.damage_events,
      (row: any) => ({
        item_type: row.item_type,
        identifier: row.identifier,
        reason: row.reason || '',
        branch: row.branch,
        event_date: normalizeDate(row.event_date),
        reported_by: row.reported_by || '',
      }),
      100
    );

    // Seed movements
    await seedTable(
      'movements',
      seedData.movements,
      (row: any) => ({
        action: row.action,
        item_type: row.item_type || '',
        sim: row.sim || null,
        imei: row.imei || null,
        fuel_serial: row.fuel_serial || null,
        vehicle: row.vehicle || null,
        from_status: row.from_status || '',
        to_status: row.to_status || '',
        branch: row.branch,
        user_id: row.user_id || '',
        notes: '',
      }),
      100
    );

    // Seed customers
    await seedTable(
      'customers',
      seedData.customers,
      (row: any) => ({
        name: row.name,
        vehicles: row.vehicles || 0,
        installed: row.installed || 0,
        with_fuel: row.with_fuel || 0,
        branch: row.branch,
      }),
      500
    );

    console.log('\n✓ Migration complete!');
    console.log(
      `
Total data migrated:
  - ${seedData.sims.length} SIMs
  - ${seedData.devices.length} Devices
  - ${seedData.fuel_sensors.length} Fuel Sensors
  - ${seedData.installations.length} Installations
  - ${seedData.paired_bundles.length} Paired Bundles
  - ${seedData.rtd_bundles.length} RTD Bundles
  - ${seedData.damage_events.length} Damage Events
  - ${seedData.movements.length} Movements
  - ${seedData.customers.length} Customers

All data is now LIVE in Supabase!
    `
    );
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

main();
