<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\VideoChatLog;
use App\Models\ChatLog;
use App\Models\VisitSession;
use App\Models\SessionMediaCommand;
use App\Events\VisitSessionMessageSent;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Exception;

class VideoChatController extends Controller
{
    /**
     * Store a chat message from video call
     */
    public function store(Request $request)
    {
        Log::info('📥 Received chat message to store', [
            'meeting_id' => $request->meeting_id,
            'participant_id' => $request->participant_id,
            'participant_name' => $request->participant_name,
            'message' => $request->message,
        ]);
        
        try {
            $inserted = DB::table('video_chat_logs')->insert([
                'meeting_id' => $request->meeting_id ?? 'unknown',
                'participant_id' => $request->participant_id ?? 'unknown',
                'participant_name' => $request->participant_name ?? 'Unknown',
                'message' => $request->message ?? '',
                'timestamp' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            
            Log::info('✅ Chat message saved to database', ['inserted' => $inserted]);
            
            return response()->json(['success' => true, 'inserted' => $inserted]);
        } catch (\Exception $e) {
            Log::error('❌ Failed to save chat message', ['error' => $e->getMessage()]);
            return response()->json(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Send a chat message during video call
     * Custom chat system - saves to database and broadcasts to all participants
     */
    public function sendMessage(Request $request)
    {
        $validated = $request->validate([
            'room_id' => 'required|string|max:255',
            'sender_id' => 'nullable|integer',
            'sender_name' => 'required|string|max:255',
            'message' => 'required|string|max:1000',
        ]);

        Log::info('💬 Sending chat message', [
            'room_id' => $validated['room_id'],
            'sender_id' => $validated['sender_id'] ?? 'null',
            'sender_name' => $validated['sender_name'],
        ]);

        try {
            // Find the visit session by room_id
            $visitSession = VisitSession::where('room_id', $validated['room_id'])->first();

            if (!$visitSession) {
                Log::warning('⚠️ Visit session not found for room_id', [
                    'room_id' => $validated['room_id']
                ]);
                
                return response()->json([
                    'success' => false, 
                    'error' => 'Visit session not found. Room ID: ' . $validated['room_id']
                ], 404);
            }

            Log::info('📊 Found visit session', [
                'session_id' => $visitSession->id,
                'room_id' => $validated['room_id']
            ]);

            // Create chat log entry - sent_at will be set to created_at automatically
            $chatLog = ChatLog::create([
                'visit_session_id' => $visitSession->id,
                'sender' => $validated['sender_name'],
                'sender_id' => $validated['sender_id'] ?? null,
                'message' => $validated['message'],
                'flagged' => false,
            ]);

            Log::info('✅ Chat message saved to DB', [
                'chat_log_id' => $chatLog->id,
                'visit_session_id' => $chatLog->visit_session_id
            ]);
   
            // Broadcast the message to all participants in real-time
            broadcast(new VisitSessionMessageSent($visitSession, $chatLog))->toOthers();
   
            return response()->json([
                'success' => true,
                'message' => 'Message sent',
                'data' => [
                    'id' => $chatLog->id,
                    'visit_session_id' => $chatLog->visit_session_id,
                    'sender' => $chatLog->sender,
                    'sender_id' => $chatLog->sender_id,
                    'message' => $chatLog->message,
                    'sent_at' => $chatLog->created_at->toIso8601String(),
                ]
            ]);
   
        } catch (\Exception $e) {
            Log::error('❌ Failed to send chat message', [
                'error' => $e->getMessage(),
                'line' => $e->getLine(),
                'file' => $e->getFile()
            ]);
            return response()->json([
                'success' => false, 
                'error' => $e->getMessage()
            ], 500);
        }
    }
   
    /**
     * Get chat history for a video room
     */
    public function getChatHistory($roomId)
    {
        try {
            $visitSession = VisitSession::where('room_id', $roomId)->first();
   
            if (!$visitSession) {
                return response()->json([
                    'success' => false, 
                    'error' => 'Visit session not found'
                ], 404);
            }
   
            $chatLogs = ChatLog::where('visit_session_id', $visitSession->id)
                ->orderBy('sent_at', 'asc')
                ->get();
   
            return response()->json([
                'success' => true,
                'messages' => $chatLogs
            ]);
   
        } catch (\Exception $e) {
            Log::error('❌ Failed to get chat history', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false, 
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Sync chat logs from VideoSDK Cloud
     * Now uses database-stored session_id for reliability
     */
    public function syncFromCloud($roomId)
    {
        try {
            Log::info('🔄 Starting chat sync from cloud', ['room_id' => $roomId]);

            // 1. Find the visit session by room_id to get the stored session_id
            $visitSession = VisitSession::where('room_id', $roomId)->first();

            if (!$visitSession) {
                Log::error('❌ Visit session not found for room_id', ['room_id' => $roomId]);
                return response()->json([
                    'success' => false, 
                    'error' => 'Visit session not found'
                ], 404);
            }

            // 2. Get the session_id from database (Source of Truth)
            $sessionId = $visitSession->session_id;

            if (!$sessionId) {
                Log::error('❌ Session ID not found in database. Meeting may not have been joined yet.', [
                    'visit_session_id' => $visitSession->id,
                    'room_id' => $roomId
                ]);
                return response()->json([
                    'success' => false, 
                    'error' => 'Session ID not available. The meeting may not have started yet.'
                ], 400);
            }

            Log::info('📊 Found session in database', [
                'room_id' => $roomId,
                'session_id' => $sessionId,
                'visit_session_id' => $visitSession->id
            ]);

            // 3. Get credentials from .env
            $apiKey = env('VIDEOSDK_API_KEY');
            $apiSecret = env('VIDEOSDK_SECRET_KEY');

            if (!$apiSecret || !$apiKey) {
                Log::error('❌ API Keys missing');
                return response()->json(['success' => false, 'error' => 'API Keys missing in .env']);
            }

            // 4. Generate JWT using Firebase JWT library
            $payload = [
                'apikey' => $apiKey,
                'permissions' => ['allow_join', 'allow_mod'],
                'iat' => time(),
                'exp' => time() + 3600,
            ];
            
            $token = JWT::encode($payload, $apiSecret, 'HS256');

            // 5. Call the v1 Sessions Chat Endpoint
            $url = "https://api.videosdk.live/v1/sessions/{$sessionId}/chat";

            Log::info('📡 Calling VideoSDK API', ['url' => $url, 'session_id' => $sessionId]);

            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $token,
                'Content-Type' => 'application/json'
            ])->get($url);

            Log::info('📡 API Response', ['status' => $response->status(), 'body' => substr($response->body(), 0, 200)]);

            if ($response->successful()) {
                $messages = $response->json()['data'] ?? [];
                Log::info('✅ Found messages', ['count' => count($messages)]);

                foreach ($messages as $msg) {
                    // Use updateOrInsert to prevent duplicates
                    DB::table('video_chat_logs')->updateOrInsert(
                        [
                            'timestamp' => $msg['timestamp'], 
                            'participant_id' => $msg['senderId']
                        ],
                        [
                            'meeting_id'       => $msg['meetingId'] ?? $roomId,
                            'participant_name' => $msg['senderName'] ?? 'Guest',
                            'message'          => $msg['text'] ?? ($msg['message'] ?? ''),
                            'created_at'       => now(),
                            'updated_at'       => now(),
                        ]
                    );
                }

                Log::info('✅ Chat sync completed successfully', [
                    'messages_saved' => count($messages),
                    'session_id' => $sessionId
                ]);

                return response()->json([
                    'success' => true, 
                    'count' => count($messages),
                    'messages' => $messages,
                    'session_id' => $sessionId
                ]);
            } else {
                Log::error('❌ API failed', ['status' => $response->status(), 'body' => $response->body()]);
                
                return response()->json([
                    'success' => false, 
                    'error' => 'VideoSDK API Error: ' . $response->status(),
                    'details' => $response->body()
                ], $response->status());
            }

        } catch (\Exception $e) {
            Log::error('❌ Exception in syncFromCloud', [
                'error' => $e->getMessage(), 
                'line' => $e->getLine(),
                'room_id' => $roomId
            ]);
            
            return response()->json([
                'success' => false, 
                'error' => 'Error: ' . $e->getMessage()
            ], 500);
        }
    }
    
public function syncFromVideoSDK($sessionId)
{
    try {
        $apiKey = env('VIDEOSDK_API_KEY');
        $apiSecret = env('VIDEOSDK_SECRET_KEY');
        
        // 1. Generate the JWT (or use a permanent one for testing)
        $token = $this->generateVideoSDKToken($apiKey, $apiSecret);

        // 2. Fetch Session Details (this includes the 'chatLink')
        $response = Http::withHeaders([
            'Authorization' => 'Bearer ' . $token
        ])->get("https://api.videosdk.live/v1/sessions/{$sessionId}");

        $sessionData = $response->json();
        
        if (isset($sessionData['chatLink'])) {
            // 3. Download the CSV/JSON from the chatLink
            $chatResponse = Http::get($sessionData['chatLink']);
            $messages = $chatResponse->json(); // or parse CSV if provided

            foreach ($messages as $msg) {
                VideoChatLog::updateOrCreate(
                    ['timestamp' => $msg['timestamp'], 'participant_id' => $msg['senderId']],
                    [
                        'meeting_id' => $sessionData['meetingId'],
                        'participant_name' => $msg['senderName'],
                        'message' => $msg['message'],
                    ]
                );
            }
            return response()->json(['success' => true]);
        }

        return response()->json(['success' => false, 'message' => 'No chat found']);
    } catch (Exception $e) {
        return response()->json([
            'success' => false, 
            'error' => 'Error: ' . $e->getMessage(),
            'line' => $e->getLine()
        ], 500);
    }
}

public function syncSessionChat($sessionId)
{
    try {
        $apiKey = config('services.videosdk.api_key');
        $apiSecret = config('services.videosdk.api_secret'); // Ensure this is in your .env

        // 1. Get the session details from VideoSDK Cloud
        $response = Http::withHeaders([
            'Authorization' => 'Bearer ' . $this->generateJwtToken($apiKey, $apiSecret),
            'Content-Type' => 'application/json'
        ])->get("https://api.videosdk.live/v1/sessions/{$sessionId}/chat");

        if ($response->successful()) {
            $chats = $response->json()['data'] ?? [];

            foreach ($chats as $chat) {
                // Use updateOrInsert to prevent duplicates in your UI
                DB::table('video_chat_logs')->updateOrInsert(
                    ['timestamp' => $chat['timestamp'], 'participant_id' => $chat['senderId']],
                    [
                        'meeting_id'       => $chat['meetingId'] ?? 'unknown',
                        'participant_name' => $chat['senderName'] ?? 'Unknown',
                        'message'          => $chat['text'] ?? '',
                        'created_at'       => now(),
                        'updated_at'       => now(),
                    ]
                );
            }
            return response()->json(['success' => true, 'message' => 'UI Logs updated from Cloud']);
        }

        return response()->json([
            'success' => false, 
            'error' => 'Could not fetch cloud logs: ' . $response->status(),
            'body' => $response->body()
        ], 400);
    } catch (Exception $e) {
        return response()->json([
            'success' => false, 
            'error' => 'Error: ' . $e->getMessage(),
            'line' => $e->getLine()
        ], 500);
    }
}



    private function generateVideoSDKToken($apiKey, $apiSecret)
    {
        $issuedAt = time();
        $payload = [
            'apikey' => $apiKey,
            'permissions' => ['allow_join', 'allow_mod'],
            'iat' => $issuedAt,
            'exp' => $issuedAt + 3600, // Token valid for 1 hour
        ];

        return JWT::encode($payload, $apiSecret, 'HS256');
    }

    /**
     * Export chat logs to CSV
     * Now uses database-stored session_id for reliability
     */
    public function exportChat($roomId)
    {
        try {
            Log::info('📥 Starting chat export', ['room_id' => $roomId]);

            // 1. Find the visit session by room_id to get the stored session_id
            $visitSession = VisitSession::where('room_id', $roomId)->first();

            if (!$visitSession) {
                Log::error('❌ Visit session not found for room_id', ['room_id' => $roomId]);
                return response()->json([
                    'success' => false, 
                    'error' => 'Visit session not found'
                ], 404);
            }

            // 2. Get the session_id from database (Source of Truth)
            $sessionId = $visitSession->session_id;

            if (!$sessionId) {
                Log::error('❌ Session ID not found in database', [
                    'visit_session_id' => $visitSession->id,
                    'room_id' => $roomId
                ]);
                return response()->json([
                    'success' => false, 
                    'error' => 'Session ID not available'
                ], 400);
            }

            Log::info('📊 Found session for export', [
                'room_id' => $roomId,
                'session_id' => $sessionId
            ]);

            // 3. Sync from VideoSDK cloud first
            $this->syncFromCloudInternal($sessionId);
            
            // 4. Then fetch from database
            $logs = DB::table('video_chat_logs')
                ->where('meeting_id', $roomId)
                ->orderBy('timestamp', 'asc')
                ->get();
            
            if ($logs->isEmpty()) {
                return response()->json(['success' => false, 'message' => 'No chat logs found']);
            }
            
            // 5. Create CSV file
            $csvData = "Timestamp,Sender Name,Participant ID,Message\n";
            
            foreach ($logs as $log) {
                $timestamp = date('Y-m-d H:i:s', strtotime($log->timestamp));
                $senderName = str_replace('"', '""', $log->participant_name ?? 'Unknown');
                $participantId = str_replace('"', '""', $log->participant_id ?? 'N/A');
                $message = str_replace('"', '""', $log->message ?? '');
                
                $csvData .= sprintf(
                    '"%s","%s","%s","%s"' . "\n",
                    $timestamp,
                    $senderName,
                    $participantId,
                    $message
                );
            }
            
            Log::info('✅ Chat export completed', ['messages_count' => $logs->count()]);
            
            // 6. Return as downloadable file
            return response($csvData)
                ->header('Content-Type', 'text/csv')
                ->header('Content-Disposition', 'attachment; filename="chat-' . $roomId . '.csv"');
                
        } catch (Exception $e) {
            Log::error('❌ Export failed', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'error' => 'Export failed: ' . $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Internal method to sync without returning response
     */
    private function syncFromCloudInternal($sessionId)
    {
        try {
            $apiKey = env('VIDEOSDK_API_KEY');
            $apiSecret = env('VIDEOSDK_SECRET_KEY');

            if (!$apiSecret || !$apiKey) {
                return false;
            }

            $payload = [
                'apikey' => $apiKey,
                'permissions' => ['allow_join', 'allow_mod'],
                'iat' => time(),
                'exp' => time() + 3600,
            ];
            
            $token = JWT::encode($payload, $apiSecret, 'HS256');

            $url = "https://api.videosdk.live/v1/sessions/{$sessionId}/chat";

            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $token,
                'Content-Type' => 'application/json'
            ])->get($url);

            if ($response->successful()) {
                $messages = $response->json()['data'] ?? [];

                foreach ($messages as $msg) {
                    DB::table('video_chat_logs')->updateOrInsert(
                        ['timestamp' => $msg['timestamp'], 'participant_id' => $msg['senderId']],
                        [
                            'meeting_id'       => $msg['meetingId'] ?? 'unknown',
                            'participant_name' => $msg['senderName'] ?? 'Guest',
                            'message'          => $msg['text'] ?? ($msg['message'] ?? ''),
                            'created_at'       => now(),
                            'updated_at'       => now(),
                        ]
                    );
                }
            }
        } catch (Exception $e) {
            Log::error('Sync internal failed: ' . $e->getMessage());
        }
    }

    private function generateJwtToken($apiKey, $apiSecret)
    {
        $issuedAt = time();
        $payload = [
            'apikey' => $apiKey,
            'permissions' => ['allow_join', 'allow_mod'],
            'iat' => $issuedAt,
            'exp' => $issuedAt + 3600, // Token valid for 1 hour
        ];

        return JWT::encode($payload, $apiSecret, 'HS256');
    }

    /**
     * Get pending media commands for a room (polling endpoint)
     */
    public function getPendingMediaCommands(string $roomId)
    {
        $commands = SessionMediaCommand::forRoom($roomId)
            ->pending()
            ->orderBy('created_at', 'asc')
            ->get();

        return response()->json([
            'success' => true,
            'commands' => $commands->map(function ($cmd) {
                return [
                    'id' => $cmd->id,
                    'command' => $cmd->command,
                    'room_id' => $cmd->room_id,
                    'issued_by' => $cmd->issued_by,
                    'created_at' => $cmd->created_at->toIso8601String(),
                ];
            }),
        ]);
    }

    /**
     * Mark a media command as executed
     */
    public function markCommandExecuted(int $commandId)
    {
        $command = SessionMediaCommand::find($commandId);
        
        if (!$command) {
            return response()->json(['success' => false, 'error' => 'Command not found'], 404);
        }

        $command->markAsExecuted();

        return response()->json(['success' => true]);
    }
}