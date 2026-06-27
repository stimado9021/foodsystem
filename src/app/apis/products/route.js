import { fail, ok, query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const products = await query(`
      SELECT id, name, investment_cost, sale_price, is_active, created_at, updated_at
      FROM cobrokits.products
      WHERE is_active = true
      ORDER BY name
    `);
    return ok({ products });
  } catch (error) {
    return fail(error, 500);
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const [product] = await query(
      `
        INSERT INTO cobrokits.products (name, investment_cost, sale_price)
        VALUES ($1, $2, $3)
        RETURNING id, name, investment_cost, sale_price, is_active, created_at
      `,
      [body.name, Number(body.investment_cost || 0), Number(body.sale_price || 0)],
    );
    return ok({ product }, { status: 201 });
  } catch (error) {
    return fail(error);
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const [product] = await query(
      `
        UPDATE cobrokits.products
        SET name = $2, investment_cost = $3, sale_price = $4
        WHERE id = $1
        RETURNING id, name, investment_cost, sale_price, is_active, updated_at
      `,
      [body.id, body.name, Number(body.investment_cost || 0), Number(body.sale_price || 0)],
    );
    return ok({ product });
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    // Soft delete: mark inactive instead of physical delete to avoid FK constraint errors
    await query(
      `UPDATE cobrokits.products SET is_active = false WHERE id = $1`,
      [id]
    );
    return ok({ deleted: true });
  } catch (error) {
    return fail(error);
  }
}
