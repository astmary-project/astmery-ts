'use client';

import { ClientSideSuspense } from '@liveblocks/react';
import { SessionLoading } from './SessionLoading';
import { SessionRoomContent } from './SessionRoomContent';

export function SessionRoomMain({ roomId }: { roomId: string }) {
    return (
        <ClientSideSuspense fallback={<SessionLoading />}>
            {() => <SessionRoomContent roomId={roomId} />}
        </ClientSideSuspense>
    );
}
