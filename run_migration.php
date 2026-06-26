<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "Running migration...\n";

$exitCode = Artisan::call('migrate', ['--force' => true]);

echo Artisan::output();

exit($exitCode);
