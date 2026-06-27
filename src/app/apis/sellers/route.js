import { fail, ok, query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sellers = await query(`
      SELECT id, name, phone, status, created_at, updated_at
      FROM cobrokits.sellers
      ORDER BY name
    `);
    return ok({ sellers });
  } catch (error) {
    return fail(error, 500);
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const [seller] = await query(
      `
        INSERT INTO cobrokits.sellers (name, phone, status)
        VALUES ($1, $2, COALESCE($3::cobrokits.seller_status, 'activo'))
        RETURNING id, name, phone, status, created_at
      `,
      [body.name, body.phone || null, body.status || null],
    );
    return ok({ seller }, { status: 201 });
  } catch (error) {
    return fail(error);
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const [seller] = await query(
      `
        UPDATE cobrokits.sellers
        SET name = $2, phone = $3, status = COALESCE($4::cobrokits.seller_status, 'activo')
        WHERE id = $1
        RETURNING id, name, phone, status, updated_at
      `,
      [body.id, body.name, body.phone || null, body.status || null],
    );
    return ok({ seller });
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    await query(`DELETE FROM cobrokits.sellers WHERE id = $1`, [id]);
    return ok({ deleted: true });
  } catch (error) {
    return fail(error);
  }
}
