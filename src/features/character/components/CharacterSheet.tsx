import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEffect, useMemo, useState } from 'react';

import { DicePanel, DiceRoller, RollResult, SessionLogEntry } from '../../session';
import { CharacterCalculator } from '../domain/CharacterCalculator';
import { CharacterLogEntry, CharacterState, Item, Skill } from '../domain/CharacterLog';
import { JAPANESE_TO_ENGLISH_STATS } from '../domain/constants';
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
}
export const CharacterSheet = ({ name, character, state, logs, onAddLog, onDeleteLog, onNameChange, onAvatarChange, isEditMode = false, onToggleEditMode, onUpdateProfile }: CharacterSheetProps) => {
    // Ephemeral State (Session Scope)
    const [resourceValues, setResourceValues] = useState<Record<string, number>>({});
    const [rollHistory, setRollHistory] = useState<RollResult[]>([]);

    // Initialize resource values on load or when definitions change
    useEffect(() => {
        const initialValues: Record<string, number> = {};
        state.resources.forEach(r => {
            // Preserve current value if exists, otherwise set to initial
            initialValues[r.id] = resourceValues[r.id] ?? r.initial;
        });
        setResourceValues(initialValues);
    }, [state.resources]);

    // Handle Log Commands (Ephemeral)
    const handleLogCommand = (log: SessionLogEntry) => {
        // If it's a resource update, update local state
        if (log.type === 'UPDATE_RESOURCE' && log.resourceUpdate) {
            const { resourceId, type, value, resetTarget } = log.resourceUpdate;

            // Calculate new value for feedback
            let newValue = 0;

            // Case-insensitive matching
            const normalizedId = resourceId.toUpperCase(); // HP/MP are usually uppercase

            // Try to find explicit resource (case-insensitive ID OR exact Name match)
            const resource = state.resources.find(r =>
                r.id.toLowerCase() === resourceId.toLowerCase() ||
                r.name === resourceId
            );

            // Implicit resource handling
            let resDef = resource;
            if (!resDef && (normalizedId === 'HP' || normalizedId === 'MP')) {
                const max = state.derivedStats[normalizedId] || 0;
                resDef = { id: normalizedId, name: normalizedId, max, min: 0, initial: max };
            }

            if (resDef) {
                const current = resourceValues[resDef.id] ?? resDef.initial;
                newValue = current;

                if (type === 'set' && value !== undefined) {
                    newValue = value;
                } else if (type === 'modify' && value !== undefined) {
                    newValue = current + value;
                } else if (type === 'reset') {
                    newValue = resDef.initial;
                }

                // Clamp
                newValue = Math.min(resDef.max, Math.max(resDef.min, newValue));

                // Update State
                setResourceValues(prev => ({
                    ...prev,
                    [resDef.id]: newValue
                }));

                // Add Feedback to History
                const feedback: RollResult = {
                    formula: 'Command',
                    total: newValue,
                    details: log.description || `Updated ${resDef.name}`,
                    isCritical: false,
                    isFumble: false
                };
                setRollHistory(prev => [feedback, ...prev]);
            } else {
                // Feedback for failure
                const feedback: RollResult = {
                    formula: 'Error',
                    total: 0,
                    details: `Resource not found: ${resourceId}`,
                    isCritical: false,
                    isFumble: false
                };
                setRollHistory(prev => [feedback, ...prev]);
            }

            // onAddLog(log); // Removed: Resource updates are ephemeral session logs

        } else if (log.type === 'RESET_RESOURCES') {
            setResourceValues(prev => {
                const next = { ...prev };

                // Reset explicit resources
                state.resources.forEach(r => {
                    if (r.resetMode !== 'none') {
                        next[r.id] = r.initial;
                    }
                });

                // Reset implicit HP/MP
                ['HP', 'MP'].forEach(key => {
                    const explicit = state.resources.find(r => r.id === key);
                    if (!explicit) {
                        const max = state.derivedStats[key] || 0;
                        next[key] = max;
                    }
                });

                return next;
            });

            // Add Feedback
            const feedback: RollResult = {
                formula: 'Command',
                total: 0,
                details: log.description || 'Reset All Resources',
                isCritical: false,
                isFumble: false
            };
            setRollHistory(prev => [feedback, ...prev]);

            // onAddLog(log); // Removed: Resource updates are ephemeral session logs
        } else if (log.type === 'ROLL' && log.diceRoll) {
            // Future: Handle ROLL logs if they come through here
        }
    };

    // Calculate Display State (Reactive to Resource Changes)
    const displayState = useMemo(() => {
        // Clone state to avoid mutation
        const next: CharacterState = {
            ...state,
            stats: { ...state.stats },
            derivedStats: { ...state.derivedStats }
        };

        // Prepare overrides with current resource values
        const overrides: Record<string, number> = {};
        state.resources.forEach(r => {
            const val = resourceValues[r.id] ?? r.initial;
            overrides[r.name] = val;
            // Also override by ID if different (e.g. "HP" vs "Hit Points")
            if (r.id !== r.name) overrides[r.id] = val;
        });

        // Helper to re-calculate dynamic modifiers
        const applyDynamicUpdates = (modifiers: Record<string, string> | undefined) => {
            if (!modifiers) return;
            for (const [key, formula] of Object.entries(modifiers)) {
                const normalizedKey = JAPANESE_TO_ENGLISH_STATS[key] || key;

                // Calculate with initial values (Max HP etc) - this is what is currently in state.stats
                const initialVal = CharacterCalculator.evaluateFormula(formula, state);

                // Calculate with current values
                const currentVal = CharacterCalculator.evaluateFormula(formula, state, overrides);

                const delta = currentVal - initialVal;
                if (delta !== 0) {
                    next.stats[normalizedKey] = (next.stats[normalizedKey] || 0) + delta;
                }
            }
        };

        // Re-apply all dynamic modifiers
        state.equipment.forEach(i => applyDynamicUpdates(i.dynamicModifiers));
        state.skills.forEach(s => applyDynamicUpdates(s.dynamicModifiers));

        // Recalculate Derived Stats (e.g. Attack, Defense which might depend on modified stats or resources)
        const formulas = CharacterCalculator.getFormulas(state);
        CharacterCalculator.calculateDerivedStats(next, formulas, overrides);

        return next;
    }, [state, resourceValues]);

    // Handle Rolls (Ephemeral)
    const handleRoll = (result: RollResult) => {
        setRollHistory(prev => [result, ...prev]);

        // Also add to persistent log if needed?
        // The requirement was "Test Dice Roller", so maybe ephemeral is fine.
        // But wait, the user said "Character Sheet's test dice roller is broken".
    };

    // Helper for quick rolls
    const performRoll = (formula: string, description?: string) => {
        // Use displayState as base so we get updated stats (e.g. Attack)
        const tempState = { ...displayState };

        // Inject current resource values into stats so {HP} works in the roll formula itself
        state.resources.forEach(r => {
            const val = resourceValues[r.id] ?? r.initial;
            tempState.stats = { ...tempState.stats, [r.name]: val };
        });

        const result = DiceRoller.roll(formula, tempState, JAPANESE_TO_ENGLISH_STATS);

        // Add description to result details if present
        if (description) {
            result.details += ` ${description}`;
        }

        handleRoll(result);
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
            description: `Increased ${key} by 1 (Cost: ${cost} EXP)`
        });
    };

    // Handle Skill Actions
    const handleAddSkill = (skill: Skill) => {
        onAddLog({
            type: 'LEARN_SKILL',
            skill,
            description: `Learned skill: ${skill.name}`
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
                name={name}
                avatarUrl={character?.avatarUrl || undefined}
                bio={character?.bio || undefined}
                specialtyElements={character?.specialtyElements || undefined}
                exp={state.exp}
                grade={state.stats['Grade']}
                onNameChange={onNameChange}
                onAvatarChange={onAvatarChange}
                isEditMode={isEditMode}
                onToggleEditMode={onToggleEditMode}
                onGrow={handleStatGrowth}
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
                                onRoll={performRoll}
                                isEditMode={isEditMode}
                                onGrow={handleStatGrowth}
                            />
                            <ResourcePanel
                                state={state}
                                resourceValues={resourceValues}
                            />
                        </TabsContent>

                        {/* Skills Tab */}
                        <TabsContent value="skills">
                            <SkillsPanel
                                state={state}
                                onAddLog={onAddLog}
                                onRoll={performRoll}
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
                                onRoll={performRoll}
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
                            />
                        </TabsContent>

                        {/* History Tab */}
                        <TabsContent value="history">
                            <HistoryPanel
                                logs={logs}
                                onAddLog={onAddLog}
                                onDeleteLog={onDeleteLog}
                            />
                        </TabsContent>
                    </Tabs>
                </div>

                {/* Right Column: Tools (4 cols) */}
                <div className="lg:col-span-4 space-y-6">
                    <DicePanel
                        state={state}
                        resourceValues={resourceValues}
                        rollHistory={rollHistory}
                        onRoll={handleRoll}
                        onLogCommand={handleLogCommand}
                    />
                </div>
            </div>
        </div>
    );
};
