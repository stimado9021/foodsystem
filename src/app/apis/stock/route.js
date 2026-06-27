import { fail, ok, query } from "@/lib/db";

export const dynamic = "force-dynamic";

// Ensure tables exist on first use
async function ensureTables() {
  await query(`
    CREATE TABLE IF NOT EXISTS cobrokits.warehouse_stock (
      product_id UUID PRIMARY KEY REFERENCES cobrokits.products(id),
      quantity   INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS cobrokits.warehouse_stock_entries (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      product_id UUID NOT NULL REFERENCES cobrokits.products(id),
      quantity   INTEGER NOT NULL CHECK (quantity > 0),
      notes      TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

// GET /apis/stock  — returns all products with their warehouse stock
export async function GET() {
  try {
    await ensureTables();
    const rows = await query(`
      SELECT
        p.id,
        p.name,
        p.investment_cost,
        p.sale_price,
        COALESCE(ws.quantity, 0) AS quantity,
        ws.updated_at
      FROM cobrokits.products p
      LEFT JOIN cobrokits.warehouse_stock ws ON ws.product_id = p.id
      WHERE p.is_active = true
      ORDER BY p.name
    `);
    return ok({ stock: rows });
  } catch (error) {
    return fail(error, 500);
  }
}

// POST /apis/stock  — add quantity to a product
export async function POST(request) {
  try {
    await ensureTables();
    const body = await request.json();
    const { product_id, quantity, notes } = body;

    if (!product_id || !quantity || Number(quantity) <= 0) {
      return fail(new Error("product_id y quantity son requeridos"), 400);
    }

    const qty = Number(quantity);

    // Upsert warehouse_stock
    await query(
      `
        INSERT INTO cobrokits.warehouse_stock (product_id, quantity, updated_at)
        VALUES ($1, $2, now())
        ON CONFLICT (product_id)
        DO UPDATE SET
          quantity   = cobrokits.warehouse_stock.quantity + EXCLUDED.quantity,
          updated_at = now()
      `,
      [product_id, qty],
    );

    // Record in history
    await query(
      `INSERT INTO cobrokits.warehouse_stock_entries (product_id, quantity, notes)
       VALUES ($1, $2, $3)`,
      [product_id, qty, notes || null],
    );

    // Return updated row
    const [updated] = await query(
      `SELECT p.name, ws.quantity, ws.updated_at
       FROM cobrokits.warehouse_stock ws
       JOIN cobrokits.products p ON p.id = ws.product_id
       WHERE ws.product_id = $1`,
      [product_id],
    );

    return ok({ entry: updated }, { status: 201 });
  } catch (error) {
    return fail(error);
  }
}
