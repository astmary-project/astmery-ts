'use client';

import { useOthers } from '@/liveblocks.config';
import { ClientSideSuspense } from '@liveblocks/react';

function RoomPresenceContent() {
    const others = useOthers();
    const connectionCount = others.length + 1;

    return (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-full border">
            <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="text-xs font-medium text-muted-foreground">
                {connectionCount} Online
            </span>
        </div>
    );
}

function RoomPresenceFallback() {
    return (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-full border opacity-50">
            <span className="relative flex h-2 w-2">
                <span className="relative inline-flex rounded-full h-2 w-2 bg-gray-400"></span>
            </span>
            <span className="text-xs font-medium text-muted-foreground">
                Connecting...
            </span>
        </div>
    );
}

export function RoomPresenceIndicator() {
    return (
        <ClientSideSuspense fallback={<RoomPresenceFallback />}>
            {() => <RoomPresenceContent />}
        </ClientSideSuspense>
    );
}
