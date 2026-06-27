import { fail, ok, query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");

    const where = productId
      ? `AND im.product_id = $1::uuid`
      : ``;
    const params = productId ? [productId] : [];

    const movements = await query(
      `
        SELECT
          im.id,
          im.seller_id,
          s.name  AS seller_name,
          im.product_id,
          p.name  AS product_name,
          im.movement_type,
          im.quantity,
          im.unit_investment_cost,
          im.unit_sale_price,
          im.notes,
          im.created_at
        FROM cobrokits.inventory_movements im
        JOIN cobrokits.sellers  s ON s.id = im.seller_id
        JOIN cobrokits.products p ON p.id = im.product_id
        WHERE im.movement_type = 'entrega_a_vendedor'
          ${where}
        ORDER BY im.created_at DESC
        LIMIT 200
      `,
      params,
    );

    return ok({ movements });
  } catch (error) {
    return fail(error, 500);
  }
}
