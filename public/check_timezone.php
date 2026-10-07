<?php
require __DIR__.'/../vendor/autoload.php';
$app = require_once __DIR__.'/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
$response = $kernel->handle(
    $request = Illuminate\Http\Request::capture()
);
$t = \App\Models\InmateTunnel::orderBy('id', 'desc')->first();
echo 'Expires Iso: ' . $t->expires_at->toIso8601String() . "\n";
echo 'Created Iso: ' . $t->created_at->toIso8601String() . "\n";
if ($t->visitSession) {
    echo 'Session end Iso: ' . $t->visitSession->scheduled_end->toIso8601String() . "\n";
}
