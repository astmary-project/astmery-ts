import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { DiceRoller } from '@/domain/dice/DiceRoller';
import { cn } from '@/lib/utils';
import { Eye, EyeOff, Pencil, Plus, Send, Trash2, X } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { CharacterState, JAPANESE_TO_ENGLISH_STATS } from '../../character';
import { CharacterCalculator } from '../../character/domain/CharacterCalculator';
import { useCharacterData } from '../../character/hooks/useCharacterData';
import { CommandParser } from '../domain/CommandParser';
import { MapToken, SessionLogEntry } from '../domain/SessionLog';
import { SessionParticipant } from '../domain/SessionRoster';
import { AutocompleteList } from './AutocompleteList';
import { ChatPalette } from './ChatPalette';

interface DicePanelProps {
    state: CharacterState; // Fallback/Mock state
    resourceValues: Record<string, number>; // Legacy global resource values
    logs: SessionLogEntry[];
    onLog: (log: SessionLogEntry) => void;
    tabs?: { id: string; label: string }[];
    tokens?: MapToken[];
    participants?: SessionParticipant[]; // Added participants
    currentUserId?: string;
    currentUserName?: string;
    fixedIdentity?: { id: string; name: string };
    className?: string;
    selectedTokenId?: string; // Added prop
    onSelectToken?: (id: string) => void; // Added prop
    onUpdateLog?: (logId: string, content: string) => void;
    onDeleteLog?: (logId: string) => void;
}

export function DicePanel({ state: fallbackState, resourceValues, logs, onLog, tabs = [], tokens = [], participants = [], currentUserId, currentUserName, fixedIdentity, className, selectedTokenId = 'self', onSelectToken, onUpdateLog, onDeleteLog }: DicePanelProps) {
    const [input, setInput] = useState('');
    const [activeTab, setActiveTab] = useState('main');
    const [newTabName, setNewTabName] = useState('');
    const [isAddTabOpen, setIsAddTabOpen] = useState(false);
    // const [selectedTokenId, setSelectedTokenId] = useState<string>(fixedIdentity ? fixedIdentity.id : 'self'); // Removed local state
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const myTokens = tokens.filter(t => t.creatorId === currentUserId);

    // Resolve Selected Participant
    const selectedToken = tokens.find(t => t.id === selectedTokenId);
    const selectedParticipant = participants.find(p => p.id === selectedToken?.participantId);

    // Fetch Character Data if linked
    const { state: characterState } = useCharacterData(selectedParticipant?.characterId);

    // Construct Roll Context
    // Merge:
    // 1. Fallback State (Base)
    // 2. Character Data (Stats, Skills)
    // 3. Participant State (Live HP/MP)
    const activeState: CharacterState = {
        ...fallbackState,
        ...characterState,
        stats: { ...fallbackState.stats, ...characterState.stats }, // Merge stats
    };

    // Overlay Live Resources from Participant if available
    if (selectedParticipant) {
        // Map participant state (hp, mp) to stats for rolling (e.g. {HP}, {MP})
        activeState.stats = {
            ...activeState.stats,
            'HP': selectedParticipant.state.hp.current,
            'MP': selectedParticipant.state.mp.current,
            'Initiative': selectedParticipant.state.initiative,
        };

        // Map custom resources to stats so they can be used in formulas
        if (selectedParticipant.state.resources) {
            selectedParticipant.state.resources.forEach(r => {
                // Map by name (primary) and id (fallback/alternate)
                if (r.name) activeState.stats[r.name] = r.current;
                if (r.id && r.id !== r.name) activeState.stats[r.id] = r.current;
            });
        }
    } else {
        // Fallback to legacy resourceValues
        fallbackState.resources.forEach(r => {
            const val = resourceValues[r.id] ?? r.initial;
            activeState.stats = { ...activeState.stats, [r.name]: val };
        });
    }

    // Recalculate derived stats based on current stats (including session mods)
    // We need to get formulas from the state
    const formulas = CharacterCalculator.getFormulas(activeState);

    // CRITICAL: Re-calculate dynamic modifiers (e.g. Skill bonuses based on Resources)
    // 1. Calculate what the bonuses were in the base state (to remove them)
    const baseDynamicBonuses = CharacterCalculator.calculateDynamicBonuses(characterState);
    // 2. Calculate what the bonuses should be now (with live resources)
    const newDynamicBonuses = CharacterCalculator.calculateDynamicBonuses(activeState);

    // 3. Update stats by removing old bonus and adding new bonus
    for (const [key, newBonus] of Object.entries(newDynamicBonuses)) {
        const baseBonus = baseDynamicBonuses[key] || 0;
        const currentStat = activeState.stats[key] || 0;
        activeState.stats[key] = currentStat - baseBonus + newBonus;
    }

    CharacterCalculator.calculateDerivedStats(activeState, formulas);

    // Default tabs if not provided
    // Default tabs if not provided
    // Reorder: Main -> User Tabs -> System


    // Ensure Main is always first if we are merging, but here 'tabs' prop might contain user tabs.
    // Actually, the previous logic was: const displayTabs = tabs.length > 0 ? tabs : [{ id: 'main', label: 'Main' }, { id: 'system', label: 'System' }];
    // If tabs are passed (user created), we want Main first, then User Tabs, then System.
    // But 'tabs' prop comes from parent? No, 'tabs' prop seems to be just initial or external.
    // Wait, 'tabs' prop is defined as `tabs?: { id: string; label: string }[]`.
    // In `SessionRoomContent`, `tabs` are passed from `room.tabs`.
    // We need to make sure 'main' and 'system' are handled correctly.
    // Let's assume 'tabs' contains ONLY user-created tabs.

    const finalDisplayTabs = [
        { id: 'main', label: 'Main' },
        ...tabs.filter(t => t.id !== 'main' && t.id !== 'system'),
        { id: 'system', label: 'System' }
    ];

    // Autocomplete State
    const [autocomplete, setAutocomplete] = useState<{
        type: 'variable' | 'resource' | null;
        query: string;
        triggerIndex: number;
    }>({ type: null, query: '', triggerIndex: -1 });
    const [selectedIndex, setSelectedIndex] = useState(0);

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        setInput(newValue);

        const cursor = e.target.selectionStart;

        // Find the last trigger before cursor
        const lastOpenBrace = newValue.lastIndexOf('{', cursor - 1);
        const lastColon = newValue.lastIndexOf(':', cursor - 1);
        const lastCloseBrace = newValue.lastIndexOf('}', cursor - 1);
        // const lastSpace = newValue.lastIndexOf(' ', cursor - 1); // Basic boundary check
        // const lastSemicolon = newValue.lastIndexOf(';', cursor - 1);

        // Check for Variable Autocomplete '{'
        // Trigger if '{' is found, and it's after any closing brace (to avoid being inside another tag if we assume flat structure, though nested isn't supported yet)
        // And ensure we are "inside" the brace (cursor > brace)
        if (lastOpenBrace !== -1 && lastOpenBrace > lastCloseBrace && cursor > lastOpenBrace) {
            const query = newValue.slice(lastOpenBrace + 1, cursor);
            // Simple check: query shouldn't contain spaces or other invalid chars if we want strictness, 
            // but Japanese stats might not have spaces. Let's allow anything for now until '}'
            setAutocomplete({ type: 'variable', query, triggerIndex: lastOpenBrace });
            setSelectedIndex(0);
            return;
        }

        // Check for Resource Autocomplete ':'
        // Trigger if ':' is found. 
        // Boundary: Should be start of line OR after a space OR after a semicolon
        // And no space after colon yet (or maybe allow it? usually :HP)
        if (lastColon !== -1 && cursor > lastColon) {
            // Check if it's a valid command start position
            const prevChar = newValue[lastColon - 1];
            const isCommandStart = lastColon === 0 || prevChar === ' ' || prevChar === ';' || prevChar === '\n';

            if (isCommandStart) {
                // Query is everything from colon to cursor, BUT stop if we hit an operator like + - =
                const potentialQuery = newValue.slice(lastColon + 1, cursor);
                const operatorIndex = potentialQuery.search(/[\+\-\=]/);

                if (operatorIndex === -1) {
                    setAutocomplete({ type: 'resource', query: potentialQuery, triggerIndex: lastColon });
                    setSelectedIndex(0);
                    return;
                }
            }
        }

        setAutocomplete({ type: null, query: '', triggerIndex: -1 });
    };

    // Generate Suggestions
    const getSuggestions = () => {
        if (!autocomplete.type) return [];

        if (autocomplete.type === 'variable') {
            const stats = Object.keys(activeState.stats);
            const derived = Object.keys(activeState.derivedStats);
            // Combine and deduplicate
            const allKeys = Array.from(new Set([...stats, ...derived]));

            // Add Japanese aliases if available (reverse lookup)
            // We want to show what the user can type. 
            // If they type {肉体}, it maps to Body.
            // So we should suggest "肉体 (Body)" and "Body".
            const suggestions: { label: string, value: string, description?: string }[] = [];

            allKeys.forEach(key => {
                // English Key
                suggestions.push({ label: key, value: key, description: activeState.stats[key]?.toString() ?? activeState.derivedStats[key]?.toString() });

                // Find Japanese label for this key
                const jpLabel = Object.entries(JAPANESE_TO_ENGLISH_STATS).find(([, en]) => en === key)?.[0];
                if (jpLabel) {
                    suggestions.push({ label: jpLabel, value: jpLabel, description: `${key}: ${activeState.stats[key] ?? activeState.derivedStats[key]}` });
                }
            });

            // Also add custom labels from state
            Object.entries(activeState.customLabels).forEach(([key, label]) => {
                suggestions.push({ label: label, value: label, description: key });
            });

            return suggestions.filter(s => s.label.toLowerCase().includes(autocomplete.query.toLowerCase()));
        }

        if (autocomplete.type === 'resource') {
            const resources = activeState.resources || [];
            // Add implicit HP/MP if not in resources
            const suggestions: { label: string, value: string, description?: string }[] = [];

            resources.forEach(r => {
                const current = activeState.stats[r.name] ?? activeState.stats[r.id] ?? r.initial;
                suggestions.push({ label: r.name, value: r.name, description: `${current}/${r.max}` });
                // Only add ID if it's different from name AND not a UUID (simple length check or regex)
                // UUIDs are 36 chars. Let's assume anything > 30 chars with hyphens is internal.
                if (r.id !== r.name && r.id.length < 30) {
                    suggestions.push({ label: r.id, value: r.id, description: `${r.name}` });
                }
            });

            // Ensure HP/MP are there if not covered
            if (!suggestions.some(s => s.value === 'HP')) suggestions.push({ label: 'HP', value: 'HP', description: 'Hit Points' });
            if (!suggestions.some(s => s.value === 'MP')) suggestions.push({ label: 'MP', value: 'MP', description: 'Magic Points' });

            return suggestions.filter(s => s.label.toLowerCase().includes(autocomplete.query.toLowerCase()));
        }

        return [];
    };

    const suggestions = getSuggestions();

    const handleSelectSuggestion = (item: { value: string }) => {
        if (!autocomplete.type) return;

        const before = input.slice(0, autocomplete.triggerIndex + 1); // Include trigger '{' or ':'
        const after = input.slice(autocomplete.triggerIndex + 1 + autocomplete.query.length);

        let insertValue = item.value;
        if (autocomplete.type === 'variable') {
            insertValue = item.value + '}'; // Close brace
        }

        const newValue = before + insertValue + after;
        setInput(newValue);
        setAutocomplete({ type: null, query: '', triggerIndex: -1 });

        // Focus back to input (handled by useEffect or manual focus if ref available)
        // We need a ref to textarea
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (autocomplete.type && suggestions.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => (prev + 1) % suggestions.length);
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
                return;
            }
            if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                handleSelectSuggestion(suggestions[selectedIndex]);
                return;
            }
            if (e.key === 'Escape') {
                setAutocomplete({ type: null, query: '', triggerIndex: -1 });
                return;
            }
        }

        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const [isSecret, setIsSecret] = useState(false);

    const handleSend = () => {
        if (!input.trim()) return;

        const senderName = fixedIdentity ? fixedIdentity.name : ((selectedToken ? selectedToken.name : (currentUserName || 'Player')) || 'Unknown');

        // Check for Secret Command (/s or /secret)
        let content = input;
        let secretMode = isSecret;

        if (content.match(/^\/(s|secret)(\s+|$)/i)) {
            secretMode = true;
            content = content.replace(/^\/(s|secret)\s*/i, '');
            if (!content.trim()) return; // Don't send empty secret
        }

        // Intercept Plan/Action Command
        // Syntax: :Plan <text> [@<cost_expression>]
        // Check this BEFORE CommandParser because CommandParser returns empty for unknown commands
        const planMatch = content.match(/^[:@](?:Plan|Action|P|A)\s+(.+)$/i);
        if (planMatch && selectedParticipant) {
            const fullText = planMatch[1];
            // Check for cost syntax "@expression" at the end
            // We use a regex that captures everything after the last @ as the expression
            const costMatch = fullText.match(/@\s*([^@]+)$/);

            if (costMatch) {
                // Buffered Action
                const costExpression = costMatch[1].trim();
                const description = fullText.substring(0, costMatch.index).trim();

                // Calculate Cost using DiceRoller
                // We need to construct a RollContext
                // activeState has stats merged, but DiceRoller expects separated stats/derivedStats
                // However, our DiceRoller logic uses: context.stats[key] ?? context.derivedStats[key]
                // So passing activeState.stats as 'stats' and empty 'derivedStats' should work fine
                // since activeState.stats contains everything.
                const rollContext = {
                    stats: activeState.stats,
                    derivedStats: activeState.derivedStats || {}
                };

                const costResult = DiceRoller.roll(costExpression, rollContext, JAPANESE_TO_ENGLISH_STATS);
                let cost = 0;
                let costDetails = '';

                if (costResult.isSuccess) {
                    cost = costResult.value.total;
                    costDetails = `(Cost: ${costResult.value.total})`;
                } else {
                    console.warn('Failed to calculate cost:', costResult.error);
                    // Fallback to simple parsing if DiceRoller fails (e.g. just a number)
                    const simpleParse = parseInt(costExpression, 10);
                    if (!isNaN(simpleParse)) {
                        cost = simpleParse;
                    }
                }

                onLog({
                    id: crypto.randomUUID(),
                    type: 'UPDATE_PARTICIPANT',
                    // eslint-disable-next-line react-hooks/purity
                    timestamp: Date.now(),
                    participant: {
                        ...selectedParticipant,
                        state: {
                            ...selectedParticipant.state,
                            pendingAction: { description, cost }
                        }
                    },
                    description: `${senderName} is planning an action... ${costDetails}`,
                    visibleTo: secretMode && currentUserId ? [currentUserId] : undefined
                });
            } else {
                // Direct Action (Legacy / No Cost)
                onLog({
                    id: crypto.randomUUID(),
                    type: 'UPDATE_PARTICIPANT',
                    // eslint-disable-next-line react-hooks/purity
                    timestamp: Date.now(),
                    participant: {
                        ...selectedParticipant,
                        state: {
                            ...selectedParticipant.state,
                            nextAction: fullText,
                            pendingAction: undefined // Clear pending if direct set
                        }
                    },
                    description: `${senderName} plans: ${fullText}`,
                    visibleTo: secretMode && currentUserId ? [currentUserId] : undefined
                });
            }
            setInput('');
            return;
        }

        // Try parsing as a command first
        const commandLogs = CommandParser.parse(content);
        if (commandLogs.length > 0) {
            for (const commandLog of commandLogs) {
                // Intercept Resource Updates for specific participants
                if (commandLog.type === 'UPDATE_RESOURCE' && selectedParticipant && commandLog.resourceUpdate) {
                    const { resourceId, type, value, resetTarget } = commandLog.resourceUpdate;
                    const targetRes = resourceId.toLowerCase(); // 'hp' or 'mp' or other

                    const newState = { ...selectedParticipant.state };
                    let updated = false;

                    // Helper to resolve value
                    const resolveValue = (val: number | string): number => {
                        if (typeof val === 'number') return val;
                        // Simple expression handling if needed, but CommandParser already handles simple numbers
                        // If it's a string expression like "10+2", we might need eval or similar, but for now assume simple number string
                        return parseFloat(val) || 0;
                    };

                    // Helper to apply update
                    const applyUpdate = (current: number, max: number): number => {
                        if (resetTarget === 'initial' || resetTarget === 'max') return max; // Reset to max for now (initial not tracked in roster state explicitly unless we check character)
                        // Actually, roster state has max.
                        if (type === 'reset') return max;

                        const numVal = resolveValue(value ?? 0);
                        if (type === 'set') return numVal;
                        if (type === 'modify') return current + numVal;
                        return current;
                    };

                    if (targetRes === 'hp') {
                        newState.hp.current = applyUpdate(newState.hp.current, newState.hp.max);
                        updated = true;
                    } else if (targetRes === 'mp') {
                        newState.mp.current = applyUpdate(newState.mp.current, newState.mp.max);
                        updated = true;
                    } else if (targetRes === 'init' || targetRes === 'initiative') {
                        // Initiative update
                        if (type === 'set') newState.initiative = resolveValue(value ?? 0);
                        if (type === 'modify') newState.initiative += resolveValue(value ?? 0);
                        if (type === 'reset') newState.initiative = 0;
                        updated = true;
                    } else {
                        // Custom Resource Update
                        if (newState.resources) {
                            const resIndex = newState.resources.findIndex(r => r.name?.toLowerCase() === targetRes || r.id === targetRes);
                            if (resIndex >= 0) {
                                const res = newState.resources[resIndex];
                                const newVal = applyUpdate(res.current, res.max);
                                newState.resources[resIndex] = { ...res, current: newVal };
                                updated = true;
                            }
                        }
                    }

                    if (updated) {
                        onLog({
                            id: crypto.randomUUID(),
                            type: 'UPDATE_PARTICIPANT',
                            // eslint-disable-next-line react-hooks/purity
                            timestamp: Date.now(),
                            participant: {
                                ...selectedParticipant,
                                state: newState
                            },
                            description: commandLog.description,
                            visibleTo: secretMode && currentUserId ? [currentUserId] : undefined
                        });
                    }
                } else if (commandLog.type === 'RESET_RESOURCES' && selectedParticipant) {
                    // Reset All for Participant
                    const newState = { ...selectedParticipant.state };
                    newState.hp.current = newState.hp.max;
                    newState.mp.current = newState.mp.max;
                    if (newState.resources) {
                        newState.resources = newState.resources.map(r => ({ ...r, current: r.max }));
                    }
                    onLog({
                        id: crypto.randomUUID(),
                        type: 'UPDATE_PARTICIPANT',
                        // eslint-disable-next-line react-hooks/purity
                        timestamp: Date.now(),
                        participant: {
                            ...selectedParticipant,
                            state: newState
                        },
                        description: `${senderName}: Reset to Initial Values`
                    });
                    continue;
                }

                // Default Command Handling (Global/Legacy)
                onLog({
                    ...commandLog,
                    channel: 'main', // Commands usually go to main
                });
            }
            setInput('');
            return;
        }

        // Try Dice Roll
        const rollResult = DiceRoller.roll(input, { stats: activeState.stats, derivedStats: activeState.derivedStats }, JAPANESE_TO_ENGLISH_STATS);

        if (rollResult.isSuccess) {
            onLog({
                id: crypto.randomUUID(),
                type: 'ROLL',
                // eslint-disable-next-line react-hooks/purity
                timestamp: Date.now(),
                diceRoll: rollResult.value,
                channel: 'main',
                characterId: selectedTokenId !== 'self' ? selectedTokenId : undefined,
                chatMessage: { // Include sender info for display
                    sender: senderName,
                    content: '',
                    avatarUrl: selectedParticipant?.avatarUrl // Include avatarUrl
                }
            });
            setInput('');
            return;
        }

        // If not a command and not a valid roll, treat as Chat
        onLog({
            id: crypto.randomUUID(),
            type: 'CHAT',
            // eslint-disable-next-line react-hooks/purity
            timestamp: Date.now(),
            channel: activeTab === 'system' ? 'main' : activeTab,
            chatMessage: {
                sender: senderName,
                content: input,
                avatarUrl: selectedParticipant?.avatarUrl // Include avatarUrl
            },
            characterId: selectedTokenId !== 'self' ? selectedTokenId : undefined,
        });
        setInput('');
    };



    const handleAddTab = () => {
        if (!newTabName.trim()) return;
        const id = newTabName.toLowerCase().replace(/\s+/g, '-');

        onLog({
            id: crypto.randomUUID(),
            type: 'ADD_TAB',
            timestamp: Date.now(),
            tabId: id,
            tabName: newTabName,
            description: `Created channel: ${newTabName}`
        });

        setNewTabName('');
        setIsAddTabOpen(false);
        setActiveTab(id);
    };

    const handleRemoveTab = (e: React.MouseEvent, tabId: string) => {
        e.stopPropagation();
        if (confirm('Are you sure you want to remove this tab?')) {
            // eslint-disable-next-line react-hooks/purity
            const timestamp = Date.now();
            onLog({
                id: crypto.randomUUID(),
                type: 'REMOVE_TAB',
                timestamp,
                tabId: tabId,
                description: `Removed channel: ${tabId}`
            });
            if (activeTab === tabId) setActiveTab('main');
        }
    };

    const scrollRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [isAtBottom, setIsAtBottom] = useState(true);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
            // Ensure the scrollHeight is at least the min-height if set by CSS
            if (textareaRef.current.clientHeight < textareaRef.current.scrollHeight) {
                textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
            }
        }
    }, [input]);

    const handleScroll = () => {
        if (!scrollRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
        const atBottom = scrollHeight - scrollTop - clientHeight < 20;
        setIsAtBottom(atBottom);
    };

    useEffect(() => {
        if (scrollRef.current && isAtBottom) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs, activeTab, isAtBottom]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, []);

    const filterLogs = (tab: string) => {
        return logs.filter(log => {
            if (tab === 'system') {
                // System tab shows everything EXCEPT Chat, Roll, and Resource Updates (which go to Main)
                // Actually, user said "Resource updates go to Main".
                // So System gets: SYSTEM, ADD_TAB, REMOVE_TAB, MAP updates, TOKEN updates, PARTICIPANT updates (except resource?)
                // Wait, "Resource updates go to Main".
                // What about "UPDATE_PARTICIPANT"? This is often triggered by resource updates.
                // If UPDATE_PARTICIPANT is purely internal state sync, maybe System?
                // But if it's "HP changed", it's a resource update.
                // Let's look at log types.
                // CHAT, ROLL -> Main
                // UPDATE_RESOURCE -> Main
                // RESET_RESOURCES -> Main
                // UPDATE_PARTICIPANT -> Main (often contains HP/MP updates visible to users)

                // So System is: SYSTEM, ADD/REMOVE TAB, MAP/TOKEN ops.
                return (
                    log.type === 'SYSTEM' ||
                    log.type === 'ADD_TAB' ||
                    log.type === 'REMOVE_TAB' ||
                    log.type === 'UPDATE_MAP_BACKGROUND' ||
                    log.type === 'UPDATE_STATIC_BACKGROUND' ||
                    log.type === 'ADD_TOKEN' ||
                    log.type === 'REMOVE_TOKEN' ||
                    log.type === 'MOVE_TOKEN' ||
                    log.type === 'UPDATE_TOKEN' ||
                    log.type === 'ADD_PARTICIPANT' ||
                    log.type === 'REMOVE_PARTICIPANT'
                    // UPDATE_PARTICIPANT is excluded here, goes to Main
                );
            }
            if (tab === 'main') {
                // Main only shows Chat, Roll, and Resource Updates
                // Explicitly check types to avoid "channel: main" catching system logs
                return (
                    (log.type === 'CHAT' && (log.channel === 'main' || !log.channel)) ||
                    log.type === 'ROLL' ||
                    log.type === 'UPDATE_RESOURCE' ||
                    log.type === 'RESET_RESOURCES' ||
                    log.type === 'UPDATE_PARTICIPANT'
                );
            }
            // User tabs only show CHAT for that channel
            return log.channel === tab && log.type === 'CHAT';
        });
    };

    const [editingLogId, setEditingLogId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState('');

    const handleEditStart = (log: SessionLogEntry) => {
        if (log.type === 'CHAT' && log.chatMessage) {
            setEditingLogId(log.id);
            setEditContent(log.chatMessage.content);
        }
    };

    const handleEditSave = () => {
        if (editingLogId && onUpdateLog) {
            onUpdateLog(editingLogId, editContent);
            setEditingLogId(null);
            setEditContent('');
        }
    };

    const renderLog = (log: SessionLogEntry) => {
        // Determine if message is from "me" (simplified check for now)
        // In a real app, we'd check currentUserId vs log.userId
        const isMe = false; // TODO: Implement proper "isMe" check

        const contextMenuContent = (
            <ContextMenuContent>
                {log.type === 'CHAT' && (
                    <ContextMenuItem onClick={() => handleEditStart(log)}>
                        <Pencil className="w-4 h-4 mr-2" />
                        Edit Message
                    </ContextMenuItem>
                )}
                <ContextMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => {
                        if (confirm('Delete this message?')) {
                            onDeleteLog?.(log.id);
                        }
                    }}
                >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Message
                </ContextMenuItem>
            </ContextMenuContent>
        );

        switch (log.type) {
            case 'ROLL':
                const result = log.diceRoll!;
                const senderName = log.chatMessage?.sender || 'Unknown';
                const avatarUrl = log.chatMessage?.avatarUrl;
                return (
                    <ContextMenu key={log.id}>
                        <ContextMenuTrigger>
                            <div className="mb-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="flex gap-3">
                                    <Avatar className="h-8 w-8 border-2 border-primary/20">
                                        <AvatarImage src={avatarUrl} />
                                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">{senderName[0]}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-semibold text-primary">{senderName} (Roll)</span>
                                            <span className="text-[10px] text-muted-foreground" suppressHydrationWarning>
                                                {new Date(log.timestamp).toLocaleTimeString()}
                                            </span>
                                        </div>
                                        <div className={cn(
                                            "p-3 rounded-lg text-sm border",
                                            result.isCritical ? "bg-yellow-500/10 border-yellow-500/50" :
                                                result.isFumble ? "bg-red-500/10 border-red-500/50" :
                                                    "bg-card border-border"
                                        )}>
                                            <div className="font-mono text-xs text-muted-foreground mb-1">{result.formula}</div>
                                            <div className="flex justify-between items-baseline">
                                                <span className="text-sm">{result.details}</span>
                                                <div className="flex items-center gap-2">
                                                    {result.isCritical && <span className="text-xs font-bold text-yellow-600 animate-pulse">CRITICAL!</span>}
                                                    {result.isFumble && <span className="text-xs font-bold text-red-600 animate-pulse">FUMBLE!</span>}
                                                    {!isNaN(result.total) && <span className="text-xl font-bold font-mono">{result.total}</span>}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </ContextMenuTrigger>
                        {contextMenuContent}
                    </ContextMenu>
                );
            case 'CHAT':
                const sender = log.chatMessage?.sender || 'Unknown';
                const initial = sender[0]?.toUpperCase() || '?';
                const chatAvatarUrl = log.chatMessage?.avatarUrl;
                const isEditing = editingLogId === log.id;

                return (
                    <ContextMenu key={log.id}>
                        <ContextMenuTrigger>
                            <div className={cn(
                                "mb-4 flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300",
                                isMe ? "flex-row-reverse" : "flex-row"
                            )}>
                                <Avatar className="h-8 w-8 border-2 border-muted">
                                    <AvatarImage src={chatAvatarUrl} />
                                    <AvatarFallback className="bg-muted text-muted-foreground text-xs">{initial}</AvatarFallback>
                                </Avatar>
                                <div className={cn("flex flex-col max-w-[80%]", isMe ? "items-end" : "items-start")}>
                                    <div className="flex items-baseline gap-2 mb-1">
                                        <span className="text-xs font-semibold">{sender}</span>
                                        <span className="text-[10px] text-muted-foreground" suppressHydrationWarning>
                                            {new Date(log.timestamp).toLocaleTimeString()}
                                        </span>
                                    </div>
                                    <div className={cn(
                                        "p-3 rounded-2xl text-sm shadow-sm whitespace-pre-wrap wrap-break-word",
                                        isMe ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-muted/50 text-foreground rounded-tl-none"
                                    )}>
                                        {isEditing ? (
                                            <div className="flex flex-col gap-2 min-w-[200px]">
                                                <Textarea
                                                    value={editContent}
                                                    onChange={(e) => setEditContent(e.target.value)}
                                                    className="min-h-[60px] text-xs bg-background text-foreground"
                                                    autoFocus
                                                />
                                                <div className="flex justify-end gap-2">
                                                    <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setEditingLogId(null)}>Cancel</Button>
                                                    <Button size="sm" className="h-6 text-xs" onClick={handleEditSave}>Save</Button>
                                                </div>
                                            </div>
                                        ) : (
                                            log.chatMessage?.content
                                        )}
                                    </div>
                                </div>
                            </div>
                        </ContextMenuTrigger>
                        {contextMenuContent}
                    </ContextMenu>
                );
            case 'UPDATE_RESOURCE':
                return (
                    <div key={log.id} className="mb-4 flex justify-center animate-in fade-in zoom-in-95 duration-300">
                        <div className="bg-blue-500/10 text-blue-600 border border-blue-200/50 px-3 py-1 rounded-full text-xs font-medium">
                            {log.description}
                        </div>
                    </div>
                );
            case 'UPDATE_PARTICIPANT':
                return (
                    <div key={log.id} className="mb-4 flex justify-center animate-in fade-in zoom-in-95 duration-300">
                        <div className="bg-green-500/10 text-green-600 border border-green-200/50 px-3 py-1 rounded-full text-xs font-medium">
                            {log.description}
                        </div>
                    </div>
                );
            default:
                return (
                    <div key={log.id} className="mb-2 text-center">
                        <span className="text-[10px] text-muted-foreground bg-muted/30 px-2 py-1 rounded">
                            {log.description}
                        </span>
                    </div>
                );
        }
    };

    const handlePaletteSelect = (text: string) => {
        setInput(text);
        // Optionally focus the textarea
    };

    const containerRef = useRef<HTMLDivElement>(null);

    const handleWheel = (e: React.WheelEvent) => {
        // Prevent default vertical scrolling if we are scrolling horizontally
        if (e.deltaY !== 0) {
            const container = e.currentTarget;
            if (container) {
                const delta = e.deltaMode === 1 ? e.deltaY * 30 : e.deltaY;
                container.scrollLeft += delta;
            }
        }
    };

    useEffect(() => {
        if (containerRef.current) {
            // console.log('Tab Container Dimensions:', {
            //     scrollWidth: containerRef.current.scrollWidth,
            //     clientWidth: containerRef.current.clientWidth,
            //     offsetWidth: containerRef.current.offsetWidth
            // });
        }
    });

    return (
        <Card className={cn("h-full flex flex-col min-h-0 border-none shadow-none bg-transparent pb-0 w-full max-w-full", className)}>
            <CardHeader className="px-0 pt-0 pb-0 min-w-0">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full min-w-0">
                    <div className="flex items-center justify-between w-full py-1 gap-1 min-w-0">
                        <div
                            ref={containerRef}
                            className="flex-1 overflow-x-auto min-w-0 no-scrollbar"
                            onWheel={handleWheel}
                            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                        >
                            <TabsList
                                className="h-8 bg-transparent p-0 gap-1 justify-start w-max min-w-full"
                            >
                                {finalDisplayTabs.map(tab => (
                                    <TabsTrigger
                                        key={tab.id}
                                        value={tab.id}
                                        className="h-7 px-3 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm border border-transparent data-[state=active]:border-border flex items-center gap-1 shrink-0"
                                    >
                                        {tab.label}
                                        {tab.id !== 'main' && tab.id !== 'system' && (
                                            <span
                                                className="ml-1 hover:text-red-500 cursor-pointer opacity-50 hover:opacity-100 transition-opacity"
                                                onClick={(e) => handleRemoveTab(e, tab.id)}
                                            >
                                                <X className="w-3 h-3" />
                                            </span>
                                        )}
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                        </div>
                        <Dialog open={isAddTabOpen} onOpenChange={setIsAddTabOpen}>
                            <DialogTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground ml-1"
                                >
                                    <Plus className="h-3 w-3" />
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Add New Channel</DialogTitle>
                                    <DialogDescription>Create a new chat channel for private or specific discussions.</DialogDescription>
                                </DialogHeader>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Channel Name"
                                        value={newTabName}
                                        onChange={(e) => setNewTabName(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddTab()}
                                    />
                                    <Button onClick={handleAddTab}>Create</Button>
                                </div>
                            </DialogContent>
                        </Dialog>

                    </div>
                </Tabs>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col gap-2 min-h-0 px-0 pb-0">
                <div
                    className="flex-1 overflow-y-auto pr-2 min-h-0 scroll-smooth"
                    ref={scrollRef}
                    onScroll={handleScroll}
                >
                    <div className="flex flex-col justify-end min-h-full pb-2">
                        {filterLogs(activeTab).length === 0 ? (
                            <div className="flex-1 flex items-center justify-center text-muted-foreground/50 text-sm italic">
                                No messages yet. Start the conversation!
                            </div>
                        ) : (
                            filterLogs(activeTab).map(renderLog)
                        )}
                    </div>
                </div>

                <div className="p-3 border-t bg-background/50 backdrop-blur-sm">
                    <div className="bg-background/50 backdrop-blur-sm border rounded-xl p-3 shadow-sm space-y-3">
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                {fixedIdentity ? (
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-md text-xs font-bold border border-primary/20 max-w-[200px]">
                                        <Avatar className="h-5 w-5">
                                            <AvatarFallback className="bg-primary text-primary-foreground text-[10px]">{fixedIdentity.name[0]}</AvatarFallback>
                                        </Avatar>
                                        <span className="truncate">{fixedIdentity.name}</span>
                                    </div>
                                ) : (
                                    <Select value={selectedTokenId} onValueChange={(val) => onSelectToken?.(val)}>
                                        <SelectTrigger className="h-8 text-xs w-[180px] bg-background/50 border-muted-foreground/20">
                                            <SelectValue placeholder="Select Identity" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="self">{currentUserName || 'Player'} (Self)</SelectItem>
                                            {isMounted && myTokens.map(token => (
                                                <SelectItem key={token.id} value={token.id}>{token.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            </div>

                            <div className="flex items-center gap-1">
                                <ChatPalette state={activeState} onSelect={handlePaletteSelect} />
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className={cn(
                                        "h-8 px-2 gap-1.5 transition-colors text-xs font-medium",
                                        isSecret ? "bg-indigo-500/20 text-indigo-500 hover:bg-indigo-500/30 hover:text-indigo-600" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                    )}
                                    onClick={() => setIsSecret(!isSecret)}
                                    title={isSecret ? "Secret Mode ON (Visible only to you)" : "Secret Mode OFF (Public)"}
                                >
                                    {isSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                    <span>{isSecret ? "Secret" : "Public"}</span>
                                </Button>
                            </div>
                        </div>

                        <div className="flex gap-2 relative">
                            {autocomplete.type && (
                                <AutocompleteList
                                    items={suggestions}
                                    selectedIndex={selectedIndex}
                                    onSelect={handleSelectSuggestion}
                                />
                            )}
                            <Textarea
                                ref={textareaRef}
                                value={input}
                                onChange={handleInputChange}
                                onKeyDown={handleKeyDown}
                                placeholder={isSecret ? "Type a secret message..." : "Type a message or command..."}
                                className={cn(
                                    "min-h-[40px] max-h-[120px] resize-none py-2 text-sm",
                                    isSecret ? "bg-indigo-500/5 border-indigo-500/20 placeholder:text-indigo-500/50" : ""
                                )}
                                rows={1}
                            />
                            <Button
                                size="icon"
                                className={cn(
                                    "h-10 w-10 shrink-0 transition-colors",
                                    isSecret ? "bg-indigo-500 hover:bg-indigo-600" : ""
                                )}
                                onClick={handleSend}
                                disabled={!input.trim()}
                            >
                                <Send className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card >
    );
}
