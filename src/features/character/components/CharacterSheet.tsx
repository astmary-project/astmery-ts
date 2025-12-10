import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';

import { DicePanel, SessionLogEntry } from '../../session';
import { CharacterEvent } from '../domain/Event';
import { InventoryItem as Item } from '../domain/Item';
import { CharacterState } from '../domain/models';
import { SkillEntity as Skill } from '../domain/Skill';
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
    events: CharacterEvent[];
    onAddEvent: (event: Omit<CharacterEvent, 'id' | 'timestamp'>) => void;
    onNameChange?: (name: string) => void;
    onAvatarChange?: (url: string) => void;
    onDeleteEvent: (eventId: string) => void;
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
    onAddTag?: (tag: string) => void;
    onRemoveTag?: (tag: string) => void;
}

export function CharacterSheet({
    name,
    character,
    state,
    events,
    onAddEvent,
    onDeleteEvent,
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
    onAddTag,
    onRemoveTag,
}: CharacterSheetProps) {
    // State
    const [localIsEditMode, setLocalIsEditMode] = useState(false);

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

    // Helper for quick rolls
    const onRoll = (formula: string, description?: string) => {
        performRoll(formula, displayState, description);
    };

    // Handle Stat Growth
    const handleStatGrowth = (key: string, cost: number) => {
        if (state.exp.free < cost) {
            return;
        }

        onAddEvent({
            type: 'STAT_GROWN',
            key,
            delta: 1,
            cost,
            description: `Increased ${key} by 1 (Cost: ${cost} EXP)`
        } as any);
    };

    // Handle Skill Actions
    const handleAddSkill = (skill: Skill, cost?: number) => {
        onAddEvent({
            type: 'SKILL_LEARNED',
            skill,
            acquisitionMethod: 'Standard',
            description: `Learned skill: ${skill.name}`,
            cost: cost
        } as any);
    };

    const handleUpdateSkill = (skill: Skill) => {
        if (skill.category === 'PASSIVE') {
            // Need to know skillId. SkillEntity has id.
            onAddEvent({
                type: 'SKILL_UPDATED',
                skillId: skill.id, // Ensure SkillEntity has id
                newSkill: skill,
                description: `Updated skill: ${skill.name}`
            } as any);
        } else {
            onAddEvent({
                type: 'SKILL_UPDATED',
                skillId: skill.id,
                newSkill: skill,
                description: `Updated skill: ${skill.name}`
            } as any);
        }
    };

    // Handle Item Actions
    const handleAddItem = (item: Item) => {
        onAddEvent({
            type: 'ITEM_ADDED',
            item,
            source: 'EVENT',
            description: `Added item: ${item.name}`
        } as any);
        // Auto-equip if equipment? Or let user do it explicitly?
        // Old behavior was EQUIP added it to equipment list.
        // If it's equipment, we probably want to EQUIP it too?
        // But the log is discrete. The EquipmentPanel usually handles "Add Item" which implies possession + equip used to be same.
        // For compatibility with "Equipment Panel adding an item", we might want to Add AND Equip.
        // But onAddLog takes single log.
        // Let's just Add for now. User can equip in UI if we have UI for it.
        // IF EquipmentPanel expects it to show up, it must be in `state.equipmentSlots`.
        // `CharacterCalculator` puts `ITEM_ADDED` into `inventory`.
        // To put into `equipmentSlots`, we need `ITEM_EQUIPPED`.
        // Modifying handler to assume EquipmentPanel adds are 'Add + Equip' logic?
        // But we can't emit two logs here synchronously easily without array.
        // Revisit logic: `CharacterCalculator` Line 367 (ITEM_ADDED) -> state.inventory.push.
        // If we want it equipped, we need to dispatch ITEM_EQUIPPED too.
        // Or we decide "Added Equipment" implies equipped? 
        // No, strict Separation.
        // For now, I'll stick to ITEM_ADDED.
    };

    const handleUpdateItem = (item: Item) => {
        onAddEvent({
            type: 'ITEM_UPDATED',
            itemId: item.id,
            newItemState: item,
            description: `Updated item: ${item.name}`
        } as any);
    };

    const handleAddTag = (tag: string) => {
        // Tag added to profile via external handler usually, but if log based:
        // There is no ADD_TAG event anymore!
        // onAddTag prop is passed from page.tsx which calls `updateProfile`.
        if (onAddTag) onAddTag(tag);
    };

    const handleRemoveTag = (tag: string) => {
        if (onRemoveTag) onRemoveTag(tag);
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
                <div className="lg:col-span-8 space-y-6">
                    <Tabs defaultValue="status" className="w-full">
                        <TabsList className="grid w-full grid-cols-5">
                            <TabsTrigger value="status">ステータス</TabsTrigger>
                            <TabsTrigger value="skills">スキル</TabsTrigger>
                            <TabsTrigger value="equipment">装備</TabsTrigger>
                            <TabsTrigger value="bio">設定・Bio</TabsTrigger>
                            <TabsTrigger value="history">履歴</TabsTrigger>
                        </TabsList>

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
                                tags={state.tags} // Set -> Array? New state.tags is Array.
                                isEditMode={isEditMode}
                                onAddTag={handleAddTag}
                                onRemoveTag={handleRemoveTag}
                            />
                        </TabsContent>

                        <TabsContent value="skills">
                            <SkillsPanel
                                state={state}
                                onAddLog={onAddEvent}
                                onRoll={onRoll}
                                isEditMode={isEditMode}
                                onAddSkill={handleAddSkill}
                                onUpdateSkill={handleUpdateSkill}
                            />
                        </TabsContent>

                        <TabsContent value="equipment">
                            <EquipmentPanel
                                state={state}
                                onAddLog={onAddEvent}
                                onRoll={onRoll}
                                isEditMode={isEditMode}
                                onAddItem={handleAddItem}
                                onUpdateItem={handleUpdateItem}
                            />
                        </TabsContent>

                        <TabsContent value="bio">
                            <BioPanel
                                bio={character?.bio}
                                tags={state.tags}
                                isEditMode={isEditMode}
                                onUpdateBio={(bio) => onUpdateProfile?.({ bio })}
                                onAddTag={handleAddTag}
                                onRemoveTag={handleRemoveTag}
                                onDeleteCharacter={onDeleteCharacter}
                            />
                        </TabsContent>

                        <TabsContent value="history">
                            <HistoryPanel
                                events={events}
                                onAddEvent={onAddEvent}
                                onDeleteEvent={onDeleteEvent}
                                isEditMode={isEditMode}
                            />
                        </TabsContent>
                    </Tabs>
                </div>

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
