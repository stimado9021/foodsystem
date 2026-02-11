<?php
require_once 'config.php';

header('Content-Type: application/json');

$cedula = '10101010'; // La cédula de prueba

$conn = getConnection();
$stmt = $conn->prepare("SELECT * FROM clientes WHERE cedula = ?");
$stmt->bind_param('s', $cedula);
$stmt->execute();
$result = $stmt->get_result();

if ($row = $result->fetch_assoc()) {
    echo json_encode([
        'success' => true, 
        'cliente' => $row,
        'mensaje' => 'Cliente encontrado correctamente'
    ], JSON_PRETTY_PRINT);
} else {
    echo json_encode([
        'success' => false, 
        'message' => 'Cliente no encontrado',
        'cedula_buscada' => $cedula
    ], JSON_PRETTY_PRINT);
}
?>