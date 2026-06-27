const { Pool } = require('pg');
const pool = new Pool({
  connectionString: "postgresql://neondb_owner:npg_Th3P0LZKVxWq@ep-purple-shape-a8139mac-pooler.eastus2.azure.neon.tech/neondb?sslmode=require",
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    await pool.query(`ALTER FUNCTION cobrokits.register_customer_visit(uuid, uuid, jsonb, numeric, cobrokits.payment_method, text) SET search_path TO cobrokits, public;`);
    console.log("Functions altered.");
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
run();
