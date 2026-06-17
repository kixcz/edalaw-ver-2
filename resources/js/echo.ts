import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

// TypeScript declarations for window globals
declare global {
    interface Window {
        Pusher: typeof Pusher;
        Echo: Echo<any>;
    }
}

// Make Pusher available globally
window.Pusher = Pusher;

// Initialize Laravel Echo with Reverb
window.Echo = new Echo({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY || '',
    wsHost: import.meta.env.VITE_REVERB_HOST || 'localhost',
    wsPort: import.meta.env.VITE_REVERB_PORT ?? 8080,
    wssPort: import.meta.env.VITE_REVERB_PORT ?? 8080,
    forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? 'https') === 'https',
    enabledTransports: ['ws', 'wss'],
    auth: {
        headers: {
            'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
        },
    },
});

// Log initialization
console.log('[Echo] Initialized with Reverb broadcaster');
console.log('[Echo] Host:', import.meta.env.VITE_REVERB_HOST);
console.log('[Echo] Port:', import.meta.env.VITE_REVERB_PORT);
