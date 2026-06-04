<?php

$pdo = new PDO('mysql:host=127.0.0.1;dbname=edalaw', 'root', '');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

echo "Making branch_id nullable and adding FK...\n";

try {
    // First make column nullable
    $pdo->exec("ALTER TABLE annexes MODIFY COLUMN branch_id BIGINT UNSIGNED NULL");
    echo "✓ Made branch_id nullable\n";
    
    // Now add FK
    $pdo->exec("ALTER TABLE annexes ADD CONSTRAINT fk_annexes_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL");
    echo "✓ Added FK successfully!\n";
    
} catch (PDOException $e) {
    echo "✗ Error: " . $e->getMessage() . "\n";
}

// Verify final structure
echo "\nFinal annexes structure:\n";
$stmt = $pdo->query("SHOW COLUMNS FROM annexes");
while ($row = $stmt->fetch(PDO::FETCH_OBJ)) {
    echo "  {$row->Field} - {$row->Type} - Null: {$row->Null} - Key: {$row->Key}\n";
}
