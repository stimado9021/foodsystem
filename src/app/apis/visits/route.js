import { fail, ok, query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get("customerId");
    const sellerId = searchParams.get("sellerId");
    const visits = await query(
      `
        SELECT
          cv.*,
          c.name AS customer_name,
          s.name AS seller_name
        FROM cobrokits.customer_visits cv
        JOIN cobrokits.customers c ON c.id = cv.customer_id
        JOIN cobrokits.sellers s ON s.id = cv.seller_id
        WHERE ($1::uuid IS NULL OR cv.customer_id = $1::uuid)
          AND ($2::uuid IS NULL OR cv.seller_id = $2::uuid)
        ORDER BY cv.visit_date DESC
        LIMIT 100
      `,
      [customerId, sellerId],
    );
    return ok({ visits });
  } catch (error) {
    return fail(error, 500);
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const [visit] = await query(
      `
        SELECT *
        FROM cobrokits.register_customer_visit(
          $1::uuid,
          $2::uuid,
          $3::jsonb,
          $4::numeric,
          $5::cobrokits.payment_method,
          $6::text
        )
      `,
      [
        body.customer_id,
        body.seller_id,
        JSON.stringify(body.items || []),
        Number(body.payment_amount || 0),
        body.payment_method || null,
        body.notes || null,
      ],
    );
    return ok({ visit }, { status: 201 });
  } catch (error) {
    return fail(error);
  }
}
