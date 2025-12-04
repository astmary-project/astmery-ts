import { RollResult } from '@/domain/dice/DiceRoller';

export type SessionLogType =
    | 'UPDATE_RESOURCE' // Resource update (HP/MP etc)
    | 'RESET_RESOURCES' // Reset all resources
    | 'ROLL' // Dice roll
    | 'CHAT' // Chat message
    | 'SYSTEM' // System message
    | 'ADD_TAB' // Add a new tab
    | 'REMOVE_TAB' // Remove a tab
    | 'UPDATE_MAP_BACKGROUND' // Update map background
    | 'UPDATE_STATIC_BACKGROUND' // Update static background (fixed wallpaper)
    | 'ADD_TOKEN' // Add a token to the map
    | 'REMOVE_TOKEN' // Remove a token from the map
    | 'MOVE_TOKEN' // Move a token on the map
    | 'UPDATE_TOKEN' // Update token properties (size, image, etc)
    | 'ADD_PARTICIPANT' // Add a participant to the roster
    | 'REMOVE_PARTICIPANT' // Remove a participant from the roster
    | 'UPDATE_PARTICIPANT' // Update a participant's state
    | 'ADD_SCREEN_PANEL' // Add a screen panel
    | 'UPDATE_SCREEN_PANEL' // Update a screen panel
    | 'REMOVE_SCREEN_PANEL' // Remove a screen panel
    | 'UPDATE_BGM'; // Update background music

export interface MapToken {
    id: string;
    x: number;
    y: number;
    creatorId: string;
    label?: string;
    imageUrl?: string;
    size?: number; // Size in grid units (default 1)
    name?: string; // Added for display name
    participantId?: string; // Link to roster participant
}

export interface ScreenPanel {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    zIndex: number;
    imageUrl: string;
    backImageUrl?: string;
    memo?: string;
    visibility: 'all' | 'owner' | 'others' | 'none';
    ownerId: string;
}

export interface SessionLogEntry {
    id: string;
    type: SessionLogType;
    timestamp: number;
    description?: string;
    channel?: string; // Default 'main'
    visibleTo?: string[]; // If present, only visible to these user IDs

    // For ADD_TAB / REMOVE_TAB
    tabId?: string | null;
    tabName?: string | null;

    // For UPDATE_MAP_BACKGROUND
    mapBackground?: {
        url: string;
        width?: number;
        height?: number;
    } | null;

    // For UPDATE_STATIC_BACKGROUND
    staticBackground?: {
        url: string;
    } | null;

    // For ADD_TOKEN / REMOVE_TOKEN / MOVE_TOKEN / UPDATE_TOKEN
    token?: MapToken | null;

    // For ADD_SCREEN_PANEL / UPDATE_SCREEN_PANEL / REMOVE_SCREEN_PANEL
    screenPanel?: ScreenPanel | null;

    // For ADD_PARTICIPANT / REMOVE_PARTICIPANT / UPDATE_PARTICIPANT
    // We need to import SessionParticipant, but circular imports might be an issue if we import from SessionRoster.
    // So we'll define a compatible shape or use 'any' for now, or move SessionParticipant here.
    // Actually, let's move SessionParticipant to a shared place or just define the payload shape here.
    participant?: {
        id: string;
        type: 'linked' | 'extra';
        name: string;
        avatarUrl?: string;
        characterId?: string;
        state: {
            hp: { current: number; max: number };
            mp: { current: number; max: number };
            initiative: number;
            nextAction?: string | null;
            pendingAction?: {
                description: string;
                cost: number;
            } | null;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            [key: string]: any;
        };
        isVisible: boolean;
    } | null;

    // For UPDATE_RESOURCE
    resourceUpdate?: {
        resourceId: string;
        type: 'set' | 'modify' | 'reset';
        value?: number | string; // Allow string for expressions
        resetTarget?: 'initial' | 'max';
    } | null;

    // For ROLL
    diceRoll?: RollResult | null;

    // For CHAT
    chatMessage?: {
        sender: string;
        content: string;
        avatarUrl?: string; // Added avatarUrl
    } | null;

    // For UPDATE_BGM
    bgm?: {
        url: string;
        title: string;
        volume: number;
        isPlaying: boolean;
        isLoop: boolean;
    } | null;

    // Index signature for JSON compatibility
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
}
