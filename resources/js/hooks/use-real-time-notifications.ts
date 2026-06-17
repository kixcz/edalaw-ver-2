import { useEffect, useRef, useState } from 'react';
import { usePage } from '@inertiajs/react';
import type { SharedData } from '@/types';

export type RealTimeNotification = {
    id: number;
    type: string;
    title: string;
    message: string;
    notifiable_id: number;
    notifiable_type: string;
    created_at: string;
    unread_count: number;
};

/**
 * Hook to listen for real-time notifications via Laravel Reverb
 * Specifically for Jail Officers
 */
export function useRealTimeNotifications() {
    const { props } = usePage<SharedData>();
    const user = props.auth?.user;
    const [notifications, setNotifications] = useState<RealTimeNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const channelRef = useRef<any>(null);
    const echoInstanceRef = useRef<any>(null);

    useEffect(() => {
        // Only activate for jail officers
        if (!user || user.role !== 'jail_officer') {
            return;
        }

        // Wait for Echo to be available
        const initializeEcho = () => {
            if (typeof window !== 'undefined' && (window as any).Echo) {
                const Echo = (window as any).Echo;
                echoInstanceRef.current = Echo;

                // Subscribe to the jail officer's private channel
                const channelName = `jail-officer.${user.id}`;
                channelRef.current = Echo.private(channelName);

                // Listen for new notifications
                channelRef.current.listen('.notification.new', (data: RealTimeNotification) => {
                    // Add notification to the list
                    setNotifications((prev) => [data, ...prev]);
                    
                    // Update unread count
                    setUnreadCount(data.unread_count);

                    // Show browser notification if supported
                    showBrowserNotification(data);

                    // Log for debugging
                    console.log('[Reverb] New notification received:', data.title);
                });

                console.log(`[Reverb] Subscribed to channel: ${channelName}`);
            }
        };

        // Initialize with a small delay to ensure Echo is loaded
        const timer = setTimeout(initializeEcho, 500);

        // Cleanup on unmount
        return () => {
            clearTimeout(timer);
            if (channelRef.current) {
                channelRef.current.stopListening('.notification.new');
                echoInstanceRef.current?.leave(`jail-officer.${user.id}`);
                console.log(`[Reverb] Left channel: jail-officer.${user.id}`);
            }
        };
    }, [user?.id, user?.role]);

    /**
     * Show browser notification
     */
    const showBrowserNotification = (data: RealTimeNotification) => {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(data.title, {
                body: data.message,
                icon: '/favicon.svg',
                badge: '/favicon.svg',
                tag: `notification-${data.id}`,
            });
        }
    };

    /**
     * Request browser notification permission
     */
    const requestNotificationPermission = async () => {
        if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            console.log('[Notifications] Permission:', permission);
            return permission === 'granted';
        }
        return false;
    };

    /**
     * Mark notification as handled (remove from local list)
     */
    const markAsHandled = (notificationId: number) => {
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    };

    return {
        notifications,
        unreadCount,
        setUnreadCount,
        markAsHandled,
        requestNotificationPermission,
    };
}
