'use client';

import { CharacterState } from '../../character';

// Mock initial state for testing
const MOCK_CHARACTER_STATE: CharacterState = {
    // ... (lines 9-32)
    stats: {
        'Strength': 10,
        'Dexterity': 12,
        'Power': 14,
        'Intelligence': 16,
        'Appearance': 10,
        'Size': 12,
        'Education': 14,
        'Luck': 10,
    },
    resources: [
        { id: 'mp', name: 'MP', initial: 10, max: 10, min: 0 },
    ],
    skills: [],
    tags: new Set(),
    equipment: [],
    skillWishlist: [],
    exp: { total: 0, used: 0, free: 0 },
    derivedStats: {},
    customLabels: {},
    customMainStats: [],
    resourceValues: {},
};

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


