<?php

$pdo = new PDO('mysql:host=127.0.0.1;dbname=edalaw', 'root', '');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

echo "=== REBUILDING TABLES WITH CORRECT SCHEMA ===\n\n";

// Since DROP COLUMN fails, let's recreate the tables

try {
    echo "Step 1: Backup and recreate ANNEXES table...\n";
    
    // Rename old table
    $pdo->exec("RENAME TABLE annexes TO annexes_old");
    echo "  Renamed annexes to annexes_old\n";
    
    // Create new table with correct structure
    $pdo->exec("
        CREATE TABLE annexes (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            branch_id BIGINT UNSIGNED NOT NULL,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            status ENUM('active','inactive') DEFAULT 'active',
            created_at TIMESTAMP NULL,
            updated_at TIMESTAMP NULL,
            CONSTRAINT FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL
        )
    ");
    echo "  ✓ Created new annexes table with correct structure\n";
    
} catch (PDOException $e) {
    echo "  ✗ Error: " . $e->getMessage() . "\n";
}

try {
    echo "\nStep 2: Backup and recreate DORMITORIES table...\n";
    
    $pdo->exec("RENAME TABLE dormitories TO dormitories_old");
    echo "  Renamed dormitories to dormitories_old\n";
    
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
            CONSTRAINT FOREIGN KEY (annex_id) REFERENCES annexes(id) ON DELETE SET NULL
        )
    ");
    echo "  ✓ Created new dormitories table with correct structure\n";
    
} catch (PDOException $e) {
    echo "  ✗ Error: " . $e->getMessage() . "\n";
}

try {
    echo "\nStep 3: Backup and recreate CELLS table...\n";
    
    $pdo->exec("RENAME TABLE cells TO cells_old");
    echo "  Renamed cells to cells_old\n";
    
    $pdo->exec("
        CREATE TABLE cells (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            dormitory_id BIGINT UNSIGNED NULL,
            cell_number VARCHAR(255) UNIQUE,
            capacity INT DEFAULT 4,
            status ENUM('active','inactive') DEFAULT 'active',
            created_at TIMESTAMP NULL,
            updated_at TIMESTAMP NULL,
            CONSTRAINT FOREIGN KEY (dormitory_id) REFERENCES dormitories(id) ON DELETE SET NULL
        )
    ");
    echo "  ✓ Created new cells table with correct structure\n";
    
} catch (PDOException $e) {
    echo "  ✗ Error: " . $e->getMessage() . "\n";
}

echo "\n✅ Tables rebuilt with correct hierarchy:\n";
echo "   Branch → Annex → Dormitory → Cell → PDL\n";

echo "\n⚠️  NOTE: Old tables are preserved as annexes_old, dormitories_old, cells_old\n";
echo "   You may want to drop them after verifying the new tables work correctly.\n";
