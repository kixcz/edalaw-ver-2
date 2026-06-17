# 🚀 Laravel Reverb - Quick Start Guide

## ✅ What's Been Installed

1. ✅ **Laravel Reverb** package (composer)
2. ✅ **Laravel Echo** + **Pusher JS** (npm)
3. ✅ **Echo configuration** (resources/js/echo.ts)
4. ✅ **Environment variables** (.env updated)
5. ✅ **Broadcast event** (JailOfficerNotification)
6. ✅ **Channel authorization** (JailOfficerChannel)
7. ✅ **Frontend hook** (useRealTimeNotifications)
8. ✅ **Dashboard integration** (JailOfficer/Dashboard.tsx)

## 🎯 How to Test (Follow These Steps)

### Step 1: Start Laravel Reverb Server

Open a **NEW terminal** and run:

```bash
cd "c:\Users\panal\Documents\projects\edalaw (defective)"
php artisan reverb:start --debug
```

You should see:
```
INFO  Starting Reverb server on localhost:8080...
```

**Keep this terminal running!**

### Step 2: Start Queue Worker (Optional but Recommended)

In another **NEW terminal**, run:

```bash
cd "c:\Users\panal\Documents\projects\edalaw (defective)"
php artisan queue:work
```

### Step 3: Test in Browser

1. **Open Jail Officer Dashboard** (http://localhost/jail-officer/dashboard)
   - Login as jail officer
   - Open browser console (F12)
   - You should see:
     ```
     [Echo] Initialized with Reverb broadcaster
     [Echo] Host: localhost
     [Echo] Port: 8080
     [Reverb] Subscribed to channel: jail-officer.{userId}
     ```

2. **Open Visitor Account** in another browser (or incognito window)
   - Login as visitor
   - Schedule a new visit

3. **Watch Jail Officer Browser**
   - Toast notification should appear instantly
   - Browser console should show:
     ```
     [Reverb] New notification received: New Visit Assignment
     ```

## 🔍 Troubleshooting

### Problem: No console logs appear

**Solution:** Check if Echo is loading:
```javascript
// In browser console:
console.log(window.Echo);
// Should show Echo instance, not undefined
```

### Problem: "WebSocket connection failed"

**Solutions:**
1. Make sure Reverb server is running: `php artisan reverb:start --debug`
2. Check port 8080 is not blocked by firewall
3. Verify .env settings:
   ```
   REVERB_HOST="localhost"
   REVERB_PORT=8080
   ```

### Problem: Channel subscription fails (403)

**Solution:** Check if user is authenticated and has jail_officer role:
```javascript
// Check user role in browser
// Should be logged in as jail_officer
```

### Problem: Toast doesn't show but console logs appear

**Solution:** Check if Sonner Toaster is in the layout:
- Should be in app.tsx: `<Toaster position="top-right" richColors />`

### Problem: Notification not created in database

**Solution:** Check Laravel logs:
```bash
tail -f storage/logs/laravel.log
```

Look for errors in NotificationService.

## 🧪 Manual Test via Tinker

Test broadcasting manually:

```bash
php artisan tinker
```

```php
use App\Events\JailOfficerNotification;
use App\Models\Notification;
use App\Models\User;

// Get a jail officer
$jailOfficer = User::where('role', 'jail_officer')->first();

// Create test notification
$notification = Notification::create([
    'user_id' => $jailOfficer->id,
    'type' => 'test',
    'title' => 'Test Notification',
    'message' => 'This is a test!',
    'notifiable_id' => 1,
    'notifiable_type' => 'App\\Models\\Visit',
]);

// Broadcast it
broadcast(new JailOfficerNotification($jailOfficer, $notification));
```

## 📋 Current Configuration

### .env Settings
```
BROADCAST_CONNECTION=reverb
REVERB_APP_ID=590473
REVERB_APP_KEY=0jasgtoek6no0ft0u9vo
REVERB_APP_SECRET=9mqz55v955ucuzqcqset
REVERB_HOST="localhost"
REVERB_PORT=8080
REVERB_SCHEME=http

VITE_REVERB_APP_KEY="${REVERB_APP_KEY}"
VITE_REVERB_HOST="${REVERB_HOST}"
VITE_REVERB_PORT="${REVERB_PORT}"
VITE_REVERB_SCHEME="${REVERB_SCHEME}"
```

### Files Modified
- ✅ `resources/js/echo.ts` - Echo initialization
- ✅ `resources/js/app.tsx` - Imports echo.ts
- ✅ `app/Events/JailOfficerNotification.php` - Broadcast event
- ✅ `app/Broadcasting/JailOfficerChannel.php` - Channel auth
- ✅ `routes/channels.php` - Channel registration
- ✅ `app/Services/NotificationService.php` - Broadcast calls
- ✅ `resources/js/hooks/use-real-time-notifications.ts` - Frontend hook
- ✅ `resources/js/pages/JailOfficer/Dashboard.tsx` - Integration

## 🎯 Events That Trigger Notifications

| Action | Trigger | Notification Type |
|--------|---------|-------------------|
| Visitor schedules visit | ScheduleController::store() | monitoring_assignment |
| Visitor reschedules visit | ScheduleController::update() | monitoring_assignment |
| Visitor submits e-burol | EburolController::store() | monitoring_assignment |

## 📝 Next Steps for Production

1. **Use Supervisor** to keep Reverb running:
   ```ini
   [program:reverb]
   command=php /path/to/app/artisan reverb:start
   autostart=true
   autorestart=true
   user=www-data
   ```

2. **Use SSL** for WebSocket:
   ```
   REVERB_SCHEME=https
   REVERB_PORT=443
   ```

3. **Configure Nginx** for WebSocket proxy:
   ```nginx
   location /app/reverb {
       proxy_pass http://127.0.0.1:8080;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection "Upgrade";
   }
   ```

## ✨ Success Indicators

When everything is working, you should see:

**Terminal 1 (Reverb):**
```
INFO  Starting Reverb server on localhost:8080...
Reverb server started successfully.
[Connection] New connection from 127.0.0.1
[Channel] jail-officer.123 subscribed
[Event] notification.new broadcast to jail-officer.123
```

**Jail Officer Browser Console:**
```
[Echo] Initialized with Reverb broadcaster
[Reverb] Subscribed to channel: jail-officer.123
[Reverb] New notification received: New Visit Assignment
```

**Jail Officer Dashboard:**
- Toast notification appears with title "New Visit Assignment"
- Notification icon badge updates

**Visitor Browser:**
- Visit scheduled successfully
- No errors in console

---

**Need Help?** Check:
1. Reverb debug output in terminal
2. Browser console (F12)
3. Laravel logs: `storage/logs/laravel.log`
