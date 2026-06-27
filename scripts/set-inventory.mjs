import { Client } from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required");
}

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  await client.connect();
  console.log("Connected to Neon DB.");

  try {
    // Para asegurarnos de usar el esquema correcto
    await client.query("SET search_path TO cobrokits, public;");

    // Obtener todos los vendedores y productos
    const sellersRes = await client.query("SELECT id, name FROM sellers");
    const productsRes = await client.query("SELECT id, name FROM products");

    for (const seller of sellersRes.rows) {
      for (const product of productsRes.rows) {
        // Entregar 15 unidades de cada producto a cada vendedor
        await client.query(
          `
          INSERT INTO seller_inventory (seller_id, product_id, quantity)
          VALUES ($1, $2, $3)
          ON CONFLICT (seller_id, product_id) 
          DO UPDATE SET quantity = 15;
          `,
          [seller.id, product.id, 15]
        );
        console.log(`- Set 15 ${product.name} para ${seller.name}`);
      }
    }

    console.log("¡Inventario actualizado a 15 artículos exitosamente!");
  } catch (err) {
    console.error("Error al actualizar inventario:", err);
  } finally {
    await client.end();
  }
}

main();
