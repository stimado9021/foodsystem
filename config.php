<?php
define('DB_HOST', 'localhost'); // Verifica este valor
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_NAME', 'luiscount'); // Agrega la 't'

function getConnection() {
    try {
        $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
        
        if ($conn->connect_error) {
            error_log("Error de conexión: " . $conn->connect_error);
            die(json_encode([
                'success' => false, 
                'error' => 'Error de conexión a la base de datos',
                'details' => $conn->connect_error
            ]));
        }
        
        $conn->set_charset('utf8mb4');
        return $conn;
        
    } catch (Exception $e) {
        die(json_encode([
            'success' => false,
            'error' => 'Excepción en conexión',
            'details' => $e->getMessage()
        ]));
    }
}

function sendJSON($data) {
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}
?>