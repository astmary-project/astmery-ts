'use client';

import { Loader2 } from 'lucide-react';

export function SessionLoading() {
    return (
        <div className="h-full w-full flex flex-col items-center justify-center gap-4 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <div className="flex flex-col items-center gap-1">
                <p className="font-medium">Connecting to Session...</p>
                <p className="text-xs opacity-70">Synchronizing game state</p>
            </div>
        </div>
    );
}
