import { query } from './src/lib/db.js';

async function run() {
  await query('ALTER TABLE cobrokits.customers ADD COLUMN IF NOT EXISTS notes TEXT;');
  console.log('Column added');
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
