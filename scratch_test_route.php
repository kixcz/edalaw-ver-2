<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$user = App\Models\User::find(31);
echo "User 31:\n";
echo "Role: " . $user->role?->slug . "\n";
echo "Approval Status: " . (is_object($user->approval_status) ? $user->approval_status->value : $user->approval_status) . "\n";

$request = Illuminate\Http\Request::create('/jail-officer/assigned-visit-sessions', 'GET');
$request->setUserResolver(fn() => $user);

$middleware = new App\Http\Middleware\EnsureRole();
try {
    $response = $middleware->handle($request, function($req) {
        return response('Role passed');
    }, 'jail_officer');
    echo "EnsureRole: " . $response->getContent() . "\n";
} catch (\Exception $e) {
    echo "EnsureRole failed: " . $e->getMessage() . " (Code: " . $e->getCode() . ")\n";
}

$scopeMiddleware = new App\Http\Middleware\ResolveJailOfficerScope();
try {
    $response2 = $scopeMiddleware->handle($request, function($req) {
        return response('Scope passed');
    });
    echo "ResolveJailOfficerScope: " . $response2->getContent() . "\n";
} catch (\Exception $e) {
    echo "ResolveJailOfficerScope failed: " . $e->getMessage() . "\n";
}

// Now test kernel dispatching the full request!
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
$session = $app['session.store'];
$request->setLaravelSession($session);
\Illuminate\Support\Facades\Auth::setUser($user);

$fullResponse = $kernel->handle($request);
echo "Full Request Status: " . $fullResponse->getStatusCode() . "\n";
if ($fullResponse->getStatusCode() !== 200) {
    echo "Content snippet:\n" . substr($fullResponse->getContent(), 0, 500) . "\n";
}
