import { DiceRoll } from '../../character/domain/CharacterLog';

export type SessionLogType =
    | 'UPDATE_RESOURCE' // Resource update (HP/MP etc)
    | 'RESET_RESOURCES' // Reset all resources
    | 'ROLL'; // Dice roll

export interface SessionLogEntry {
    id: string;
    type: SessionLogType;
    timestamp: number;
    description?: string;

    // For UPDATE_RESOURCE
    resourceUpdate?: {
        resourceId: string;
        type: 'set' | 'modify' | 'reset';
        value?: number;
        resetTarget?: 'initial' | 'max';
    };

    // For ROLL
    diceRoll?: DiceRoll;
}
