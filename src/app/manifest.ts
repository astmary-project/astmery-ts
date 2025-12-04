import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'Astmery',
        short_name: 'Astmery',
        description: 'Astemry - 龍星銀河TRPG管理システム',
        start_url: '/',
        theme_color: '#0904ff',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
            {
                src: '/web-app-manifest-192x192.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'maskable'
            },
            {
                src: '/web-app-manifest-512x512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'maskable'
            }
        ],
    };
}
