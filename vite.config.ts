import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import laravel from 'laravel-vite-plugin';
import { defineConfig } from 'vite';

// Conditionally import wayfinder
let wayfinderPlugin: any = null;
try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const wayfinder = require('@laravel/vite-plugin-wayfinder');
    wayfinderPlugin = wayfinder.wayfinder({
        formVariants: true,
    });
} catch (e) {
    // Wayfinder not available, will continue without it
    console.warn('Wayfinder plugin not available');
}

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.tsx'],
            ssr: 'resources/js/ssr.tsx',
            refresh: true,
        }),
        react({
            babel: {
                plugins: [],
            },
        }),
        tailwindcss(),
        ...(wayfinderPlugin ? [wayfinderPlugin] : []),
    ],
    server: {
        host: 'localhost',
        port: 5173,
        strictPort: true,

        origin: 'http://localhost:5173',

        cors: {
            origin: ['http://localhost:8000', 'http://127.0.0.1:8000'],
            credentials: true,
        },

        hmr: {
            host: 'localhost',
            protocol: 'ws',
        },
    },
    esbuild: {
        jsx: 'automatic',
    },
    optimizeDeps: {
        include: ['recharts'],
    },
});
