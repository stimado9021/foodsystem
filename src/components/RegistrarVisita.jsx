import { Save, PackagePlus } from "lucide-react";

export function RegistrarVisita({ 
  registerVisit, 
  sellers, 
  activeSellerId, 
  activeCustomers, 
  formatMoney, 
  products, 
  currentProductId, 
  setCurrentProductId, 
  currentQuantity, 
  setCurrentQuantity, 
  addVisitItem, 
  visitItems, 
  removeVisitItem,
  isSubmitting
}) {
  return (
    <section className="workgrid">
      <form className="panel" onSubmit={registerVisit}>
        <div className="panelHead">
          <h2>Registrar visita</h2>
          <Save size={18} />
        </div>
        <select name="seller_id" defaultValue={activeSellerId} required>
          <option value="">Vendedor</option>
          {sellers.map((seller) => (
            <option key={seller.id} value={seller.id}>
              {seller.name}
            </option>
          ))}
        </select>
        <select name="customer_id" required>
          <option value="">Cliente</option>
          {activeCustomers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.name} - {formatMoney(customer.current_balance)}
            </option>
          ))}
        </select>
        <div className="row">
          <select value={currentProductId} onChange={e => setCurrentProductId(e.target.value)}>
            <option value="">Producto dejado</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
          <input value={currentQuantity} onChange={e => setCurrentQuantity(e.target.value)} type="number" min="0" placeholder="Cant." style={{width: "70px"}} />
          <button type="button" className="iconButton" onClick={addVisitItem} title="Agregar a la visita" disabled={isSubmitting}>
            <PackagePlus size={18} />
          </button>
        </div>
        {visitItems.length > 0 && (
          <div style={{display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '10px', fontSize: '0.9rem', padding: '8px', background: 'var(--color-bg-alt, #f5f5f5)', borderRadius: '4px'}}>
            {visitItems.map(item => (
              <div key={item.product_id} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <span>{item.quantity}x {item.name}</span>
                <button type="button" onClick={() => removeVisitItem(item.product_id)} style={{background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer'}}>✕</button>
              </div>
            ))}
          </div>
        )}
        <div className="row">
          <input name="payment_amount" type="number" min="0" placeholder="Abono" />
          <select name="payment_method">
            <option value="">Metodo</option>
            <option value="efectivo">Efectivo</option>
            <option value="nequi">Nequi</option>
          </select>
        </div>
        <input name="notes" placeholder="Nota" />
        <button className="primary" type="submit" disabled={isSubmitting}>
          {isSubmitting ? <span className="spinner" /> : <Save size={17} />}
          {isSubmitting ? "Registrando..." : "Registrar"}
        </button>
      </form>
    </section>
  );
}
