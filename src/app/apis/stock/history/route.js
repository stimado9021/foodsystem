import { fail, ok, query } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /apis/stock/history?productId=xxx  — history of additions
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");

    const entries = await query(
      `
        SELECT
          e.id,
          e.product_id,
          p.name  AS product_name,
          e.quantity,
          e.notes,
          e.created_at
        FROM cobrokits.warehouse_stock_entries e
        JOIN cobrokits.products p ON p.id = e.product_id
        ${productId ? "WHERE e.product_id = $1::uuid" : ""}
        ORDER BY e.created_at DESC
        LIMIT 200
      `,
      productId ? [productId] : [],
    );

    return ok({ entries });
  } catch (error) {
    return fail(error, 500);
  }
}
