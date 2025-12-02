import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEffect, useState } from 'react';

import { DicePanel, SessionLogEntry } from '../../session';
import { CharacterLogEntry, CharacterState, Item, Skill } from '../domain/CharacterLog';
import { useCharacterDisplayState } from '../hooks/useCharacterDisplayState';
import { useCharacterSession } from '../hooks/useCharacterSession';
import { CharacterHeader } from './CharacterHeader';
import { BioPanel } from './sheet/BioPanel';
import { EquipmentPanel } from './sheet/EquipmentPanel';
import { HistoryPanel } from './sheet/HistoryPanel';
import { ResourcePanel } from './sheet/ResourcePanel';
import { SkillsPanel } from './sheet/SkillsPanel';
import { StatsPanel } from './sheet/StatsPanel';

interface CharacterSheetProps {
    name: string;
    character?: {
        avatarUrl?: string;
        bio?: string;
        specialtyElements?: string[];
    };
    state: CharacterState;
    logs: CharacterLogEntry[];
    onAddLog: (log: Omit<CharacterLogEntry, 'id' | 'timestamp'>) => void;
    onNameChange?: (name: string) => void;
    onAvatarChange?: (url: string) => void;
    onDeleteLog: (logId: string) => void;
    isEditMode?: boolean;
    onToggleEditMode?: () => void;
    onUpdateProfile?: (profile: Partial<{ bio: string; specialtyElements: string[] }>) => void;
    initialLogs: SessionLogEntry[];
    onSave?: (logs: SessionLogEntry[]) => Promise<void>;
    currentUserId?: string;
    ownerId?: string;
    ownerName?: string;
    characterId?: string;
    isAdmin?: boolean;
    onDeleteCharacter?: () => void;
}
export function CharacterSheet({
    name,
    character,
    state,
    logs,
    onAddLog,
    onDeleteLog,
    onNameChange,
    onAvatarChange,
    onUpdateProfile,

    currentUserId,
    ownerId,
    ownerName,
    characterId,
    isAdmin,
    onDeleteCharacter,
    isEditMode: propIsEditMode,
    onToggleEditMode,
}: CharacterSheetProps) {
    // State
    // const [logs, setLogs] = useState<SessionLogEntry[]>(initialLogs); // Removed to avoid shadowing and use prop
    const [localIsEditMode, setLocalIsEditMode] = useState(false);
    // const [activeTab, setActiveTab] = useState("status");

    const isEditMode = propIsEditMode !== undefined ? propIsEditMode : localIsEditMode;

    const handleEditModeChange = (value: boolean) => {
        if (onToggleEditMode) {
            onToggleEditMode();
        } else {
            setLocalIsEditMode(value);
        }
    };

    // Ownership check
    const canEdit = (!!currentUserId && !!ownerId && currentUserId === ownerId) || !!isAdmin;

    // Force disable edit mode if not owner
    useEffect(() => {
        if (!canEdit && isEditMode) {
            if (onToggleEditMode) {
                // Defer to avoid set-state-in-effect
                setTimeout(() => onToggleEditMode(), 0);
            } else {
                setTimeout(() => setLocalIsEditMode(false), 0);
            }
        }
    }, [canEdit, isEditMode, onToggleEditMode]);

    // Ephemeral State & Logic (Session Scope)
    const {
        resourceValues,
        logs: sessionLogs,
        handleLog,
        performRoll
    } = useCharacterSession(state);

    // Calculate Display State (Reactive to Resource Changes)
    const displayState = useCharacterDisplayState(state, resourceValues);

    // Helper for quick rolls (Wrapped for components)
    const onRoll = (formula: string, description?: string) => {
        performRoll(formula, displayState, description);
    };

    // Handle Stat Growth
    const handleStatGrowth = (key: string, cost: number) => {
        // 1. Check if enough EXP
        if (state.exp.free < cost) {
            // Should be handled by UI, but double check
            return;
        }

        // 2. Add Log for Stat Growth
        onAddLog({
            type: 'GROW_STAT',
            statGrowth: {
                key,
                value: 1, // Always +1 for now
                cost
            },
            description: `Increased ${key} by 1 (Cost: ${cost} EXP)`,
            cost: cost // Include root cost
        });
    };

    // Handle Skill Actions
    const handleAddSkill = (skill: Skill, cost?: number) => {
        onAddLog({
            type: 'LEARN_SKILL',
            skill,
            description: `Learned skill: ${skill.name}`,
            cost: cost
        });
    };

    const handleUpdateSkill = (skill: Skill) => {
        onAddLog({
            type: 'UPDATE_SKILL',
            skill,
            description: `Updated skill: ${skill.name}`
        });
    };

    // Handle Item Actions
    const handleAddItem = (item: Item) => {
        onAddLog({
            type: 'EQUIP',
            item,
            description: `Equipped item: ${item.name}`
        });
    };

    const handleUpdateItem = (item: Item) => {
        onAddLog({
            type: 'UPDATE_ITEM',
            item,
            description: `Updated item: ${item.name}`
        });
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6">
            <CharacterHeader
                character={state}
                name={name}
                profile={character}
                isEditMode={isEditMode}
                onEditModeChange={handleEditModeChange}
                onAvatarChange={onAvatarChange}
                canEdit={canEdit}
                onGrow={handleStatGrowth}
                onNameChange={onNameChange}
                ownerName={ownerName}
                characterId={characterId}
            />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column: Character Sheet (8 cols) */}
                <div className="lg:col-span-8 space-y-6">
                    <Tabs defaultValue="status" className="w-full">
                        <TabsList className="grid w-full grid-cols-5">
                            <TabsTrigger value="status">ステータス</TabsTrigger>
                            <TabsTrigger value="skills">スキル</TabsTrigger>
                            <TabsTrigger value="equipment">装備</TabsTrigger>
                            <TabsTrigger value="bio">設定・Bio</TabsTrigger>
                            <TabsTrigger value="history">履歴</TabsTrigger>
                        </TabsList>

                        {/* Status Tab */}
                        <TabsContent value="status" className="space-y-4">
                            <StatsPanel
                                state={state}
                                displayState={displayState}
                                onRoll={onRoll}
                                isEditMode={isEditMode}
                                onGrow={handleStatGrowth}
                            />
                            <ResourcePanel
                                state={state}
                                resourceValues={resourceValues}
                                tags={state.tags}
                                isEditMode={isEditMode}
                                onAddTag={(tag) => onAddLog({ type: 'ADD_TAG', tagId: tag, description: `Added tag: ${tag}` })}
                                onRemoveTag={(tag) => onAddLog({ type: 'REMOVE_TAG', tagId: tag, description: `Removed tag: ${tag}` })}
                            />
                        </TabsContent>

                        {/* Skills Tab */}
                        <TabsContent value="skills">
                            <SkillsPanel
                                state={state}
                                onAddLog={onAddLog}
                                onRoll={onRoll}
                                isEditMode={isEditMode}
                                onAddSkill={handleAddSkill}
                                onUpdateSkill={handleUpdateSkill}
                            />
                        </TabsContent>

                        {/* Equipment Tab */}
                        <TabsContent value="equipment">
                            <EquipmentPanel
                                state={state}
                                onAddLog={onAddLog}
                                onRoll={onRoll}
                                isEditMode={isEditMode}
                                onAddItem={handleAddItem}
                                onUpdateItem={handleUpdateItem}
                            />
                        </TabsContent>

                        {/* Bio Tab */}
                        <TabsContent value="bio">
                            <BioPanel
                                bio={character?.bio}
                                tags={state.tags}
                                isEditMode={isEditMode}
                                onUpdateBio={(bio) => onUpdateProfile?.({ bio })}
                                onAddTag={(tag) => onAddLog({ type: 'ADD_TAG', tagId: tag, description: `Added tag: ${tag}` })}
                                onRemoveTag={(tag) => onAddLog({ type: 'REMOVE_TAG', tagId: tag, description: `Removed tag: ${tag}` })}
                                onDeleteCharacter={onDeleteCharacter}
                            />
                        </TabsContent>

                        {/* History Tab */}
                        <TabsContent value="history">
                            <HistoryPanel
                                logs={logs}
                                onAddLog={onAddLog}
                                onDeleteLog={onDeleteLog}
                                isEditMode={isEditMode}
                            />
                        </TabsContent>
                    </Tabs>
                </div>

                {/* Right Column: Tools (4 cols) */}
                <div className="lg:col-span-4 space-y-6">
                    <DicePanel
                        state={state}
                        resourceValues={resourceValues}
                        logs={sessionLogs}
                        onLog={handleLog}
                        currentUserId={currentUserId}
                        fixedIdentity={{ id: characterId || 'temp', name: name }}
                        className="h-[600px]"
                    />
                </div>
            </div>
        </div>
    );
};
