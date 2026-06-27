import { readFile } from "node:fs/promises";
import { Client } from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required");
}

const schemaSql = await readFile(new URL("../database/cobrokits_postgres.sql", import.meta.url), "utf8");

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  await client.query(schemaSql);
  const result = await client.query(`
    SELECT
      (SELECT COUNT(*)::int FROM information_schema.tables WHERE table_schema = 'cobrokits') AS tables_count,
      (SELECT COUNT(*)::int FROM information_schema.routines WHERE specific_schema = 'cobrokits') AS functions_count
  `);

  console.log(JSON.stringify({
    ok: true,
    schema: "cobrokits",
    ...result.rows[0],
  }, null, 2));
} finally {
  await client.end();
}
