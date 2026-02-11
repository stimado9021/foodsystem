<?php
require_once 'config.php';

try {
    $conn = getConnection();
    echo "✅ Conexión exitosa<br>";
    
    // Verificar tablas
    $result = $conn->query("SHOW TABLES");
    echo "<br>Tablas en la base de datos:<br>";
    while($row = $result->fetch_array()) {
        echo "- " . $row[0] . "<br>";
    }
    
    // Verificar productos
    $result = $conn->query("SELECT COUNT(*) as total FROM productos");
    $row = $result->fetch_assoc();
    echo "<br>Total de productos: " . $row['total'];
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage();
}
?>