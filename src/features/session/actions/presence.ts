'use server';

import { liveblocks } from "@/lib/liveblocks-server";

export type RoomPresenceInfo = {
    roomId: string;
    activeUsers: number;
};

export async function getRoomPresenceCounts(roomIds: string[]): Promise<RoomPresenceInfo[]> {
    if (roomIds.length === 0) return [];

    try {
        // Liveblocks API doesn't have a bulk "get active users" for specific IDs easily without looping or getting all.
        // For MVP, we will loop. If this becomes slow, we should cache or find a better API.
        // Alternatively, we could get ALL rooms and filter, but that might be worse if there are many rooms.

        const promises = roomIds.map(async (roomId) => {
            try {
                // getActiveUsers returns { data: [...] }
                const { data } = await liveblocks.getActiveUsers(roomId);
                return {
                    roomId,
                    activeUsers: data.length
                };
            } catch (e) {
                console.error(`Failed to get active users for room ${roomId}:`, e);
                return { roomId, activeUsers: 0 };
            }
        });

        return Promise.all(promises);
    } catch (e) {
        console.error("Failed to get room presence counts:", e);
        return roomIds.map(id => ({ roomId: id, activeUsers: 0 }));
    }
}
