<?php

namespace App\Http\Controllers;

use App\Models\ChatFlag;
use App\Models\ChatLog;
use App\Models\VisitSession;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class ChatMessageFlagController extends Controller
{
   
    public function flag(Request $request, VisitSession $session, ChatLog $message): JsonResponse
    {
        Log::error('❌ WRONG ENDPOINT CALLED! You are trying to flag a visit session message using the monitoring session endpoint.', [
            'controller' => 'ChatMessageFlagController',
            'correct_controller' => 'VisitSessionChatController',
            'correct_route' => 'POST /visit/session/{session}/chat/{chatLog}/flag',
            'current_route_called' => $request->path(),
            'message_type' => get_class($message),
            'message_id' => $message->id,
            'session_id' => $session->id,
            'full_url' => $request->fullUrl(),
        ]);
        
        return response()->json([
            'success' => false,
            'error' => 'Wrong API endpoint. You are calling /video/chat/{session}/messages/{message}/flag but should call /visit/session/{session}/chat/{chatLog}/flag instead.',
            'hint' => 'Check your frontend code - you should be using VisitSessionChatController.flag action, not ChatMessageFlagController',
        ], 400);
    }
}
