<?php

$pdo = new PDO('mysql:host=127.0.0.1;dbname=edalaw', 'root', '');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

echo "=== DIRECT PDO CHECK ===\n\n";

$stmt = $pdo->query("SHOW COLUMNS FROM annexes");
echo "ANNEXES:\n";
while ($row = $stmt->fetch(PDO::FETCH_OBJ)) {
    echo "  {$row->Field}\n";
}
echo "\n";

$stmt = $pdo->query("SHOW COLUMNS FROM dormitories");
echo "DORMITORIES:\n";
while ($row = $stmt->fetch(PDO::FETCH_OBJ)) {
    echo "  {$row->Field}\n";
}
echo "\n";

$stmt = $pdo->query("SHOW COLUMNS FROM cells");
echo "CELLS:\n";
while ($row = $stmt->fetch(PDO::FETCH_OBJ)) {
    echo "  {$row->Field}\n";
}

echo "\n\nNow attempting to drop columns:\n";

try {
    $pdo->exec("ALTER TABLE annexes DROP COLUMN dormitory_id");
    echo "✓ Dropped dormitory_id from annexes\n";
} catch (PDOException $e) {
    echo "✗ Error: " . $e->getMessage() . "\n";
}

try {
    $pdo->exec("ALTER TABLE dormitories DROP COLUMN jail_id");
    echo "✓ Dropped jail_id from dormitories\n";
} catch (PDOException $e) {
    echo "✗ Error: " . $e->getMessage() . "\n";
}

try {
    $pdo->exec("ALTER TABLE cells DROP COLUMN annex_id");
    echo "✓ Dropped annex_id from cells\n";
} catch (PDOException $e) {
    echo "✗ Error: " . $e->getMessage() . "\n";
}

echo "\nVerifying after changes:\n";
$stmt = $pdo->query("SHOW COLUMNS FROM annexes");
echo "ANNEXES: ";
$fields = [];
while ($row = $stmt->fetch(PDO::FETCH_OBJ)) {
    $fields[] = $row->Field;
}
echo implode(', ', $fields) . "\n";

$stmt = $pdo->query("SHOW COLUMNS FROM dormitories");
echo "DORMITORIES: ";
$fields = [];
while ($row = $stmt->fetch(PDO::FETCH_OBJ)) {
    $fields[] = $row->Field;
}
echo implode(', ', $fields) . "\n";

$stmt = $pdo->query("SHOW COLUMNS FROM cells");
echo "CELLS: ";
$fields = [];
while ($row = $stmt->fetch(PDO::FETCH_OBJ)) {
    $fields[] = $row->Field;
}
echo implode(', ', $fields) . "\n";
