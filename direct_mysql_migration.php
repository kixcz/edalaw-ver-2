<?php

$host = '127.0.0.1';
$port = 3306;
$user = 'root';
$password = ''; // Set your MySQL password here if any
$database = 'edalaw';

try {
    // Connect directly to MySQL
    $pdo = new PDO("mysql:host=$host;port=$port;dbname=$database", $user, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "✅ Connected to MySQL successfully!\n\n";
    
    // Check if branch_id column already exists
    $stmt = $pdo->query("SHOW COLUMNS FROM time_slot_capacities LIKE 'branch_id'");
    $exists = $stmt->fetch();
    
    if ($exists) {
        echo "✓ Column 'branch_id' already exists in time_slot_capacities table\n";
    } else {
        echo "Adding branch_id column...\n";
        $pdo->exec('ALTER TABLE time_slot_capacities ADD COLUMN branch_id BIGINT UNSIGNED NULL AFTER id COMMENT "Branch this time configuration applies to"');
        echo "✓ Added branch_id column\n\n";
        
        // Drop old unique constraint
        echo "Dropping old unique constraint...\n";
        $pdo->exec('ALTER TABLE time_slot_capacities DROP INDEX time_slot_capacities_time_slot_visit_type_unique');
        echo "✓ Dropped old constraint\n\n";
        
        // Add new unique constraint
        echo "Adding new unique constraint...\n";
        $pdo->exec('ALTER TABLE time_slot_capacities ADD UNIQUE KEY time_slot_branch_time_visit_unique (branch_id, time_slot, visit_type)');
        echo "✓ Added new constraint\n\n";
        
        echo "✅ Migration completed successfully!\n";
    }
    
    // Show current table structure
    echo "\n--- Table Structure ---\n";
    $stmt = $pdo->query("DESCRIBE time_slot_capacities");
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        echo sprintf("%-20s %-20s %-10s %s\n", $row['Field'], $row['Type'], $row['Null'], $row['Key']);
    }
    
} catch (PDOException $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    exit(1);
}
