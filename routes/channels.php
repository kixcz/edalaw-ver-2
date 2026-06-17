<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('chat.{sessionToken}', \App\Broadcasting\ChatChannel::class);
Broadcast::channel('visit-session.{visitSessionId}', \App\Broadcasting\VisitSessionChannel::class);
Broadcast::channel('jail-officer.{userId}', \App\Broadcasting\JailOfficerChannel::class);
