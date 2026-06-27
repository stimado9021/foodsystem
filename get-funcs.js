const { Pool } = require('pg');
const pool = new Pool({
  connectionString: "postgresql://neondb_owner:npg_Th3P0LZKVxWq@ep-purple-shape-a8139mac-pooler.eastus2.azure.neon.tech/neondb?sslmode=require",
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    const res = await pool.query(`SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'cobrokits'`);
    console.log(res.rows);
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
run();
