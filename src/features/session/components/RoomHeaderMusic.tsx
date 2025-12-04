'use client';

import { useMutation, useStorage } from '@/liveblocks.config';
import { saveLog } from '../actions/session';
import { SessionLogEntry } from '../domain/SessionLog';
import { MusicPanel } from './MusicPanel';

import { ClientSideSuspense } from '@liveblocks/react';
import { Loader2 } from 'lucide-react';

function RoomHeaderMusicContent({ roomId }: { roomId: string }) {
    const logs = useStorage((root) => root.logs);

    const addLog = useMutation(({ storage }, log: SessionLogEntry) => {
        storage.get('logs').push(log);
    }, []);

    const handleLog = async (log: SessionLogEntry) => {
        addLog(log);
        saveLog(roomId, log).then(result => {
            if (!result.success) {
                console.error('Failed to persist log:', result.error);
            }
        });
    };

    const logsArray = logs ? Array.from(logs) : [];
    const currentBgm = logsArray.reduce((acc, log) => {
        if (log.type === 'UPDATE_BGM' && log.bgm) {
            return log.bgm;
        }
        return acc;
    }, undefined as { url: string; title: string; volume: number; isPlaying: boolean; isLoop: boolean; } | undefined);

    return <MusicPanel currentBgm={currentBgm} onLog={handleLog} />;
}

export function RoomHeaderMusic({ roomId }: { roomId: string }) {
    return (
        <ClientSideSuspense fallback={<div className="w-8 h-8 flex items-center justify-center"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>}>
            {() => <RoomHeaderMusicContent roomId={roomId} />}
        </ClientSideSuspense>
    );
}
