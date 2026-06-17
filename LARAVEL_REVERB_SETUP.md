# Laravel Reverb - Real-Time Notifications for Jail Officers

## Overview

This document explains how to set up and use Laravel Reverb for real-time notifications in the E-Dalaw system. When a visitor schedules a visit, submits an e-burol, files an appeal, or performs other actions, Jail Officers will receive instant notifications without needing to refresh the page.

## What's Been Implemented

### Backend Components

1. **Event: `JailOfficerNotification`** (`app/Events/JailOfficerNotification.php`)
   - Broadcasts to private channel: `jail-officer.{userId}`
   - Event name: `notification.new`
   - Payload includes: notification ID, type, title, message, and unread count

2. **Channel: `JailOfficerChannel`** (`app/Broadcasting/JailOfficerChannel.php`)
   - Private channel authorization
   - Only allows access to the authenticated jail officer

3. **Channel Registration** (`routes/channels.php`)
   - Registered: `Broadcast::channel('jail-officer.{userId}', JailOfficerChannel::class)`

4. **NotificationService Updates** (`app/Services/NotificationService.php`)
   - `notifyMonitoringOfficerAboutVisit()` - Now broadcasts when visit is assigned
   - `notifyMonitoringOfficerAboutEburol()` - Now broadcasts when e-burol is assigned

### Frontend Components

1. **Hook: `useRealTimeNotifications`** (`resources/js/hooks/use-real-time-notifications.ts`)
   - Subscribes to jail officer's private channel via Echo
   - Listens for `notification.new` events
   - Shows browser notifications (if permitted)
   - Maintains unread count

2. **Dashboard Integration** (`resources/js/pages/JailOfficer/Dashboard.tsx`)
   - Uses the hook to receive real-time notifications
   - Shows toast notifications via `sonner`
   - Auto-requests browser notification permission

## Setup Instructions

### Step 1: Install Laravel Reverb

```bash
composer require laravel/reverb
php artisan reverb:install
```

This will:
- Install the Reverb package
- Publish the configuration file (`config/reverb.php`)
- Update `.env` with Reverb settings

### Step 2: Configure Environment

Add/update these variables in your `.env` file:

```env
# Broadcasting
BROADCAST_DRIVER=reverb

# Reverb
REVERB_APP_ID=your-app-id
REVERB_APP_KEY=your-app-key
REVERB_APP_SECRET=your-app-secret
REVERB_HOST="localhost"
REVERB_PORT=8080
REVERB_SCHEME=http
REVERB_NEW_APP_ID=your-app-id
REVERB_NEW_APP_KEY=your-app-key
REVERB_NEW_APP_SECRET=your-app-secret
```

### Step 3: Install Laravel Echo and Pusher

```bash
npm install --save-dev laravel-echo pusher-js
```

### Step 4: Configure Echo

Update `resources/js/bootstrap.ts` or `resources/js/app.ts`:

```typescript
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

window.Pusher = Pusher;

window.Echo = new Echo({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY,
    wsHost: import.meta.env.VITE_REVERB_HOST,
    wsPort: import.meta.env.VITE_REVERB_PORT ?? 8080,
    wssPort: import.meta.env.VITE_REVERB_PORT ?? 8080,
    forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? 'https') === 'https',
    enabledTransports: ['ws', 'wss'],
});
```

Add to `.env`:

```env
VITE_REVERB_APP_KEY="${REVERB_APP_KEY}"
VITE_REVERB_HOST="${REVERB_HOST}"
VITE_REVERB_PORT="${REVERB_PORT}"
VITE_REVERB_SCHEME="${REVERB_SCHEME}"
```

### Step 5: Rebuild Assets

```bash
npm run build
```

### Step 6: Start Reverb Server

In a new terminal, run:

```bash
php artisan reverb:start
```

Or with debug output:

```bash
php artisan reverb:start --debug
```

### Step 7: Start Queue Worker (Optional but Recommended)

For production, broadcast events should be queued:

```bash
php artisan queue:work
```

Or use Laravel Horizon for better queue monitoring:

```bash
composer require laravel/horizon
php artisan horizon:install
php artisan horizon
```

## Events That Trigger Real-Time Notifications

### When a Visitor Schedules a Visit

**Triggered in:**
- `Visitor/ScheduleController.php` - `store()` method
- Calls: `NotificationService::notifyMonitoringOfficerAboutVisit($visit)`

**Notification Type:** `monitoring_assignment`  
**Title:** "New Visit Assignment"  
**Message:** "You have been assigned to monitor a Virtual/Physical visit. Visitor: {name}. Inmate: {name}. Scheduled for: {date} at {time}."

### When a Visitor Submits an E-Burol

**Triggered in:**
- `Visitor/EburolController.php` - `store()` method
- Calls: `NotificationService::notifyMonitoringOfficerAboutEburol($eburol)`

**Notification Type:** `monitoring_assignment`  
**Title:** "New E-Burol Assignment"  
**Message:** "You have been assigned to monitor an e-burol. Visitor: {name}. Deceased: {name}. Wake period: {start} - {end}."

### When a Visit is Rescheduled

**Triggered in:**
- `Visitor/ScheduleController.php` - `update()` method
- Updates the visit and calls notification service

### When an Appeal is Submitted

**Triggered in:**
- Various controllers
- Calls: `NotificationService::notifyBjmpOfficersAboutAppeal($appeal)`

### When an E-Burol Application is Submitted

**Triggered in:**
- `Visitor/EburolController.php` - `store()` method
- Calls: `NotificationService::createEburolSubmittedNotification($eburol)`

## How It Works

### Flow Diagram

```
Visitor Action (Schedule Visit/E-Burol/etc.)
    ↓
Controller receives request
    ↓
Creates/updates record in database
    ↓
Calls NotificationService::notifyMonitoringOfficerAbout[Visit/Eburol]()
    ↓
NotificationService:
  1. Creates Notification in database
  2. Broadcasts JailOfficerNotification event
    ↓
Laravel Reverb receives event
    ↓
Broadcasts to private channel: jail-officer.{userId}
    ↓
Frontend (Echo) receives event
    ↓
useRealTimeNotifications hook:
  1. Updates notifications state
  2. Shows toast notification
  3. Shows browser notification (if permitted)
    ↓
Jail Officer sees notification instantly!
```

### Notification Payload

```typescript
{
  id: number;                  // Notification ID
  type: string;                // e.g., "monitoring_assignment"
  title: string;               // e.g., "New Visit Assignment"
  message: string;             // Full notification message
  notifiable_id: number;       // ID of the related record
  notifiable_type: string;     // e.g., "App\\Models\\Visit"
  created_at: string;          // ISO 8601 timestamp
  unread_count: number;        // Total unread notifications
}
```

## Browser Notifications

The system requests permission to show browser notifications on page load. When a new notification arrives:

1. **Toast Notification** - Always shown (via sonner)
2. **Browser Notification** - Shown if permission granted

Browser notifications work even when the tab is in the background!

### Browser Notification Example

```
Title: New Visit Assignment
Body: You have been assigned to monitor a Virtual visit. Visitor: Juan Dela Cruz. Inmate: Pedro Santos. Scheduled for: Jun 17, 2026 at 10:00 AM.
Icon: /favicon.svg
```

## Testing

### Manual Testing

1. **Start Reverb:**
   ```bash
   php artisan reverb:start --debug
   ```

2. **Open Jail Officer Dashboard:**
   - Login as jail officer
   - Open browser console (F12)
   - Look for: `[Reverb] Subscribed to channel: jail-officer.{userId}`

3. **Trigger Notification:**
   - Login as visitor in another browser/incognito
   - Schedule a new visit
   - Submit an e-burol

4. **Verify:**
   - Check jail officer browser console
   - Look for: `[Reverb] New notification received: New Visit Assignment`
   - Toast should appear
   - Browser notification should appear (if permitted)

### Programmatic Testing

You can manually trigger a notification from tinker:

```bash
php artisan tinker
```

```php
use App\Events\JailOfficerNotification;
use App\Models\Notification;
use App\Models\User;

// Get a jail officer
$jailOfficer = User::where('role_id', 5)->first(); // Adjust role_id as needed

// Create a test notification
$notification = Notification::create([
    'user_id' => $jailOfficer->id,
    'type' => 'test_notification',
    'title' => 'Test Notification',
    'message' => 'This is a test notification from tinker',
    'notifiable_id' => 1,
    'notifiable_type' => 'App\\Models\\Visit',
]);

// Broadcast it
broadcast(new JailOfficerNotification($jailOfficer, $notification));
```

## Production Deployment

### Using Supervisor for Reverb

Create a supervisor configuration to keep Reverb running:

```ini
[program:reverb]
command=php /path/to/your/app/artisan reverb:start
autostart=true
autorestart=true
user=www-data
redirect_stderr=true
stdout_logfile=/path/to/your/app/storage/logs/reverb.log
```

### Using SSL/WSS

For production, use secure WebSocket connections:

```env
REVERB_SCHEME=https
REVERB_PORT=443
VITE_REVERB_SCHEME=https
```

Configure your reverse proxy (Nginx/Apache) to handle WebSocket upgrades.

### Nginx Configuration Example

```nginx
location /app/reverb {
    proxy_pass http://127.0.0.1:8080;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "Upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

## Troubleshooting

### Notifications Not Appearing

1. **Check Reverb is running:**
   ```bash
   php artisan reverb:start --debug
   ```

2. **Check browser console:**
   - Look for Echo subscription confirmation
   - Check for errors

3. **Check Laravel logs:**
   ```bash
   tail -f storage/logs/laravel.log
   ```

4. **Verify channel authorization:**
   - Check `JailOfficerChannel.php` join method
   - Ensure user is authenticated and has `jail_officer` role

### WebSocket Connection Failed

1. **Check ports:**
   - Default Reverb port: 8080
   - Ensure firewall allows this port

2. **Check CORS:**
   - Update `config/cors.php` if needed

3. **Check scheme:**
   - HTTP: `ws://`
   - HTTPS: `wss://`

### Browser Notifications Not Showing

1. **Check permission:**
   ```javascript
   console.log(Notification.permission);
   // Should be "granted"
   ```

2. **Request permission manually:**
   ```javascript
   Notification.requestPermission().then(permission => {
       console.log('Permission:', permission);
   });
   ```

## Additional Features to Add

- [ ] Notification sound
- [ ] Badge count in sidebar
- [ ] Mark as read from toast
- [ ] Notification inbox sync
- [ ] Bulk mark as read
- [ ] Notification preferences
- [ ] Silent mode / Do Not Disturb
- [ ] Notification history

## Resources

- [Laravel Reverb Documentation](https://reverb.laravel.com/)
- [Laravel Broadcasting Documentation](https://laravel.com/docs/broadcasting)
- [Laravel Echo Documentation](https://laravel.com/docs/frontend-scaffolding)
- [Browser Notification API](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API)

## Support

For issues or questions, check:
- Laravel logs: `storage/logs/laravel.log`
- Browser console (F12)
- Reverb debug output: `php artisan reverb:start --debug`
