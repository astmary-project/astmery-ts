export interface SessionParticipant {
    id: string; // UUID (Instance ID)
    type: 'linked' | 'extra';
    name: string; // Display Name (e.g. "Goblin A")
    avatarUrl?: string;

    // Reference to the Source Data (Template)
    characterId?: string;

    // Instance State (Snapshot + Volatile)
    // This allows 1 Character Sheet -> N Participants (Goblin A, Goblin B)
    // Each has its own HP/MP.
    state: {
        hp: { current: number; max: number; initial?: number };
        mp: { current: number; max: number; initial?: number };
        initiative: number;
        resources: { id: string; name: string; current: number; max: number; initial: number }[];
        nextAction?: string | null;
        pendingAction?: {
            description: string;
            cost: number;
        } | null;
    };

    isVisible: boolean; // For GM to hide NPCs
}
