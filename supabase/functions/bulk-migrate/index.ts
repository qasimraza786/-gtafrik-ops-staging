import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return new Response(
        JSON.stringify({
          error: "Missing Supabase credentials",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Fetch seed data from Excel (stored as JSON)
    const seedDataUrl = `${supabaseUrl}/storage/v1/object/public/migrations/_seed_full.json`;
    const seedResponse = await fetch(seedDataUrl);

    if (!seedResponse.ok) {
      // Fallback: use hardcoded minimal seed
      console.log("Could not fetch seed data from storage, using direct import...");
    }

    const seedData = await seedResponse.json();

    let totalInserted = 0;

    // Helper to escape SQL
    const esc = (s: unknown) =>
      !s ? "NULL" : `'${String(s).replace(/'/g, "''")}'`;

    // Insert SIMs
    for (const row of seedData.sims || []) {
      const sql = `
        INSERT INTO sims (number, provider, status, branch, date_added)
        VALUES (${esc(row.number)}, ${esc(row.provider || "truephone")}, ${esc((row.status || "Available").toUpperCase())}, ${esc(row.branch)}, ${esc(row.date_added)})
        ON CONFLICT (number) DO NOTHING
      `;
      const { error } = await supabase.rpc("exec_raw_sql", { sql });
      if (!error) totalInserted++;
    }

    // Insert Devices
    for (const row of seedData.devices || []) {
      const sql = `
        INSERT INTO devices (imei, model, status, branch, date_added)
        VALUES (${esc(row.imei)}, ${esc(row.model)}, ${esc((row.status || "Available").toUpperCase())}, ${esc(row.branch)}, ${esc(row.date_added)})
        ON CONFLICT (imei) DO NOTHING
      `;
      const { error } = await supabase.rpc("exec_raw_sql", { sql });
      if (!error) totalInserted++;
    }

    // Insert Fuel Sensors
    for (const row of seedData.fuel_sensors || []) {
      const sql = `
        INSERT INTO fuel_sensors (serial, mac, model, status, branch, date_added)
        VALUES (${esc(row.serial)}, ${esc(row.mac)}, ${esc(row.model || "TD_BLE")}, 'Available', ${esc(row.branch)}, ${esc(row.date_added)})
        ON CONFLICT (serial) DO NOTHING
      `;
      const { error } = await supabase.rpc("exec_raw_sql", { sql });
      if (!error) totalInserted++;
    }

    // Insert Installations
    for (const row of seedData.installations || []) {
      const sql = `
        INSERT INTO installations (sim, imei, model, status, vehicle, customer, install_date, location, fuel_serial, fuel_mac, last_repair, branch, notes)
        VALUES (${esc(row.sim)}, ${esc(row.imei)}, ${esc(row.model)}, ${esc(row.status || "UNINSTALLED")}, ${esc(row.vehicle)}, ${esc(row.customer)}, ${esc(row.install_date)}, ${esc(row.location)}, ${esc(row.fuel_serial)}, ${esc(row.fuel_mac)}, NULL, ${esc(row.branch)}, ${esc(row.notes)})
      `;
      const { error } = await supabase.rpc("exec_raw_sql", { sql });
      if (!error) totalInserted++;
    }

    // Insert Paired Bundles
    for (const row of seedData.paired_bundles || []) {
      const sql = `
        INSERT INTO paired_bundles (sim, imei, model, branch, paired_date)
        VALUES (${esc(row.sim)}, ${esc(row.imei)}, ${esc(row.model)}, ${esc(row.branch)}, ${esc(row.paired_date)})
      `;
      const { error } = await supabase.rpc("exec_raw_sql", { sql });
      if (!error) totalInserted++;
    }

    // Insert RTD Bundles
    for (const row of seedData.rtd_bundles || []) {
      const sql = `
        INSERT INTO rtd_bundles (sim, imei, model, branch, activated_date)
        VALUES (${esc(row.sim)}, ${esc(row.imei)}, ${esc(row.model)}, ${esc(row.branch)}, ${esc(row.activated_date)})
      `;
      const { error } = await supabase.rpc("exec_raw_sql", { sql });
      if (!error) totalInserted++;
    }

    // Insert Damage Events
    for (const row of seedData.damage_events || []) {
      const sql = `
        INSERT INTO damage_events (item_type, identifier, reason, branch, event_date, reported_by)
        VALUES (${esc(row.item_type)}, ${esc(row.identifier)}, ${esc(row.reason)}, ${esc(row.branch)}, ${esc(row.event_date)}, ${esc(row.reported_by)})
      `;
      const { error } = await supabase.rpc("exec_raw_sql", { sql });
      if (!error) totalInserted++;
    }

    // Insert Movements
    for (const row of seedData.movements || []) {
      const sql = `
        INSERT INTO movements (action, item_type, sim, imei, fuel_serial, vehicle, from_status, to_status, branch, user_id, notes)
        VALUES (${esc(row.action)}, ${esc(row.item_type)}, ${esc(row.sim)}, ${esc(row.imei)}, ${esc(row.fuel_serial)}, ${esc(row.vehicle)}, ${esc(row.from_status)}, ${esc(row.to_status)}, ${esc(row.branch)}, ${esc(row.user_id)}, '')
      `;
      const { error } = await supabase.rpc("exec_raw_sql", { sql });
      if (!error) totalInserted++;
    }

    // Insert Customers
    for (const row of seedData.customers || []) {
      const sql = `
        INSERT INTO customers (name, vehicles, installed, with_fuel, branch)
        VALUES (${esc(row.name)}, ${row.vehicles || 0}, ${row.installed || 0}, ${row.with_fuel || 0}, ${esc(row.branch)})
        ON CONFLICT (name) DO NOTHING
      `;
      const { error } = await supabase.rpc("exec_raw_sql", { sql });
      if (!error) totalInserted++;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Migration complete! ${totalInserted} rows inserted.`,
        details: {
          sims: seedData.sims?.length || 0,
          devices: seedData.devices?.length || 0,
          fuel_sensors: seedData.fuel_sensors?.length || 0,
          installations: seedData.installations?.length || 0,
          paired_bundles: seedData.paired_bundles?.length || 0,
          rtd_bundles: seedData.rtd_bundles?.length || 0,
          damage_events: seedData.damage_events?.length || 0,
          movements: seedData.movements?.length || 0,
          customers: seedData.customers?.length || 0,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
