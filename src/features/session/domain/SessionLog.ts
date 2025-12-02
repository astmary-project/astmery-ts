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
    | 'ADD_TOKEN' // Add a token to the map
    | 'REMOVE_TOKEN' // Remove a token from the map
    | 'MOVE_TOKEN'; // Move a token on the map

export interface MapToken {
    id: string;
    x: number;
    y: number;
    creatorId: string;
    label?: string;
    imageUrl?: string;
    size?: number; // Size in grid units (default 1)
    name?: string; // Added for display name
}

export interface SessionLogEntry {
    id: string;
    type: SessionLogType;
    timestamp: number;
    description?: string;
    channel?: string; // Default 'main'

    // For ADD_TAB / REMOVE_TAB
    tabId?: string | null;
    tabName?: string | null;

    // For UPDATE_MAP_BACKGROUND
    mapBackground?: {
        url: string;
    } | null;

    // For ADD_TOKEN / REMOVE_TOKEN / MOVE_TOKEN
    token?: MapToken | null;

    // For UPDATE_RESOURCE
    resourceUpdate?: {
        resourceId: string;
        type: 'set' | 'modify' | 'reset';
        value?: number;
        resetTarget?: 'initial' | 'max';
    } | null;

    // For ROLL
    diceRoll?: RollResult | null;

    // For CHAT
    chatMessage?: {
        sender: string;
        content: string;
    } | null;

    // Index signature for JSON compatibility
    [key: string]: any;
}
