<?php
require_once 'config.php';

header('Content-Type: text/html; charset=utf-8');

echo "<h2>Verificación de Productos - LuisCount</h2>";

try {
    $conn = getConnection();
    echo "<p style='color: green;'>✅ Conexión exitosa</p>";
    
    // Verificar si existe la tabla productos
    $result = $conn->query("SHOW TABLES LIKE 'productos'");
    if ($result->num_rows > 0) {
        echo "<p style='color: green;'>✅ Tabla 'productos' existe</p>";
    } else {
        echo "<p style='color: red;'>❌ Tabla 'productos' NO existe</p>";
        echo "<p>Necesitas ejecutar el script SQL para crear las tablas</p>";
        exit;
    }
    
    // Contar productos
    $result = $conn->query("SELECT COUNT(*) as total FROM productos");
    $row = $result->fetch_assoc();
    echo "<p><strong>Total de productos:</strong> " . $row['total'] . "</p>";
    
    // Listar productos
    if ($row['total'] > 0) {
        echo "<h3>Productos en la base de datos:</h3>";
        $result = $conn->query("SELECT * FROM productos ORDER BY nombre");
        echo "<table border='1' cellpadding='10' style='border-collapse: collapse;'>";
        echo "<tr><th>ID</th><th>Nombre</th><th>Precio</th><th>Activo</th></tr>";
        while ($prod = $result->fetch_assoc()) {
            echo "<tr>";
            echo "<td>" . $prod['id'] . "</td>";
            echo "<td>" . $prod['nombre'] . "</td>";
            echo "<td>$" . number_format($prod['precio'], 2) . "</td>";
            echo "<td>" . ($prod['activo'] ? 'Sí' : 'No') . "</td>";
            echo "</tr>";
        }
        echo "</table>";
    } else {
        echo "<p style='color: orange;'>⚠️ No hay productos registrados</p>";
        echo "<p>Ve a la pestaña 'Productos' y crea algunos productos</p>";
    }
    
    // Probar el API
    echo "<hr><h3>Prueba del API:</h3>";
    echo "<p>Simulando llamada: api.php?action=listar_productos</p>";
    
    $result = $conn->query("SELECT * FROM productos WHERE activo = 1 ORDER BY nombre ASC");
    $productos = [];
    while ($row = $result->fetch_assoc()) {
        $productos[] = $row;
    }
    
    $response = ['success' => true, 'productos' => $productos];
    echo "<pre>" . json_encode($response, JSON_PRETTY_PRINT) . "</pre>";
    
} catch (Exception $e) {
    echo "<p style='color: red;'>❌ Error: " . $e->getMessage() . "</p>";
}
?>