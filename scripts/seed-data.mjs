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
    // 1. Create a seller (needed for customers)
    const sellerRes = await client.query(`
      INSERT INTO cobrokits.sellers (name, phone)
      VALUES ('Vendedor Principal', '3001234567')
      RETURNING id, name;
    `);
    const sellerId = sellerRes.rows[0].id;
    console.log(`Creado Vendedor: ${sellerRes.rows[0].name}`);

    // 2. Create products (Salchichas, Yogur, Mantequilla)
    const productsRes = await client.query(`
      INSERT INTO cobrokits.products (name, investment_cost, sale_price)
      VALUES 
        ('Salchichas', 1000, 1500),
        ('Yogur', 1500, 2000),
        ('Mantequilla', 800, 1200)
      RETURNING id, name;
    `);
    console.log("Creados Productos no perecederos:");
    productsRes.rows.forEach(p => console.log(`- ${p.name}`));

    // 3. Create customers
    const customersRes = await client.query(`
      INSERT INTO cobrokits.customers (seller_id, name, address, phone)
      VALUES 
        ($1, 'Cliente de Prueba 1', 'Av. Principal 123', '3011111111'),
        ($1, 'Cliente de Prueba 2', 'Calle Secundaria 456', '3022222222')
      RETURNING id, name;
    `, [sellerId]);
    console.log("Creados Clientes:");
    customersRes.rows.forEach(c => console.log(`- ${c.name}`));

    console.log("¡Registros de prueba insertados exitosamente!");
  } catch (err) {
    console.error("Error al insertar los datos:", err);
  } finally {
    await client.end();
  }
}

main();
