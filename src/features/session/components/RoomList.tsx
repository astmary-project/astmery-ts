'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { Users } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createRoom } from '../actions/room';
import { Room } from '../domain/Room';

interface RoomListProps {
    rooms: Room[];
}

import { useEffect, useState } from 'react';
import { getRoomPresenceCounts } from '../actions/presence';

interface RoomListProps {
    rooms: Room[];
}

export function RoomList({ rooms }: RoomListProps) {
    const router = useRouter();
    const [presenceCounts, setPresenceCounts] = useState<Record<string, number>>({});

    useEffect(() => {
        const fetchPresence = async () => {
            const roomIds = rooms.map(r => r.id);
            if (roomIds.length === 0) return;

            const counts = await getRoomPresenceCounts(roomIds);
            const countMap = counts.reduce((acc, curr) => {
                acc[curr.roomId] = curr.activeUsers;
                return acc;
            }, {} as Record<string, number>);

            setPresenceCounts(countMap);
        };

        fetchPresence();
        // Poll every 10 seconds?
        const interval = setInterval(fetchPresence, 10000);
        return () => clearInterval(interval);
    }, [rooms]);

    const handleCreateRoom = async () => {
        const result = await createRoom();
        if (result.success) {
            router.push(`/room/${result.data.id}`);
        } else {
            console.error('Failed to create room:', result.error);
            alert('Failed to create room. Please try again.');
        }
    };

    const getStatus = (room: Room, activeUsers: number) => {
        if (room.status === 'closed') return 'Closed';
        if (activeUsers > 0) return 'Active';
        return 'Waiting';
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Active': return 'bg-green-100 text-green-800';
            case 'Waiting': return 'bg-yellow-100 text-yellow-800';
            case 'Closed': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card
                className="border-dashed flex items-center justify-center min-h-[150px] hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={handleCreateRoom}
            >
                <CardContent className="flex flex-col items-center gap-2 pt-6">
                    <Button variant="ghost">Create New Room</Button>
                </CardContent>
            </Card>

            {rooms.map((room) => {
                const activeUsers = presenceCounts[room.id] ?? 0;
                const status = getStatus(room, activeUsers);

                return (
                    <Link key={room.id} href={`/room/${room.id}`}>
                        <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                            <CardHeader>
                                <CardTitle className="flex items-center justify-between">
                                    <span className="truncate pr-2" title={room.name}>{room.name}</span>
                                    <span className={`text-xs px-2 py-1 rounded-full shrink-0 ${getStatusColor(status)}`}>
                                        {status}
                                    </span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Users className="w-4 h-4" />
                                    <span>{activeUsers} Players</span>
                                </div>
                                <div className="text-xs text-muted-foreground mt-2" suppressHydrationWarning>
                                    Created: {format(new Date(room.createdAt), 'yyyy/MM/dd')}
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                );
            })}
        </div>
    );
}
