<?php

$pdo = new PDO('mysql:host=127.0.0.1;dbname=edalaw', 'root', '');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

echo "=== REBUILDING TABLES (WITHOUT INITIAL FK) ===\n\n";

try {
    echo "Step 1: Recreate ANNEXES table...\n";
    
    // Drop if exists
    $pdo->exec("DROP TABLE IF EXISTS annexes");
    
    // Create new table WITHOUT foreign keys initially
    $pdo->exec("
        CREATE TABLE annexes (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            branch_id BIGINT UNSIGNED NOT NULL,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            status ENUM('active','inactive') DEFAULT 'active',
            created_at TIMESTAMP NULL,
            updated_at TIMESTAMP NULL,
            INDEX idx_branch_id (branch_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
    echo "  ✓ Created annexes table\n";
    
} catch (PDOException $e) {
    echo "  ✗ Error: " . $e->getMessage() . "\n";
}

try {
    echo "\nStep 2: Recreate DORMITORIES table...\n";
    
    $pdo->exec("DROP TABLE IF EXISTS dormitories");
    
    $pdo->exec("
        CREATE TABLE dormitories (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            annex_id BIGINT UNSIGNED NULL,
            name VARCHAR(255) NOT NULL,
            type VARCHAR(255) NOT NULL,
            description TEXT,
            status ENUM('active','inactive') DEFAULT 'active',
            created_at TIMESTAMP NULL,
            updated_at TIMESTAMP NULL,
            INDEX idx_annex_id (annex_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
    echo "  ✓ Created dormitories table\n";
    
} catch (PDOException $e) {
    echo "  ✗ Error: " . $e->getMessage() . "\n";
}

try {
    echo "\nStep 3: Recreate CELLS table...\n";
    
    $pdo->exec("DROP TABLE IF EXISTS cells");
    
    $pdo->exec("
        CREATE TABLE cells (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            dormitory_id BIGINT UNSIGNED NULL,
            cell_number VARCHAR(255) UNIQUE,
            capacity INT DEFAULT 4,
            status ENUM('active','inactive') DEFAULT 'active',
            created_at TIMESTAMP NULL,
            updated_at TIMESTAMP NULL,
            INDEX idx_dormitory_id (dormitory_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
    echo "  ✓ Created cells table\n";
    
} catch (PDOException $e) {
    echo "  ✗ Error: " . $e->getMessage() . "\n";
}

echo "\nStep 4: Adding foreign keys...\n";

try {
    $pdo->exec("ALTER TABLE annexes ADD CONSTRAINT fk_annexes_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL");
    echo "  ✓ Added FK: annexes -> branches\n";
} catch (PDOException $e) {
    echo "  ✗ Error adding annexes FK: " . $e->getMessage() . "\n";
}

try {
    $pdo->exec("ALTER TABLE dormitories ADD CONSTRAINT fk_dormitories_annex FOREIGN KEY (annex_id) REFERENCES annexes(id) ON DELETE SET NULL");
    echo "  ✓ Added FK: dormitories -> annexes\n";
} catch (PDOException $e) {
    echo "  ✗ Error adding dormitories FK: " . $e->getMessage() . "\n";
}

try {
    $pdo->exec("ALTER TABLE cells ADD CONSTRAINT fk_cells_dormitory FOREIGN KEY (dormitory_id) REFERENCES dormitories(id) ON DELETE SET NULL");
    echo "  ✓ Added FK: cells -> dormitories\n";
} catch (PDOException $e) {
    echo "  ✗ Error adding cells FK: " . $e->getMessage() . "\n";
}

echo "\n✅ Tables rebuilt successfully!\n";
echo "   Hierarchy: Branch → Annex → Dormitory → Cell → PDL\n";

// Verify structure
echo "\nVerifying final structure:\n";
$stmt = $pdo->query("SHOW COLUMNS FROM annexes");
$fields = [];
while ($row = $stmt->fetch(PDO::FETCH_OBJ)) {
    $fields[] = $row->Field;
}
echo "ANNEXES: " . implode(', ', $fields) . "\n";

$stmt = $pdo->query("SHOW COLUMNS FROM dormitories");
$fields = [];
while ($row = $stmt->fetch(PDO::FETCH_OBJ)) {
    $fields[] = $row->Field;
}
echo "DORMITORIES: " . implode(', ', $fields) . "\n";

$stmt = $pdo->query("SHOW COLUMNS FROM cells");
$fields = [];
while ($row = $stmt->fetch(PDO::FETCH_OBJ)) {
    $fields[] = $row->Field;
}
echo "CELLS: " . implode(', ', $fields) . "\n";
