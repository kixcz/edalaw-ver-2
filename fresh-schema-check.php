<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\DB;

echo "Direct SQL check:\n\n";

$result = DB::select("SHOW COLUMNS FROM annexes");
echo "ANNEXES TABLE:\n";
foreach ($result as $row) {
    echo "  {$row->Field} - {$row->Type}\n";
}
echo "\n";

$result = DB::select("SHOW COLUMNS FROM dormitories");
echo "DORMITORIES TABLE:\n";
foreach ($result as $row) {
    echo "  {$row->Field} - {$row->Type}\n";
}
echo "\n";

$result = DB::select("SHOW COLUMNS FROM cells");
echo "CELLS TABLE:\n";
foreach ($result as $row) {
    echo "  {$row->Field} - {$row->Type}\n";
}
