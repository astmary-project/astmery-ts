import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEffect, useMemo, useState } from 'react';

import { CharacterCalculator } from '../domain/CharacterCalculator';
import { CharacterLogEntry, CharacterState } from '../domain/CharacterLog';
import { JAPANESE_TO_ENGLISH_STATS } from '../domain/constants';
import { DiceRoller, RollResult } from '../domain/DiceRoller';
import { CharacterHeader } from './CharacterHeader';
import { DicePanel } from './DicePanel';
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
    onDeleteLog: (logId: string) => void;
}
export const CharacterSheet = ({ name, character, state, logs, onAddLog, onDeleteLog, onNameChange }: CharacterSheetProps) => {
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

    // Handle Resource Updates (Ephemeral)
    const handleResourceUpdate = (updates: { id: string; delta: number }[]) => {
        setResourceValues(prev => {
            const next = { ...prev };
            updates.forEach(({ id, delta }) => {
                const resource = state.resources.find(r => r.id === id);
                if (resource) {
                    const current = next[id] ?? resource.initial;
                    const newValue = Math.min(resource.max, Math.max(resource.min, current + delta));
                    next[id] = newValue;
                }
            });
            return next;
        });
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

        const result = DiceRoller.roll(formula, tempState);

        // Add description to result details if present
        if (description) {
            result.details += ` ${description}`;
        }

        handleRoll(result);
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6">
            <CharacterHeader
                name={name}
                avatarUrl={character?.avatarUrl || undefined}
                bio={character?.bio || undefined}
                specialtyElements={character?.specialtyElements || undefined}
                exp={state.exp}
                onNameChange={onNameChange}
            />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column: Character Sheet (8 cols) */}
                <div className="lg:col-span-8 space-y-6">
                    <Tabs defaultValue="status" className="w-full">
                        <TabsList className="grid w-full grid-cols-4">
                            <TabsTrigger value="status">ステータス</TabsTrigger>
                            <TabsTrigger value="skills">スキル</TabsTrigger>
                            <TabsTrigger value="equipment">装備</TabsTrigger>
                            <TabsTrigger value="history">履歴</TabsTrigger>
                        </TabsList>

                        {/* Status Tab */}
                        <TabsContent value="status" className="space-y-4">
                            <StatsPanel
                                state={state}
                                displayState={displayState}
                                onRoll={performRoll}
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
                            />
                        </TabsContent>

                        {/* Equipment Tab */}
                        <TabsContent value="equipment">
                            <EquipmentPanel
                                state={state}
                                onAddLog={onAddLog}
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
                        onResourceUpdate={handleResourceUpdate}
                    />
                </div>
            </div>
        </div>
    );
};
