<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$users = App\Models\User::all();
foreach ($users as $user) {
    $request = Illuminate\Http\Request::create('/jail-officer/assigned-visit-sessions', 'GET');
    $request->setUserResolver(fn() => $user);
    $session = $app['session.store'];
    $request->setLaravelSession($session);
    \Illuminate\Support\Facades\Auth::setUser($user);

    $httpKernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
    $response = $httpKernel->handle($request);
    echo "User {$user->id} ({$user->email}, role: {$user->role?->slug}): Status " . $response->getStatusCode() . "\n";
}
