export function Modal({ title, children, onClose }) {
  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999
    }}>
      <div className="panel" style={{ width: '400px', maxWidth: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="panelHead" style={{ borderBottom: '1px solid var(--line)', paddingBottom: '12px', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '18px', margin: 0 }}>{title}</h2>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: 'var(--muted)' }}>&times;</button>
        </div>
        <div>
          {children}
        </div>
      </div>
    </div>
  );
}
