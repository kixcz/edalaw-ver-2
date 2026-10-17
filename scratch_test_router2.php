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

$router = $app['router'];
$response = $router->dispatch($request);
if ($response->getStatusCode() >= 400) {
    if (isset($response->exception)) {
        echo "Exception: " . get_class($response->exception) . ": " . $response->exception->getMessage() . "\n";
        echo $response->exception->getTraceAsString() . "\n";
    } else {
        echo "Response content:\n" . substr($response->getContent(), 0, 1000) . "\n";
    }
}
