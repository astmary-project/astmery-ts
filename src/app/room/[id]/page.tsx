import { Button } from '@/components/ui/button';
import { getRoom } from '@/features/session/actions/room';
import { RoomPresenceIndicator } from '@/features/session/components/RoomPresenceIndicator';
import { RoomSettingsDialog } from '@/features/session/components/RoomSettingsDialog';
import { SessionRoomMain } from '@/features/session/components/SessionRoomMain';
import { SessionRoomProvider } from '@/features/session/components/SessionRoomProvider';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

interface Props {
    params: Promise<{ id: string }>;
}

export default async function SessionRoomPage({ params }: Props) {
    const { id } = await params;
    const result = await getRoom(id);

    if (result.isFailure) {
        notFound();
    }

    const room = result.value;

    return (
        <SessionRoomProvider roomId={id}>
            <div className="w-full h-[calc(100vh-4rem)] flex flex-col overflow-hidden">
                <header className="flex items-center justify-between border-b px-6 py-3 bg-background/80 backdrop-blur-sm z-50 shrink-0">
                    <div className="flex items-center gap-4">
                        <Link href="/room">
                            <Button variant="ghost" size="icon">
                                <ArrowLeft className="w-4 h-4" />
                            </Button>
                        </Link>
                        <h1 className="text-xl font-bold">{room.name}</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <RoomPresenceIndicator />
                        <RoomSettingsDialog room={room} />
                    </div>
                </header>

                <div className="flex-1 min-h-0 relative">
                    <SessionRoomMain roomId={id} />
                </div>
            </div>
        </SessionRoomProvider>
    );
}
