<?php

namespace Database\Seeders;

use App\Models\CallLog;
use App\Models\ChatLog;
use App\Models\SystemLog;
use App\Models\VideoRecording;
use App\Models\VisitSession;
use Illuminate\Database\Seeder;

class RelatedDataSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Seed call logs
        $this->seedCallLogs();

        // Seed video recordings
        $this->seedVideoRecordings();

        // Seed chat logs
        $this->seedChatLogs();

        // Skip system logs - they are visit-session specific and would require different approach
        // $this->seedSystemLogs();

        $this->command->info('Related data seeded successfully.');
    }

    /**
     * Seed call logs for visit sessions.
     */
    private function seedCallLogs(): void
    {
        $visitSessions = VisitSession::whereNotNull('started_at')->get();

        if ($visitSessions->isEmpty()) {
            return;
        }

        $count = 0;
        foreach ($visitSessions as $session) {
            // Create 1-3 call logs per session
            $callCount = rand(1, 3);
            
            for ($i = 0; $i < $callCount; $i++) {
                CallLog::create([
                    'user_id' => $session->monitor_id ?? auth()->id(),
                    'phone_number' => fake()->phoneNumber(),
                    'call_type' => fake()->randomElement(['incoming', 'outgoing']),
                    'call_date' => $session->scheduled_start->copy()->addMinutes(rand(5, 45)),
                    'duration' => rand(60, 600),
                    'status' => fake()->randomElement(['completed', 'missed', 'failed']),
                    'notes' => fake()->optional(0.7)->sentence(),
                ]);
                $count++;
            }
        }

        $this->command->info("  Created {$count} call logs");
    }

    /**
     * Seed video recordings for visit sessions.
     */
    private function seedVideoRecordings(): void
    {
        $visitSessions = VisitSession::where('recording_status', 'saved')
            ->whereNotNull('ended_at')
            ->get();

        if ($visitSessions->isEmpty()) {
            return;
        }

        $count = 0;
        foreach ($visitSessions as $session) {
            VideoRecording::create([
                'visit_session_id' => $session->id,
                'recording_url' => fake()->url(),
                'file_path' => '/recordings/' . fake()->unique()->bothify('????-####') . '.mp4',
                'duration_seconds' => $session->duration_seconds ?? rand(1800, 3600),
                'started_at' => $session->started_at ?? $session->scheduled_start,
                'ended_at' => $session->ended_at ?? $session->scheduled_end,
                'end_reason' => fake()->optional()->word(),
                'storage_disk' => 's3',
            ]);
            $count++;
        }

        $this->command->info("  Created {$count} video recordings");
    }

    /**
     * Seed chat logs for visit sessions.
     */
    private function seedChatLogs(): void
    {
        $visitSessions = VisitSession::whereNotNull('started_at')->get();

        if ($visitSessions->isEmpty()) {
            return;
        }

        $count = 0;
        foreach ($visitSessions as $session) {
            // Create 5-15 chat messages per session
            $messageCount = rand(5, 15);
            
            for ($i = 0; $i < $messageCount; $i++) {
                ChatLog::create([
                    'visit_session_id' => $session->id,
                    'sender' => fake()->randomElement(['visitor', 'inmate', 'monitor']),
                    'sender_id' => null, // Could be actual user ID if available
                    'message' => fake()->sentence(),
                    'sent_at' => $session->scheduled_start->copy()->addMinutes(rand(1, 55)),
                    'flagged' => fake()->optional(0.1)->boolean() ?? false,
                ]);
                $count++;
            }
        }

        $this->command->info("  Created {$count} chat logs");
    }


}
