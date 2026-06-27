import { useState } from "react";
import { UserPlus, Edit2, Trash2 } from "lucide-react";
import { Modal } from "./Modal";

export function NuevoCliente({ createCustomer, sellers, activeSellerId, activeCustomers, updateCustomer, deleteCustomer, isSubmitting }) {
  const [editingCustomer, setEditingCustomer] = useState(null);

  return (
    <section className="workgrid">
      <form className="panel" onSubmit={createCustomer}>
        <div className="panelHead">
          <h2>Nuevo cliente</h2>
          <UserPlus size={18} />
        </div>
        <select name="seller_id" defaultValue={activeSellerId} required>
          <option value="">Vendedor</option>
          {sellers.map((seller) => (
            <option key={seller.id} value={seller.id}>
              {seller.name}
            </option>
          ))}
        </select>
        <input name="name" placeholder="Nombre" required />
        <input name="address" placeholder="Direccion" required />
        <input name="phone" placeholder="Telefono" />
        <input name="notes" placeholder="Observacion" />
        <button className="primary" type="submit" disabled={isSubmitting}>
          {isSubmitting ? <span className="spinner" /> : <UserPlus size={17} />}
          {isSubmitting ? "Guardando..." : "Crear"}
        </button>
      </form>

      {activeSellerId && (
        <div className="panel" style={{gridColumn: 'span 2'}}>
          <div className="panelHead">
            <h2>Lista de Clientes</h2>
          </div>
          {activeCustomers.length > 0 ? (
            <table className="dataTable">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Direccion</th>
                  <th>Telefono</th>
                  <th>Observacion</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {activeCustomers.map((customer) => (
                  <tr key={customer.id}>
                    <td>{customer.name}</td>
                    <td>{customer.address}</td>
                    <td>{customer.phone || '-'}</td>
                    <td>{customer.notes || '-'}</td>
                    <td>
                      <button type="button" onClick={() => setEditingCustomer(customer)} style={{background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brand)', marginRight: '10px'}} title="Editar" disabled={isSubmitting}>
                        <Edit2 size={16} />
                      </button>
                      <button type="button" onClick={() => deleteCustomer(customer.id)} style={{background: 'none', border: 'none', cursor: 'pointer', color: '#ff4444'}} title="Eliminar" disabled={isSubmitting}>
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No hay clientes para el vendedor seleccionado.</p>
          )}
        </div>
      )}

      {editingCustomer && (
        <Modal title="Editar Cliente" onClose={() => setEditingCustomer(null)}>
          <form className="field" onSubmit={async (e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            await updateCustomer(editingCustomer.id, {
              name: form.get('name'),
              address: form.get('address'),
              phone: form.get('phone'),
              notes: form.get('notes')
            });
            setEditingCustomer(null);
          }}>
            <input name="name" defaultValue={editingCustomer.name} placeholder="Nombre" required />
            <input name="address" defaultValue={editingCustomer.address} placeholder="Direccion" required />
            <input name="phone" defaultValue={editingCustomer.phone} placeholder="Teléfono" />
            <input name="notes" defaultValue={editingCustomer.notes} placeholder="Observacion" />
            <button type="submit" className="primary" style={{marginTop: '10px'}} disabled={isSubmitting}>
              {isSubmitting ? <span className="spinner" /> : null}
              {isSubmitting ? "Guardando..." : "Guardar Cambios"}
            </button>
          </form>
        </Modal>
      )}
    </section>
  );
}
