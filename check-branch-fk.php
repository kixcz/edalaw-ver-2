<?php

$pdo = new PDO('mysql:host=127.0.0.1;dbname=edalaw', 'root', '');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

echo "Checking branches table structure:\n";
$stmt = $pdo->query("SHOW COLUMNS FROM branches");
while ($row = $stmt->fetch(PDO::FETCH_OBJ)) {
    echo "  {$row->Field} - {$row->Type} - Key: {$row->Key}\n";
}

echo "\nAttempting to add FK manually...\n";
try {
    $pdo->exec("ALTER TABLE annexes ADD CONSTRAINT fk_annexes_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL");
    echo "✓ Success!\n";
} catch (PDOException $e) {
    echo "✗ Error: " . $e->getMessage() . "\n";
    
    // Check data types mismatch
    echo "\nChecking for data type mismatch...\n";
    $stmt = $pdo->query("
        SELECT 
            TABLE_NAME, COLUMN_NAME, DATA_TYPE, COLUMN_TYPE, IS_NULLABLE
        FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME IN ('annexes', 'branches')
        AND COLUMN_NAME IN ('branch_id', 'id')
        ORDER BY TABLE_NAME, COLUMN_NAME
    ");
    while ($row = $stmt->fetch(PDO::FETCH_OBJ)) {
        echo "  {$row->TABLE_NAME}.{$row->COLUMN_NAME}: {$row->COLUMN_TYPE} (nullable: {$row->IS_NULLABLE})\n";
    }
}
