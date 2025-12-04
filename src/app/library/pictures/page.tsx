'use client';

import { AssetManager } from '@/features/assets/components/AssetManager';

export default function PicturesPage() {
    return (
        <div className="container h-[calc(100vh-4rem)] py-6 flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold tracking-tight">Pictures</h1>
            </div>
            <div className="flex-1 min-h-0 border rounded-lg bg-background shadow-sm">
                <AssetManager initialTab="image" className="p-4" />
            </div>
        </div>
    );
}
