<?php

namespace App\Events;

use App\Models\Notification;
use App\Models\User;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class JailOfficerNotification implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public User $jailOfficer,
        public Notification $notification
    ) {}

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\PrivateChannel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('jail-officer.' . $this->jailOfficer->id),
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'notification.new';
    }

    /**
     * Get the data to broadcast.
     *
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'id' => $this->notification->id,
            'type' => $this->notification->type,
            'title' => $this->notification->title,
            'message' => $this->notification->message,
            'notifiable_id' => $this->notification->notifiable_id,
            'notifiable_type' => $this->notification->notifiable_type,
            'created_at' => $this->notification->created_at->toIso8601String(),
            'unread_count' => $this->getUnreadCount(),
        ];
    }

    /**
     * Get the unread notification count for the user.
     */
    protected function getUnreadCount(): int
    {
        return Notification::where('user_id', $this->jailOfficer->id)
            ->whereNull('read_at')
            ->count();
    }
}
