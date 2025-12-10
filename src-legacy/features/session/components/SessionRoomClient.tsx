'use client';

import { RoomProvider } from '@/liveblocks.config';
import { LiveList } from '@liveblocks/client';
import { ClientSideSuspense } from '@liveblocks/react';
import { SessionRoomContent } from './SessionRoomContent';

export function SessionRoomClient({ roomId }: { roomId: string }) {
    return (
        <RoomProvider
            id={roomId}
            initialPresence={{ cursor: null }}
            initialStorage={{ logs: new LiveList([]) }}
        >
            <ClientSideSuspense fallback={
                <div className="flex h-full w-full items-center justify-center bg-background">
                    <div className="flex flex-col items-center gap-4">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                        <p className="text-muted-foreground animate-pulse">Loading Session Logs...</p>
                    </div>
                </div>
            }>
                {() => <SessionRoomContent roomId={roomId} />}
            </ClientSideSuspense>
        </RoomProvider>
    );
}


