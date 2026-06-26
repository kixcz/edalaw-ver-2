<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Notification;
use Illuminate\Database\Seeder;

class NotificationSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $users = User::all();

        if ($users->isEmpty()) {
            $this->command->warn('No users found. Please run user seeders first.');
            return;
        }

        $this->command->info('Seeding notifications...');
        
        $totalNotifications = 0;
        $notificationTypes = [
            'visit_scheduled',
            'visit_approved',
            'visit_rejected',
            'visit_reminder',
            'session_started',
            'session_ended',
            'appeal_status_changed',
            'eburol_approved',
            'eburol_rejected',
            'system_alert',
            'security_notice',
        ];

        // Create 30-50 notifications across all users
        $notificationsCount = rand(30, 50);
        
        for ($i = 0; $i < $notificationsCount; $i++) {
            $user = $users->random();

            $isRead = fake()->boolean(40);
            
            Notification::create([
                'user_id' => $user->id,
                'type' => fake()->randomElement($notificationTypes),
                'title' => fake()->sentence(),
                'message' => fake()->paragraph(),
                'read_at' => $isRead ? now() : null,
                'created_at' => fake()->dateTimeBetween('-1 month', 'now'),
            ]);
            
            $totalNotifications++;
        }

        $this->command->info("  Created {$totalNotifications} notifications successfully.");
    }
}
