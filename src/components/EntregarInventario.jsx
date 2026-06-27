import { useState } from "react";
import { PackagePlus, Edit2, Trash2 } from "lucide-react";
import { Modal } from "./Modal";

export function EntregarInventario({ 
  deliverInventory, 
  sellers, 
  activeSellerId, 
  products, 
  currentDeliveryProductId, 
  setCurrentDeliveryProductId, 
  currentDeliveryQuantity, 
  setCurrentDeliveryQuantity, 
  addDeliveryItem, 
  deliveryItems, 
  removeDeliveryItem,
  inventory,
  isSubmitting
}) {
  async function api(path, options) {
    const response = await fetch(path, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
    // If no content (e.g., DELETE returning 204), return empty object
    if (response.status === 204) {
      return {};
    }
    const data = await response.json();
    if (!data.success) throw new Error(data.message || "Error de solicitud");
    return data;
  }

  const [editingInventory, setEditingInventory] = useState(null);
  const [localSubmitting, setLocalSubmitting] = useState(false);

  async function updateInventory(id, data) {
    setLocalSubmitting(true);
    try {
      await api(`/apis/inventory`, {
        method: "PUT",
        body: JSON.stringify({ id, ...data }),
      });
      window.location.reload();
    } catch (e) {
      console.error(e);
    } finally {
      setLocalSubmitting(false);
    }
  }

  async function deleteInventory(id) {
    if (!confirm("¿Eliminar este registro de inventario?")) return;
    setLocalSubmitting(true);
    try {
      await api(`/apis/inventory?id=${id}`, {
        method: "DELETE",
      });
      window.location.reload();
    } catch (e) {
      console.error(e);
    } finally {
      setLocalSubmitting(false);
    }
  }

  const busy = isSubmitting || localSubmitting;

  return (
    <section className="workgrid">
      <form className="panel" onSubmit={deliverInventory}>
        <div className="panelHead">
          <h2>Entregar inventario</h2>
          <PackagePlus size={18} />
        </div>
        <select name="seller_id" defaultValue={activeSellerId} required>
          <option value="">Vendedor</option>
          {sellers.map((seller) => (
            <option key={seller.id} value={seller.id}>
              {seller.name}
            </option>
          ))}
        </select>
        <div className="row">
          <select value={currentDeliveryProductId} onChange={e => setCurrentDeliveryProductId(e.target.value)}>
            <option value="">Producto</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
          <input value={currentDeliveryQuantity} onChange={e => setCurrentDeliveryQuantity(e.target.value)} type="number" min="0" placeholder="Cant." style={{width: "70px"}} />
          <button type="button" className="iconButton" onClick={addDeliveryItem} title="Agregar al inventario" disabled={busy}>
            <PackagePlus size={18} />
          </button>
        </div>
        {deliveryItems.length > 0 && (
          <div style={{display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '10px', fontSize: '0.9rem', padding: '8px', background: 'var(--color-bg-alt, #f5f5f5)', borderRadius: '4px'}}>
            {deliveryItems.map(item => (
              <div key={item.product_id} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <span>{item.quantity}x {item.name}</span>
                <button type="button" onClick={() => removeDeliveryItem(item.product_id)} style={{background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer'}}>✕</button>
              </div>
            ))}
          </div>
        )}
        <button className="primary" type="submit" disabled={busy}>
          {busy ? <span className="spinner" /> : <PackagePlus size={17} />}
          {busy ? "Entregando..." : "Entregar"}
        </button>
      </form>

      {activeSellerId && (
        <div className="panel" style={{gridColumn: 'span 2'}}>
          <div className="panelHead">
            <h2>Inventario actual del vendedor</h2>
          </div>
          {inventory.filter(i => i.seller_id === activeSellerId).length > 0 ? (
            <table className="dataTable">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Cantidad en Stock</th>
                  <th>Última entrega</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {inventory.filter(i => i.seller_id === activeSellerId).map((item) => (
                  <tr key={item.id}>
                    <td>{item.product_name}</td>
                    <td>{item.quantity}</td>
                    <td>{new Date(item.updated_at).toLocaleString()}</td>
                    <td>
                      <button type="button" onClick={() => setEditingInventory(item)} style={{background: 'none', border: 'none', color: 'var(--brand)', cursor: 'pointer', marginRight: '8px'}} title="Editar" disabled={busy}>
                        <Edit2 size={16} />
                      </button>
                      <button type="button" onClick={() => deleteInventory(item.id)} style={{background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer'}} title="Eliminar" disabled={busy}>
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>El vendedor no tiene inventario entregado.</p>
          )}
        </div>
      )}
      {editingInventory && (
        <Modal title="Editar Cantidad" onClose={() => setEditingInventory(null)}>
          <form className="field" onSubmit={async (e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            await updateInventory(editingInventory.id, { quantity: Number(form.get('quantity')) });
            setEditingInventory(null);
          }}>
            <input name="quantity" defaultValue={editingInventory.quantity} placeholder="Cantidad" type="number" min="0" required />
            <button type="submit" className="primary" style={{marginTop: '10px'}} disabled={busy}>
              {busy ? <span className="spinner" /> : null}
              {busy ? "Guardando..." : "Guardar Cambios"}
            </button>
          </form>
        </Modal>
      )}
    </section>
  );
}
