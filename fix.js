const { Client } = require('pg');

async function run() {
  const client = new Client({
    connectionString: 'postgresql://neondb_owner:npg_Th3P0LZKVxWq@ep-purple-shape-a8139mac-pooler.eastus2.azure.neon.tech/neondb?sslmode=require',
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    // Get all rafael orozco ordered by created_at (keep the first one, delete the rest)
    const res = await client.query("SELECT id FROM cobrokits.sellers WHERE name = 'rafael orozco' ORDER BY created_at ASC OFFSET 1");
    const ids = res.rows.map(r => r.id);
    
    if (ids.length > 0) {
      console.log('Deleting duplicate IDs:', ids);
      const delRes = await client.query("DELETE FROM cobrokits.sellers WHERE id = ANY($1)", [ids]);
      console.log('Deleted duplicates count:', delRes.rowCount);
    } else {
      console.log('No duplicates found.');
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

run();
