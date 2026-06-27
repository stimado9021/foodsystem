CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS cobrokits;
SET search_path TO cobrokits, public;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'seller_status') THEN
    CREATE TYPE seller_status AS ENUM ('activo', 'inactivo', 'suspendido');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method') THEN
    CREATE TYPE payment_method AS ENUM ('efectivo', 'nequi');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inventory_movement_type') THEN
    CREATE TYPE inventory_movement_type AS ENUM (
      'entrega_a_vendedor',
      'venta_credito_cliente',
      'devolucion_vendedor',
      'ajuste_entrada',
      'ajuste_salida'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS sellers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(120) NOT NULL,
  phone VARCHAR(30),
  status seller_status NOT NULL DEFAULT 'activo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(120) NOT NULL,
  investment_cost NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (investment_cost >= 0),
  sale_price NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (sale_price >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES sellers(id),
  name VARCHAR(120) NOT NULL,
  address TEXT NOT NULL,
  phone VARCHAR(30),
  is_active BOOLEAN NOT NULL DEFAULT true,
  current_balance NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (current_balance >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS seller_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES sellers(id),
  product_id UUID NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_seller_inventory UNIQUE (seller_id, product_id)
);

CREATE TABLE IF NOT EXISTS inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES sellers(id),
  product_id UUID NOT NULL REFERENCES products(id),
  customer_id UUID REFERENCES customers(id),
  movement_type inventory_movement_type NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_investment_cost NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (unit_investment_cost >= 0),
  unit_sale_price NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (unit_sale_price >= 0),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS customer_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  seller_id UUID NOT NULL REFERENCES sellers(id),
  visit_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  previous_balance NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (previous_balance >= 0),
  new_products_total NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (new_products_total >= 0),
  payment_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (payment_amount >= 0),
  payment_method payment_method,
  new_balance NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (new_balance >= 0),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_payment_method_required CHECK (
    payment_amount = 0 OR payment_method IS NOT NULL
  )
);

CREATE TABLE IF NOT EXISTS customer_visit_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID NOT NULL REFERENCES customer_visits(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_investment_cost NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (unit_investment_cost >= 0),
  unit_sale_price NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (unit_sale_price >= 0),
  line_investment_total NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (line_investment_total >= 0),
  line_sale_total NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (line_sale_total >= 0)
);

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID REFERENCES customer_visits(id) ON DELETE SET NULL,
  customer_id UUID NOT NULL REFERENCES customers(id),
  seller_id UUID NOT NULL REFERENCES sellers(id),
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  method payment_method NOT NULL,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_customers_seller_id ON customers(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_inventory_seller_id ON seller_inventory(seller_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_seller_date ON inventory_movements(seller_id, created_at);
CREATE INDEX IF NOT EXISTS idx_customer_visits_customer_date ON customer_visits(customer_id, visit_date DESC);
CREATE INDEX IF NOT EXISTS idx_customer_visits_seller_date ON customer_visits(seller_id, visit_date DESC);
CREATE INDEX IF NOT EXISTS idx_customer_visit_items_visit_id ON customer_visit_items(visit_id);
CREATE INDEX IF NOT EXISTS idx_payments_seller_date ON payments(seller_id, paid_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_customer_date ON payments(customer_id, paid_at DESC);

CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sellers_updated_at ON sellers;
CREATE TRIGGER trg_sellers_updated_at
BEFORE UPDATE ON sellers
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_products_updated_at ON products;
CREATE TRIGGER trg_products_updated_at
BEFORE UPDATE ON products
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_customers_updated_at ON customers;
CREATE TRIGGER trg_customers_updated_at
BEFORE UPDATE ON customers
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_seller_inventory_updated_at ON seller_inventory;
CREATE TRIGGER trg_seller_inventory_updated_at
BEFORE UPDATE ON seller_inventory
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE OR REPLACE VIEW v_customer_current_balances AS
SELECT
  c.id AS customer_id,
  c.name AS customer_name,
  c.phone,
  c.address,
  c.seller_id,
  s.name AS seller_name,
  c.current_balance,
  c.is_active
FROM customers c
JOIN sellers s ON s.id = c.seller_id;

CREATE OR REPLACE VIEW v_daily_seller_performance AS
SELECT
  s.id AS seller_id,
  s.name AS seller_name,
  CURRENT_DATE AS report_date,
  COALESCE(p.total_collected, 0) AS total_collected,
  COALESCE(p.total_cash, 0) AS total_cash,
  COALESCE(p.total_nequi, 0) AS total_nequi,
  COALESCE(v.total_investment_cost, 0) AS total_investment_cost,
  COALESCE(v.total_sale_value, 0) AS total_sale_value,
  COALESCE(v.total_sale_value, 0) - COALESCE(v.total_investment_cost, 0) AS projected_gross_profit
FROM sellers s
LEFT JOIN (
  SELECT
    seller_id,
    SUM(amount) AS total_collected,
    SUM(amount) FILTER (WHERE method = 'efectivo') AS total_cash,
    SUM(amount) FILTER (WHERE method = 'nequi') AS total_nequi
  FROM payments
  WHERE paid_at::date = CURRENT_DATE
  GROUP BY seller_id
) p ON p.seller_id = s.id
LEFT JOIN (
  SELECT
    cv.seller_id,
    SUM(cvi.line_investment_total) AS total_investment_cost,
    SUM(cvi.line_sale_total) AS total_sale_value
  FROM customer_visits cv
  JOIN customer_visit_items cvi ON cvi.visit_id = cv.id
  WHERE cv.visit_date::date = CURRENT_DATE
  GROUP BY cv.seller_id
) v ON v.seller_id = s.id
WHERE s.status = 'activo';

CREATE OR REPLACE VIEW v_dashboard_totals AS
SELECT
  COALESCE((SELECT SUM(current_balance) FROM customers WHERE is_active = true), 0) AS total_portfolio,
  COALESCE((SELECT SUM(amount) FROM payments WHERE paid_at::date = CURRENT_DATE), 0) AS collected_today,
  COALESCE((SELECT SUM(amount) FROM payments WHERE paid_at::date = CURRENT_DATE AND method = 'efectivo'), 0) AS cash_today,
  COALESCE((SELECT SUM(amount) FROM payments WHERE paid_at::date = CURRENT_DATE AND method = 'nequi'), 0) AS nequi_today,
  COALESCE((SELECT SUM(line_sale_total) FROM customer_visit_items cvi JOIN customer_visits cv ON cv.id = cvi.visit_id WHERE cv.visit_date::date = CURRENT_DATE), 0) AS production_today,
  COALESCE((SELECT SUM(line_investment_total) FROM customer_visit_items cvi JOIN customer_visits cv ON cv.id = cvi.visit_id WHERE cv.visit_date::date = CURRENT_DATE), 0) AS investment_today;

CREATE OR REPLACE FUNCTION deliver_inventory(
  p_seller_id UUID,
  p_product_id UUID,
  p_quantity INTEGER,
  p_notes TEXT DEFAULT NULL
)
RETURNS TABLE (
  ret_seller_id UUID,
  ret_product_id UUID,
  ret_quantity INTEGER
) AS $$
DECLARE
  v_product products%ROWTYPE;
BEGIN
  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'La cantidad debe ser mayor a cero';
  END IF;

  SELECT * INTO v_product FROM products WHERE id = p_product_id AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Producto no existe o esta inactivo';
  END IF;

  INSERT INTO seller_inventory (seller_id, product_id, quantity)
  VALUES (p_seller_id, p_product_id, p_quantity)
  ON CONFLICT (seller_id, product_id)
  DO UPDATE SET quantity = seller_inventory.quantity + EXCLUDED.quantity;

  INSERT INTO inventory_movements (
    seller_id,
    product_id,
    movement_type,
    quantity,
    unit_investment_cost,
    unit_sale_price,
    notes
  )
  VALUES (
    p_seller_id,
    p_product_id,
    'entrega_a_vendedor',
    p_quantity,
    v_product.investment_cost,
    v_product.sale_price,
    p_notes
  );

  RETURN QUERY
  SELECT si.seller_id, si.product_id, si.quantity
  FROM seller_inventory si
  WHERE si.seller_id = p_seller_id AND si.product_id = p_product_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION register_customer_visit(
  p_customer_id UUID,
  p_seller_id UUID,
  p_items JSONB DEFAULT '[]'::jsonb,
  p_payment_amount NUMERIC DEFAULT 0,
  p_payment_method payment_method DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS TABLE (
  ret_visit_id UUID,
  ret_previous_balance NUMERIC,
  ret_new_products_total NUMERIC,
  ret_payment_amount NUMERIC,
  ret_new_balance NUMERIC
) AS $$
DECLARE
  v_customer customers%ROWTYPE;
  v_visit_id UUID;
  v_previous_balance NUMERIC(14,2);
  v_new_products_total NUMERIC(14,2) := 0;
  v_new_balance NUMERIC(14,2);
  v_item JSONB;
  v_product products%ROWTYPE;
  v_quantity INTEGER;
  v_available_quantity INTEGER;
BEGIN
  IF p_payment_amount < 0 THEN
    RAISE EXCEPTION 'El abono no puede ser negativo';
  END IF;

  IF p_payment_amount > 0 AND p_payment_method IS NULL THEN
    RAISE EXCEPTION 'Debe indicar metodo de pago cuando hay abono';
  END IF;

  SELECT * INTO v_customer
  FROM customers
  WHERE id = p_customer_id AND seller_id = p_seller_id AND is_active = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cliente no existe, esta inactivo o no pertenece al vendedor';
  END IF;

  v_previous_balance := v_customer.current_balance;

  FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(p_items, '[]'::jsonb))
  LOOP
    v_quantity := (v_item->>'quantity')::INTEGER;

    IF v_quantity <= 0 THEN
      RAISE EXCEPTION 'Cada producto debe tener cantidad mayor a cero';
    END IF;

    SELECT * INTO v_product
    FROM products
    WHERE id = (v_item->>'product_id')::UUID AND is_active = true;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Producto no existe o esta inactivo';
    END IF;

    SELECT quantity INTO v_available_quantity
    FROM seller_inventory
    WHERE seller_inventory.seller_id = p_seller_id
      AND seller_inventory.product_id = v_product.id
    FOR UPDATE;

    IF COALESCE(v_available_quantity, 0) < v_quantity THEN
      RAISE EXCEPTION 'Inventario insuficiente para el producto %', v_product.name;
    END IF;

    v_new_products_total := v_new_products_total + (v_quantity * v_product.sale_price);
  END LOOP;

  IF p_payment_amount > (v_previous_balance + v_new_products_total) THEN
    RAISE EXCEPTION 'El abono no puede superar el saldo disponible';
  END IF;

  v_new_balance := v_previous_balance + v_new_products_total - p_payment_amount;

  INSERT INTO customer_visits (
    customer_id,
    seller_id,
    previous_balance,
    new_products_total,
    payment_amount,
    payment_method,
    new_balance,
    notes
  )
  VALUES (
    p_customer_id,
    p_seller_id,
    v_previous_balance,
    v_new_products_total,
    p_payment_amount,
    p_payment_method,
    v_new_balance,
    p_notes
  )
  RETURNING id INTO v_visit_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(p_items, '[]'::jsonb))
  LOOP
    v_quantity := (v_item->>'quantity')::INTEGER;

    SELECT * INTO v_product
    FROM products
    WHERE id = (v_item->>'product_id')::UUID;

    INSERT INTO customer_visit_items (
      visit_id,
      product_id,
      quantity,
      unit_investment_cost,
      unit_sale_price,
      line_investment_total,
      line_sale_total
    )
    VALUES (
      v_visit_id,
      v_product.id,
      v_quantity,
      v_product.investment_cost,
      v_product.sale_price,
      v_quantity * v_product.investment_cost,
      v_quantity * v_product.sale_price
    );

    UPDATE seller_inventory
    SET quantity = quantity - v_quantity
    WHERE seller_inventory.seller_id = p_seller_id
      AND seller_inventory.product_id = v_product.id;

    INSERT INTO inventory_movements (
      seller_id,
      product_id,
      customer_id,
      movement_type,
      quantity,
      unit_investment_cost,
      unit_sale_price,
      notes
    )
    VALUES (
      p_seller_id,
      v_product.id,
      p_customer_id,
      'venta_credito_cliente',
      v_quantity,
      v_product.investment_cost,
      v_product.sale_price,
      p_notes
    );
  END LOOP;

  IF p_payment_amount > 0 THEN
    INSERT INTO payments (
      visit_id,
      customer_id,
      seller_id,
      amount,
      method,
      notes
    )
    VALUES (
      v_visit_id,
      p_customer_id,
      p_seller_id,
      p_payment_amount,
      p_payment_method,
      p_notes
    );
  END IF;

  UPDATE customers
  SET current_balance = v_new_balance
  WHERE id = p_customer_id;

  RETURN QUERY
  SELECT
    v_visit_id,
    v_previous_balance,
    v_new_products_total,
    p_payment_amount,
    v_new_balance;
END;
$$ LANGUAGE plpgsql;
