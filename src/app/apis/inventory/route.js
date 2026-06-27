import { fail, ok, query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const sellerId = searchParams.get("sellerId");
    const inventory = await query(
      `
        SELECT
          si.id,
          si.seller_id,
          s.name AS seller_name,
          si.product_id,
          p.name AS product_name,
          p.investment_cost,
          p.sale_price,
          si.quantity,
          si.updated_at
        FROM cobrokits.seller_inventory si
        JOIN cobrokits.sellers s ON s.id = si.seller_id
        JOIN cobrokits.products p ON p.id = si.product_id
        WHERE ($1::uuid IS NULL OR si.seller_id = $1::uuid)
        ORDER BY s.name, p.name
      `,
      [sellerId],
    );
    return ok({ inventory });
  } catch (error) {
    return fail(error, 500);
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const items = body.items || [{ product_id: body.product_id, quantity: body.quantity }];
    
    const results = [];
    for (const item of items) {
      if (!item.product_id || !item.quantity) continue;
      const [inventory] = await query(
        `
          SELECT *
          FROM cobrokits.deliver_inventory($1::uuid, $2::uuid, $3::integer, $4::text)
        `,
        [body.seller_id, item.product_id, Number(item.quantity), body.notes || null],
      );
      results.push(inventory);
    }
    return ok({ inventory: results }, { status: 201 });
  } catch (error) {
    return fail(error);
  }
}
