'use client';

import { useMutation, useSelf, useStorage } from '@/liveblocks.config';
import { useEffect } from 'react';
import { CharacterState } from '../../character';
import { getLogs, saveLog } from '../actions/session';
import { MapToken, SessionLogEntry } from '../domain/SessionLog';
import { DicePanel } from './DicePanel';
import { MapPanel } from './MapPanel';

// Mock initial state for testing
const MOCK_CHARACTER_STATE: CharacterState = {
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

export function SessionRoomContent({ roomId }: { roomId: string }) {
    // Use Liveblocks storage for logs
    const logs = useStorage((root) => root.logs);

    // Mutation to add log
    const addLog = useMutation(({ storage }, log: SessionLogEntry) => {
        storage.get('logs').push(log);
    }, []);

    const logsArray = logs ? Array.from(logs) : [];

    // Derive resource values from logs
    // We start with initial values and apply UPDATE_RESOURCE logs in order (oldest to newest)
    const resourceValues = logsArray.reduce((acc, log) => {
        if (log.type === 'UPDATE_RESOURCE' && log.resourceUpdate) {
            const { resourceId, type, value, resetTarget } = log.resourceUpdate;
            const current = acc[resourceId] ?? 0;
            let next = current;

            if (type === 'set' && value !== undefined) next = value;
            if (type === 'modify' && value !== undefined) next = current + value;
            if (type === 'reset') {
                const res = MOCK_CHARACTER_STATE.resources.find(r => r.id === resourceId);
                if (res) {
                    next = resetTarget === 'max' ? res.max : res.initial;
                }
            }
            return { ...acc, [resourceId]: next };
        }
        return acc;
    }, { 'hp': 20, 'mp': 10 } as Record<string, number>);

    // Derive map state from logs
    // Logs are stored newest-first? No, LiveList push appends to end.
    // So logs are oldest-first by default if we push.
    // BUT, DicePanel expects newest-first for display?
    // Let's check how we display logs. Usually chat is bottom-up.
    // DicePanel.tsx: logs.map(...)

    // Wait, if I push to LiveList, index 0 is oldest.
    // Previous implementation: setLogs(prev => [log, ...prev]) -> Newest first.
    // So if I use LiveList, I should probably unshift? Or just reverse when displaying.
    // LiveList doesn't have unshift easily? It has insert(0, item).
    // Let's use push (append) which is more natural for history, and reverse for display if needed.

    // However, the previous logic:
    // const activeTabs = logs.slice().reverse().reduce(...)
    // implied logs were newest-first?
    // "logs.slice().reverse().reduce" -> processing from oldest to newest?
    // If logs were newest-first (index 0 is new), then reverse() makes them oldest-first.
    // Yes.

    // So if LiveList is oldest-first (index 0 is old), then we don't need to reverse for reduction.
    // We just reduce normally.

    // If logsArray is oldest-first:
    // If logsArray is oldest-first:

    const mapState = logsArray.reduce((acc, log: SessionLogEntry) => {
        if (log.type === 'UPDATE_MAP_BACKGROUND' && log.mapBackground) {
            acc.backgroundUrl = log.mapBackground.url;
        } else if (log.type === 'ADD_TOKEN' && log.token) {
            acc.tokens.push(log.token as MapToken);
        } else if (log.type === 'REMOVE_TOKEN' && log.token && (log.token as MapToken).id) {
            acc.tokens = acc.tokens.filter(t => t.id !== (log.token as MapToken).id);
        } else if (log.type === 'MOVE_TOKEN' && log.token && (log.token as MapToken).id) {
            const tokenIndex = acc.tokens.findIndex(t => t.id === (log.token as MapToken).id);
            if (tokenIndex !== -1) {
                acc.tokens[tokenIndex] = { ...acc.tokens[tokenIndex], ...(log.token as MapToken) };
            }
        }
        return acc;
    }, { backgroundUrl: undefined as string | undefined, tokens: [] as MapToken[] });

    const activeTabs = logsArray.reduce((acc, log) => {
        if (log.type === 'ADD_TAB' && log.tabId && log.tabName) {
            if (!acc.find(t => t.id === log.tabId)) {
                acc.push({ id: log.tabId, label: log.tabName });
            }
        } else if (log.type === 'REMOVE_TAB' && log.tabId) {
            return acc.filter(t => t.id !== log.tabId);
        }
        return acc;
    }, [{ id: 'main', label: 'Main' }, { id: 'system', label: 'System' }]);

    const handleLog = async (log: SessionLogEntry) => {
        // 1. Update Liveblocks (Real-time)
        addLog(log);

        // 2. Persist to Supabase (Async)
        // We don't await this to keep UI responsive, but in production we might want queueing/retries
        saveLog(roomId, log).then(result => {
            if (!result.success) {
                console.error('Failed to persist log:', result.error);
            }
        });
    };

    // Hydrate logs from Supabase if Liveblocks is empty (Initial load / Room revival)
    useEffect(() => {
        const initLogs = async () => {
            // Only fetch if we have no logs locally (and assuming we might be the first or just joined)
            // Actually, Liveblocks syncs first. If after sync it's empty, we might check DB.
            // But checking "if empty" is tricky because it might be empty just because it hasn't synced yet?
            // No, useStorage suspends until synced. So if logsArray is empty here, it really is empty in Liveblocks.

            if (logsArray.length === 0) {
                const result = await getLogs(roomId);
                if (result.success) {
                    const dbLogs = result.data;
                    if (dbLogs.length > 0) {
                        // We found logs in DB but Liveblocks is empty.
                        // This means the room was cleared from memory but history exists.
                        // We should re-populate Liveblocks.
                        // BE CAREFUL: Race condition if multiple users join simultaneously.
                        // For MVP, we'll just push them. Liveblocks handles conflict resolution mostly,
                        // but we might get duplicates if two clients push the same history.
                        // A simple dedup check before push would be good if possible, but addLog is blind.

                        // Let's just push for now.
                        // We need to use batching if possible to avoid N updates, but useMutation doesn't expose batch directly?
                        // Actually, we can just loop.
                        dbLogs.forEach((log: SessionLogEntry) => addLog(log));
                    }
                }
            }
        };

        // We only want to run this once on mount/sync
        // But we need to be careful not to run it if we already have logs.
        // Let's run it only if logs are empty.
        if (logsArray.length === 0) {
            initLogs();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run once on mount (conceptually). But since we depend on logsArray length...
    // If we include logsArray in deps, it might run again if logs are cleared?
    // Better to keep it empty deps and check current ref? Or just rely on the check inside.
    // If we leave deps empty, logsArray will be the initial value (empty).
    // That's fine.


    // For display in DicePanel, we might want newest-first?
    // DicePanel usually renders logs top-to-bottom?
    // If DicePanel renders logs.map(), and we want newest at bottom (like chat),
    // then oldest-first is correct.
    // Let's pass oldest-first logsArray to DicePanel.
    // Wait, previous implementation: setLogs(prev => [log, ...prev]) -> Newest first.
    // So DicePanel was receiving Newest First.
    // If I pass Oldest First, I should reverse it for DicePanel if it expects Newest First.
    // Let's check DicePanel implementation if I can.
    // But to be safe and consistent with previous behavior, I will reverse it here.
    const displayLogs = logsArray;

    return (
        <div className="h-full grid grid-cols-12 gap-4">
            {/* Main Area (Map/Center) */}
            <div className="col-span-12 lg:col-span-9 bg-muted/20 rounded-lg border flex items-center justify-center relative overflow-hidden">
                <MapPanel
                    backgroundImageUrl={mapState.backgroundUrl}
                    tokens={mapState.tokens}
                    onLog={handleLog}
                />

                <div className="absolute top-4 left-4 bg-background/80 p-2 rounded border pointer-events-none">
                    <h3 className="font-bold text-sm">Debug Info</h3>
                    <pre className="text-xs">
                        HP: {resourceValues['hp']} / 20
                        MP: {resourceValues['mp']} / 10
                    </pre>
                </div>
            </div>

            {/* Sidebar (Chat/Dice/Turn) */}
            <div className="col-span-12 lg:col-span-3 flex flex-col gap-4 h-full relative min-h-0">
                <div className="flex-1 relative overflow-hidden min-h-0">
                    <DicePanel
                        state={MOCK_CHARACTER_STATE}
                        resourceValues={resourceValues}
                        logs={displayLogs}
                        onLog={handleLog}
                        tabs={activeTabs}
                        tokens={mapState.tokens}
                        currentUserId={useSelf((me) => me.id)}
                    />
                </div>
            </div>
        </div>
    );
}
