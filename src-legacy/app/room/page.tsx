import { Button } from '@/components/ui/button';
import { listRooms } from '@/features/session/actions/room';
import { RoomList } from '@/features/session/components/RoomList';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default async function RoomListPage() {
    const result = await listRooms();
    const rooms = result.isSuccess ? result.value : [];

    return (
        <div className="container mx-auto py-10 px-4">
            <div className="flex items-center gap-4 mb-8">
                <Link href="/">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                </Link>
                <h1 className="text-3xl font-bold">Session Rooms</h1>
            </div>

            <RoomList rooms={rooms} />
        </div>
    );
}
