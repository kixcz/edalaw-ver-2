import { usePage } from '@inertiajs/react';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

export function FlashToasts() {
    const { flash } = usePage().props as any;
    const flashShownRef = useRef({ s: '', e: '', w: '' });

    useEffect(() => {
        if (!flash) return;

        if (flash.error && flashShownRef.current.e !== flash.error) {
            flashShownRef.current.e = flash.error;
            toast.error(flash.error);
        }
        if (flash.success && flashShownRef.current.s !== flash.success) {
            flashShownRef.current.s = flash.success;
            toast.success(flash.success);
        }
        if (flash.warning && flashShownRef.current.w !== flash.warning) {
            flashShownRef.current.w = flash.warning;
            toast.warning(flash.warning);
        }
    }, [flash]);

    return null;
}
