<?php
    
    error_reporting(E_ALL);
	ini_set('display_errors', 1);

// api.php - Manejo de todas las peticiones AJAX
require_once 'config.php';

$action = $_POST['action'] ?? $_GET['action'] ?? '';

switch($action) {
    case 'buscar_cliente':
        buscarCliente();
        break;
    case 'crear_cliente':
        crearCliente();
        break;
    case 'listar_clientes':
        listarClientes();
        break;
    case 'listar_productos':
        listarProductos();
        break;
    case 'crear_venta':
        crearVenta();
        break;
    case 'registrar_pago':
        registrarPago();
        break;
    case 'obtener_historial':
        obtenerHistorial();
        break;
    case 'obtener_cliente':
        obtenerCliente();
        break;
    case 'crear_producto':
        crearProducto();
        break;
    default:
        sendJSON(['error' => 'Acción no válida']);
}

function buscarCliente() {
    $conn = getConnection();
    $cedula = $_POST['cedula'] ?? '';
    
    $stmt = $conn->prepare("SELECT * FROM clientes WHERE cedula = ?");
    $stmt->bind_param('s', $cedula);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($row = $result->fetch_assoc()) {
        sendJSON(['success' => true, 'cliente' => $row]);
    } else {
        sendJSON(['success' => false, 'message' => 'Cliente no encontrado']);
    }
}

function crearCliente() {
    $conn = getConnection();
    $cedula = $_POST['cedula'] ?? '';
    $nombres = $_POST['nombres'] ?? '';
    $direccion = $_POST['direccion'] ?? '';
    
    $stmt = $conn->prepare("INSERT INTO clientes (cedula, nombres, direccion) VALUES (?, ?, ?)");
    $stmt->bind_param('sss', $cedula, $nombres, $direccion);
    
    if ($stmt->execute()) {
        $id = $conn->insert_id;
        sendJSON(['success' => true, 'id' => $id, 'message' => 'Cliente creado exitosamente']);
    } else {
        sendJSON(['success' => false, 'message' => 'Error al crear cliente: ' . $conn->error]);
    }
}

function listarClientes() {
    $conn = getConnection();
    $result = $conn->query("SELECT * FROM clientes ORDER BY nombres ASC");
    
    $clientes = [];
    while ($row = $result->fetch_assoc()) {
        $clientes[] = $row;
    }
    
    sendJSON(['success' => true, 'clientes' => $clientes]);
}

function listarProductos() {
    $conn = getConnection();
    $result = $conn->query("SELECT * FROM productos WHERE activo = 1 ORDER BY nombre ASC");
    
    $productos = [];
    while ($row = $result->fetch_assoc()) {
        $productos[] = $row;
    }
    
    sendJSON(['success' => true, 'productos' => $productos]);
}

function crearVenta() {
    $conn = getConnection();
    $cliente_id = $_POST['cliente_id'] ?? 0;
    $productos = json_decode($_POST['productos'] ?? '[]', true);
    
    $conn->begin_transaction();
    
    try {
        // Obtener saldo actual del cliente
        $stmt = $conn->prepare("SELECT saldo_actual FROM clientes WHERE id = ?");
        $stmt->bind_param('i', $cliente_id);
        $stmt->execute();
        $result = $stmt->get_result();
        $cliente = $result->fetch_assoc();
        $saldo_anterior = $cliente['saldo_actual'];
        
        // Calcular total de la venta
        $total = 0;
        foreach ($productos as $prod) {
            $total += $prod['subtotal'];
        }
        
        $saldo_nuevo = $saldo_anterior + $total;
        
        // Insertar venta
        $stmt = $conn->prepare("INSERT INTO ventas (cliente_id, total, saldo_anterior, saldo_nuevo) VALUES (?, ?, ?, ?)");
        $stmt->bind_param('iddd', $cliente_id, $total, $saldo_anterior, $saldo_nuevo);
        $stmt->execute();
        $venta_id = $conn->insert_id;
        
        // Insertar detalle de venta
        $stmt = $conn->prepare("INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio_unitario, subtotal) VALUES (?, ?, ?, ?, ?)");
        foreach ($productos as $prod) {
            $stmt->bind_param('iiidd', $venta_id, $prod['id'], $prod['cantidad'], $prod['precio'], $prod['subtotal']);
            $stmt->execute();
        }
        
        // Actualizar saldo del cliente
        $stmt = $conn->prepare("UPDATE clientes SET saldo_actual = ? WHERE id = ?");
        $stmt->bind_param('di', $saldo_nuevo, $cliente_id);
        $stmt->execute();
        
        $conn->commit();
        sendJSON(['success' => true, 'message' => 'Venta registrada exitosamente', 'saldo_nuevo' => $saldo_nuevo]);
        
    } catch (Exception $e) {
        $conn->rollback();
        sendJSON(['success' => false, 'message' => 'Error al registrar venta: ' . $e->getMessage()]);
    }
}

function registrarPago() {
    $conn = getConnection();
    $cliente_id = $_POST['cliente_id'] ?? 0;
    $monto = $_POST['monto'] ?? 0;
    
    $conn->begin_transaction();
    
    try {
        // Obtener saldo actual
        $stmt = $conn->prepare("SELECT saldo_actual FROM clientes WHERE id = ?");
        $stmt->bind_param('i', $cliente_id);
        $stmt->execute();
        $result = $stmt->get_result();
        $cliente = $result->fetch_assoc();
        $saldo_anterior = $cliente['saldo_actual'];
        
        $saldo_nuevo = $saldo_anterior - $monto;
        
        // Insertar pago
        $stmt = $conn->prepare("INSERT INTO pagos (cliente_id, monto, saldo_anterior, saldo_nuevo) VALUES (?, ?, ?, ?)");
        $stmt->bind_param('iddd', $cliente_id, $monto, $saldo_anterior, $saldo_nuevo);
        $stmt->execute();
        
        // Actualizar saldo del cliente
        $stmt = $conn->prepare("UPDATE clientes SET saldo_actual = ? WHERE id = ?");
        $stmt->bind_param('di', $saldo_nuevo, $cliente_id);
        $stmt->execute();
        
        $conn->commit();
        sendJSON(['success' => true, 'message' => 'Pago registrado exitosamente', 'saldo_nuevo' => $saldo_nuevo]);
        
    } catch (Exception $e) {
        $conn->rollback();
        sendJSON(['success' => false, 'message' => 'Error al registrar pago: ' . $e->getMessage()]);
    }
}

function obtenerHistorial() {
    $conn = getConnection();
    $cliente_id = $_GET['cliente_id'] ?? 0;
    
    // Obtener ventas
    $ventas_query = "SELECT v.*, GROUP_CONCAT(CONCAT(p.nombre, ' (', dv.cantidad, ')') SEPARATOR ', ') as productos
                     FROM ventas v
                     LEFT JOIN detalle_ventas dv ON v.id = dv.venta_id
                     LEFT JOIN productos p ON dv.producto_id = p.id
                     WHERE v.cliente_id = ?
                     GROUP BY v.id
                     ORDER BY v.fecha DESC";
    
    $stmt = $conn->prepare($ventas_query);
    $stmt->bind_param('i', $cliente_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $ventas = [];
    while ($row = $result->fetch_assoc()) {
        $ventas[] = $row;
    }
    
    // Obtener pagos
    $pagos_query = "SELECT * FROM pagos WHERE cliente_id = ? ORDER BY fecha DESC";
    $stmt = $conn->prepare($pagos_query);
    $stmt->bind_param('i', $cliente_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $pagos = [];
    while ($row = $result->fetch_assoc()) {
        $pagos[] = $row;
    }
    
    sendJSON(['success' => true, 'ventas' => $ventas, 'pagos' => $pagos]);
}

function obtenerCliente() {
    $conn = getConnection();
    $id = $_GET['id'] ?? 0;
    
    $stmt = $conn->prepare("SELECT * FROM clientes WHERE id = ?");
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($row = $result->fetch_assoc()) {
        sendJSON(['success' => true, 'cliente' => $row]);
    } else {
        sendJSON(['success' => false, 'message' => 'Cliente no encontrado']);
    }
}

function crearProducto() {
    $conn = getConnection();
    $nombre = $_POST['nombre'] ?? '';
    $precio = $_POST['precio'] ?? 0;
    
    if (empty($nombre) || $precio <= 0) {
        sendJSON(['success' => false, 'message' => 'Datos inválidos']);
        return;
    }
    
    $stmt = $conn->prepare("INSERT INTO productos (nombre, precio) VALUES (?, ?)");
    $stmt->bind_param('sd', $nombre, $precio);
    
    if ($stmt->execute()) {
        $id = $conn->insert_id;
        sendJSON(['success' => true, 'id' => $id, 'message' => 'Producto creado exitosamente']);
    } else {
        sendJSON(['success' => false, 'message' => 'Error al crear producto: ' . $conn->error]);
    }
}
?>