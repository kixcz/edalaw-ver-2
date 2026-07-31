import { useCallback, useSyncExternalStore } from 'react';

export type ThemeColor = 'blue' | 'orange' | 'green' | 'pink' | 'purple' | 'yellow';

const THEME_COLORS: ThemeColor[] = ['blue', 'orange', 'green', 'pink', 'purple', 'yellow'];

const listeners = new Set<() => void>();
let currentThemeColor: ThemeColor = 'blue';

const setCookie = (name: string, value: string, days = 365): void => {
    if (typeof document === 'undefined') return;
    const maxAge = days * 24 * 60 * 60;
    document.cookie = `${name}=${value};path=/;max-age=${maxAge};SameSite=Lax`;
};

const getStoredThemeColor = (): ThemeColor => {
    if (typeof window === 'undefined') return 'blue';
    const stored = localStorage.getItem('themeColor') as ThemeColor | null;
    if (stored && THEME_COLORS.includes(stored)) return stored;
    return 'blue';
};

const applyThemeColor = (color: ThemeColor): void => {
    if (typeof document === 'undefined') return;
    // Remove all theme color classes
    THEME_COLORS.forEach((c) => document.documentElement.classList.remove(`theme-${c}`));
    // Add the selected theme color class
    document.documentElement.classList.add(`theme-${color}`);
};

const subscribe = (callback: () => void) => {
    listeners.add(callback);
    return () => listeners.delete(callback);
};

const notify = (): void => listeners.forEach((listener) => listener());

export function initializeThemeColor(): void {
    if (typeof window === 'undefined') return;

    if (!localStorage.getItem('themeColor')) {
        localStorage.setItem('themeColor', 'blue');
        setCookie('themeColor', 'blue');
    }

    currentThemeColor = getStoredThemeColor();
    applyThemeColor(currentThemeColor);
}

export function useThemeColor() {
    const themeColor = useSyncExternalStore(
        subscribe,
        () => currentThemeColor,
        () => 'blue',
    );

    const updateThemeColor = useCallback((color: ThemeColor): void => {
        currentThemeColor = color;
        localStorage.setItem('themeColor', color);
        setCookie('themeColor', color);
        applyThemeColor(color);
        notify();
    }, []);

    return { themeColor, updateThemeColor, themeColors: THEME_COLORS } as const;
}
