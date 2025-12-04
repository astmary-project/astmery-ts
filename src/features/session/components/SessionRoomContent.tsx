'use client';

import { DiceRoller } from '@/domain/dice/DiceRoller';
import { CharacterCalculator } from '@/features/character/domain/CharacterCalculator';
import { CharacterData } from '@/features/character/domain/repository/ICharacterRepository';
import { useMutation, useSelf, useStorage } from '@/liveblocks.config';
import { useEffect, useState } from 'react';
import { CharacterState } from '../../character';
import { getCharactersStats } from '../actions/character';
import { getLogs, saveLog } from '../actions/session';
import { MapToken, ScreenPanel, SessionLogEntry } from '../domain/SessionLog';
import { SessionParticipant } from '../domain/SessionRoster';
import { DicePanel } from './DicePanel';
import { MapPanel } from './MapPanel';
import { RosterPanel } from './RosterPanel';

// Mock initial state for testing
const MOCK_CHARACTER_STATE: CharacterState = {
    stats: {
        'Body': 10,
        'Spirit': 10,
        'Combat': 0,
        'Science': 0,
        'Magic': 0,
        'SpellKnowledge': 0,
        'ActionSpeed': 13, // Grade(10) + 3
        'DamageDice': 2, // ceil(Grade(10)/5)
        'Grade': 10,
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

    // Mutation to update log
    const updateLog = useMutation(({ storage }, logId: string, content: string) => {
        const logs = storage.get('logs');
        const index = logs.findIndex(l => l.id === logId);
        if (index !== -1) {
            const log = logs.get(index);
            if (log && log.type === 'CHAT' && log.chatMessage) {
                logs.set(index, {
                    ...log,
                    chatMessage: {
                        ...log.chatMessage,
                        content: content
                    }
                });
            }
        }
    }, []);

    // Mutation to delete log
    const deleteLog = useMutation(({ storage }, logId: string) => {
        const logs = storage.get('logs');
        const index = logs.findIndex(l => l.id === logId);
        if (index !== -1) {
            logs.delete(index);
        }
    }, []);

    const logsArray = logs ? Array.from(logs) : [];

    // Derive resource values (Legacy support for debug info, can be removed later)
    const resourceValues = logsArray.reduce((acc, log) => {
        if (log.type === 'UPDATE_RESOURCE' && log.resourceUpdate) {
            const { resourceId, type, value, resetTarget } = log.resourceUpdate;
            const current = acc[resourceId] ?? 0;
            let next = current;

            // Simple parsing for legacy debug display (no complex formula eval here)
            const numValue = typeof value === 'number' ? value : parseFloat(value || '0');
            const safeValue = isNaN(numValue) ? 0 : numValue;

            if (type === 'set' && value !== undefined) next = safeValue;
            if (type === 'modify' && value !== undefined) next = current + safeValue;
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

    // Derive Roster State
    const participants = logsArray.reduce((acc, log: SessionLogEntry) => {
        if (log.type === 'ADD_PARTICIPANT' && log.participant) {
            acc.push(log.participant as SessionParticipant);
        } else if (log.type === 'REMOVE_PARTICIPANT' && log.participant && log.participant.id) {
            return acc.filter(p => p.id !== log.participant!.id);
        } else if (log.type === 'UPDATE_PARTICIPANT' && log.participant && log.participant.id) {
            const index = acc.findIndex(p => p.id === log.participant!.id);
            if (index !== -1) {
                // Merge state carefully to preserve resources if not in update
                const update = log.participant as Partial<SessionParticipant>;
                acc[index] = {
                    ...acc[index],
                    ...update,
                    state: {
                        ...acc[index].state,
                        ...(update.state || {})
                    }
                };
            }
        }
        return acc;
    }, [] as SessionParticipant[]);

    // Derive Map State
    const mapState = logsArray.reduce((acc, log: SessionLogEntry) => {
        if (log.type === 'UPDATE_MAP_BACKGROUND' && log.mapBackground) {
            acc.backgroundUrl = log.mapBackground.url;
            acc.backgroundWidth = log.mapBackground.width;
            acc.backgroundHeight = log.mapBackground.height;
        } else if (log.type === 'UPDATE_STATIC_BACKGROUND' && log.staticBackground) {
            acc.staticBackgroundUrl = log.staticBackground.url;
        } else if (log.type === 'ADD_TOKEN' && log.token) {
            acc.tokens.push(log.token as MapToken);
        } else if (log.type === 'REMOVE_TOKEN' && log.token && (log.token as MapToken).id) {
            acc.tokens = acc.tokens.filter(t => t.id !== (log.token as MapToken).id);
        } else if (log.type === 'MOVE_TOKEN' && log.token && (log.token as MapToken).id) {
            const tokenIndex = acc.tokens.findIndex(t => t.id === (log.token as MapToken).id);
            if (tokenIndex !== -1) {
                acc.tokens[tokenIndex] = { ...acc.tokens[tokenIndex], ...(log.token as MapToken) };
            }
        } else if (log.type === 'UPDATE_TOKEN' && log.token && (log.token as MapToken).id) {
            const tokenIndex = acc.tokens.findIndex(t => t.id === (log.token as MapToken).id);
            if (tokenIndex !== -1) {
                acc.tokens[tokenIndex] = { ...acc.tokens[tokenIndex], ...(log.token as MapToken) };
            }
        } else if (log.type === 'ADD_SCREEN_PANEL' && log.screenPanel) {
            acc.screenPanels.push(log.screenPanel as ScreenPanel);
        } else if (log.type === 'REMOVE_SCREEN_PANEL' && log.screenPanel && (log.screenPanel as ScreenPanel).id) {
            acc.screenPanels = acc.screenPanels.filter(p => p.id !== (log.screenPanel as ScreenPanel).id);
        } else if (log.type === 'UPDATE_SCREEN_PANEL' && log.screenPanel && (log.screenPanel as ScreenPanel).id) {
            const panelIndex = acc.screenPanels.findIndex(p => p.id === (log.screenPanel as ScreenPanel).id);
            if (panelIndex !== -1) {
                acc.screenPanels[panelIndex] = { ...acc.screenPanels[panelIndex], ...(log.screenPanel as ScreenPanel) };
            }
        }
        return acc;
    }, {
        backgroundUrl: undefined as string | undefined,
        backgroundWidth: undefined as number | undefined,
        backgroundHeight: undefined as number | undefined,
        staticBackgroundUrl: undefined as string | undefined,
        tokens: [] as MapToken[],
        screenPanels: [] as ScreenPanel[]
    });

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
        saveLog(roomId, log).then(result => {
            if (!result.success) {
                console.error('Failed to persist log:', result.error);
            }
        });
    };

    const handleAddLinked = (character: CharacterData) => {
        // Calculate initial state from character logs
        const state = CharacterCalculator.calculateState(character.logs);

        // Extract HP/MP/Initiative
        // Note: Resources might have different IDs, but we assume standard 'hp'/'mp' or 'HP'/'MP' exist or are derived.
        // We look for resources with id 'hp' or 'HP' (case insensitive if needed, but IDs are usually specific)
        const hpRes = state.resources.find(r => r.id.toLowerCase() === 'hp');
        const mpRes = state.resources.find(r => r.id.toLowerCase() === 'mp');
        const initiative = 0; // Start at 0 per user request

        // Filter out HP/MP from other resources to avoid duplication in display
        const otherResources = state.resources
            .filter(r => r.id.toLowerCase() !== 'hp' && r.id.toLowerCase() !== 'mp')
            .map(r => ({
                id: r.id,
                name: r.name,
                current: r.initial, // Start at initial
                max: r.max,
                initial: r.initial
            }));

        const newParticipant: SessionParticipant = {
            id: crypto.randomUUID(),
            type: 'linked',
            name: character.name,
            avatarUrl: character.profile?.avatarUrl,
            characterId: character.id,
            state: {
                hp: {
                    current: hpRes ? hpRes.max : 0, // Start at Max
                    max: hpRes ? hpRes.max : 0,
                    initial: hpRes ? (hpRes.initial ?? hpRes.max) : 0
                },
                mp: {
                    current: mpRes ? mpRes.max : 0, // Start at Max
                    max: mpRes ? mpRes.max : 0,
                    initial: mpRes ? (mpRes.initial ?? mpRes.max) : 0
                },
                initiative: initiative,
                resources: otherResources
            },
            isVisible: true
        };

        handleLog({
            id: crypto.randomUUID(),
            type: 'ADD_PARTICIPANT',
            timestamp: Date.now(),
            participant: newParticipant,
            description: `Added character: ${character.name}`
        });
    };

    const handleAddExtra = (name: string) => {
        const newParticipant: SessionParticipant = {
            id: crypto.randomUUID(),
            type: 'extra',
            name: name,
            state: {
                hp: { current: 0, max: 0 },
                mp: { current: 0, max: 0 },
                initiative: 0,
                resources: []
            },
            isVisible: true
        };

        handleLog({
            id: crypto.randomUUID(),
            type: 'ADD_PARTICIPANT',
            timestamp: Date.now(),
            participant: newParticipant,
            description: `Added extra: ${name}`
        });
    };

    const handleRemoveParticipant = (id: string) => {
        const participant = participants.find(p => p.id === id);
        if (!participant) return;

        if (confirm(`Are you sure you want to remove ${participant.name} from the roster?`)) {
            handleLog({
                id: crypto.randomUUID(),
                type: 'REMOVE_PARTICIPANT',
                timestamp: Date.now(),
                participant: { ...participant }, // Pass full object or just ID if type allows, but log expects object
                description: `Removed ${participant.name}`
            });
        }
    };

    const handleUpdateParticipant = (participant: SessionParticipant) => {
        handleLog({
            id: crypto.randomUUID(),
            type: 'UPDATE_PARTICIPANT',
            timestamp: Date.now(),
            participant: participant,
            description: `Updated ${participant.name}`
        });
    };

    const handleStartCombat = () => {
        if (!confirm('Start Combat? This will reset all initiative to 0.')) return;

        participants.forEach(p => {
            if (p.state.initiative !== 0 || p.state.nextAction || p.state.pendingAction) {
                handleLog({
                    id: crypto.randomUUID(),
                    type: 'UPDATE_PARTICIPANT',
                    timestamp: Date.now(),
                    participant: {
                        ...p,
                        state: {
                            ...p.state,
                            initiative: 0,
                            nextAction: null,
                            pendingAction: null
                        }
                    },
                    description: `Reset Initiative & Actions for ${p.name}`
                });
            }
        });
    };

    const handleNextRound = async () => {
        // 1. Identify linked participants
        const linkedIds = participants
            .filter(p => p.type === 'linked' && p.characterId)
            .map(p => p.characterId!);

        // 2. Fetch stats
        const statsMap = await getCharactersStats(linkedIds);

        // 3. Update each participant
        participants.forEach(p => {
            let actionSpeed = 0;
            if (p.type === 'linked' && p.characterId) {
                const charState = statsMap[p.characterId];
                if (charState) {
                    actionSpeed = charState.derivedStats['ActionSpeed'] ?? charState.stats['ActionSpeed'] ?? 0;
                }
            }
            // For extras, we assume 0 Action Speed for now

            // Roll 2d6
            const rollResult = DiceRoller.roll('2d6', { stats: {}, derivedStats: {} });
            const roll = rollResult.isSuccess ? rollResult.value.total : 0;
            const added = actionSpeed + roll;
            const newInit = p.state.initiative + added;

            handleLog({
                id: crypto.randomUUID(),
                type: 'UPDATE_PARTICIPANT',
                timestamp: Date.now(),
                participant: {
                    ...p,
                    state: { ...p.state, initiative: newInit }
                },
                description: `Next Round: ${p.name} Init +${added} (${actionSpeed}+${roll})`
            });
        });
    };

    // Hydrate logs from Supabase if Liveblocks is empty (Initial load / Room revival)
    useEffect(() => {
        const initLogs = async () => {
            if (logsArray.length === 0) {
                const result = await getLogs(roomId);
                if (result.success) {
                    const dbLogs = result.data;
                    if (dbLogs.length > 0) {
                        dbLogs.forEach((log: SessionLogEntry) => addLog(log));
                    }
                }
            }
        };

        if (logsArray.length === 0) {
            initLogs();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const displayLogs = logsArray;

    const [selectedTokenId, setSelectedTokenId] = useState<string>('self');

    return (
        <div className="relative w-full h-full overflow-hidden bg-muted/20">
            {/* Layer 1: Full Screen Map */}
            <div className="absolute inset-0 z-0">
                <MapPanel
                    backgroundImageUrl={mapState.backgroundUrl}
                    backgroundWidth={mapState.backgroundWidth}
                    backgroundHeight={mapState.backgroundHeight}
                    staticBackgroundImageUrl={mapState.staticBackgroundUrl}
                    tokens={mapState.tokens}
                    screenPanels={mapState.screenPanels}
                    onLog={handleLog}
                    selectedTokenId={selectedTokenId}
                    onSelectToken={setSelectedTokenId}
                />
            </div>

            {/* Layer 2: UI Overlays (Pointer events handled by children) */}
            <div className="absolute inset-0 z-10 pointer-events-none p-4 flex justify-between items-start">

                {/* Left: Roster & Debug Info */}
                <div className="flex flex-col gap-4 h-full pointer-events-auto w-64">
                    <div className="bg-background/80 backdrop-blur-md p-3 rounded-lg border shadow-lg hidden">
                        {/* Debug Info Hidden for now */}
                        <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground mb-1">Debug Info</h3>
                        <div className="flex gap-4 text-sm font-mono">
                            <div className="flex flex-col">
                                <span className="text-[10px] text-muted-foreground">HP</span>
                                <span className="font-bold text-green-600">{resourceValues['hp']} <span className="text-muted-foreground/50">/ 20</span></span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] text-muted-foreground">MP</span>
                                <span className="font-bold text-blue-600">{resourceValues['mp']} <span className="text-muted-foreground/50">/ 10</span></span>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 min-h-0">
                        <RosterPanel
                            participants={participants}
                            onAddExtra={handleAddExtra}
                            onAddLinked={handleAddLinked}
                            onRemove={handleRemoveParticipant}
                            onUpdate={handleUpdateParticipant}
                            onStartCombat={handleStartCombat}
                            onNextRound={handleNextRound}
                        />
                    </div>
                </div>

                {/* Right: Chat & Dice */}
                <div className="h-full pointer-events-auto w-80 lg:w-96">
                    <div className="h-full bg-background/50 rounded-xl border shadow-sm backdrop-blur-sm overflow-hidden">
                        <DicePanel
                            state={MOCK_CHARACTER_STATE}
                            resourceValues={resourceValues}
                            logs={displayLogs}
                            onLog={handleLog}
                            tabs={activeTabs}
                            tokens={mapState.tokens}
                            participants={participants}
                            currentUserId={useSelf((me) => me.id)}
                            currentUserName={useSelf((me) => me.info.name)}
                            selectedTokenId={selectedTokenId}
                            onSelectToken={setSelectedTokenId}
                            onUpdateLog={updateLog}
                            onDeleteLog={deleteLog}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
