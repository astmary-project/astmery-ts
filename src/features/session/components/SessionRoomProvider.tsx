'use client';

import { RoomProvider } from '@/liveblocks.config';
import { LiveList } from '@liveblocks/client';
import { ReactNode } from 'react';

interface SessionRoomProviderProps {
    roomId: string;
    children: ReactNode;
}

export function SessionRoomProvider({ roomId, children }: SessionRoomProviderProps) {
    return (
        <RoomProvider
            id={roomId}
            initialPresence={{ cursor: null }}
            initialStorage={{ logs: new LiveList([]) }}
        >
            {children}
        </RoomProvider>
    );
}
