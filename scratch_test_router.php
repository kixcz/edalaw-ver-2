<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$user = App\Models\User::find(31);

$request = Illuminate\Http\Request::create('/jail-officer/assigned-visit-sessions', 'GET');
$request->setUserResolver(fn() => $user);
$session = $app['session.store'];
$request->setLaravelSession($session);
\Illuminate\Support\Facades\Auth::setUser($user);

// Use router to dispatch directly to see any exception or response
$router = $app['router'];
try {
    $response = $router->dispatch($request);
    echo "Direct Router dispatch status: " . $response->getStatusCode() . "\n";
    if ($response instanceof \Inertia\Response) {
        echo "Inertia component: " . $response->toResponse($request)->getContent() . "\n";
    }
} catch (\Throwable $e) {
    echo "Exception: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString() . "\n";
}
