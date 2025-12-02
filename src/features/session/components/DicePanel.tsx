import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { DiceRoller } from '@/domain/dice/DiceRoller';
import { Plus, X } from 'lucide-react';
import React, { useState } from 'react';
import { CharacterState, JAPANESE_TO_ENGLISH_STATS } from '../../character';
import { CommandParser } from '../domain/CommandParser';
import { MapToken, SessionLogEntry } from '../domain/SessionLog';

import { cn } from '@/lib/utils';

interface DicePanelProps {
    state: CharacterState;
    resourceValues: Record<string, number>;
    logs: SessionLogEntry[];
    onLog: (log: SessionLogEntry) => void;
    tabs?: { id: string; label: string }[];
    tokens?: MapToken[];
    currentUserId?: string;
    fixedIdentity?: { id: string; name: string };
    className?: string;
}

export function DicePanel({ state, resourceValues, logs, onLog, tabs = [], tokens = [], currentUserId, fixedIdentity, className }: DicePanelProps) {
    const [input, setInput] = useState('');
    const [activeTab, setActiveTab] = useState('main');
    const [newTabName, setNewTabName] = useState('');
    const [isAddTabOpen, setIsAddTabOpen] = useState(false);
    const [selectedTokenId, setSelectedTokenId] = useState<string>(fixedIdentity ? fixedIdentity.id : 'self');

    const myTokens = tokens.filter(t => t.creatorId === currentUserId);

    // Default tabs if not provided (though parent should provide them)
    const displayTabs = tabs.length > 0 ? tabs : [{ id: 'main', label: 'Main' }, { id: 'system', label: 'System' }];

    const handleSend = () => {
        if (!input.trim()) return;

        const selectedToken = tokens.find(t => t.id === selectedTokenId);
        const senderName = fixedIdentity ? fixedIdentity.name : ((selectedToken ? selectedToken.name : 'Player') || 'Unknown'); // TODO: Real user name

        // Try parsing as a command first
        const commandLog = CommandParser.parse(input);
        if (commandLog) {
            onLog({
                ...commandLog,
                channel: 'main', // Commands usually go to main
            });
            setInput('');
            return;
        }

        // Try Dice Roll
        // We need to pass the current resource values to the roller
        const tempState = { ...state };
        state.resources.forEach(r => {
            const val = resourceValues[r.id] ?? r.initial;
            tempState.stats = { ...tempState.stats, [r.name]: val };
        });

        const rollResult = DiceRoller.roll(input, tempState, JAPANESE_TO_ENGLISH_STATS);

        if (rollResult.isSuccess) {
            onLog({
                id: crypto.randomUUID(),
                type: 'ROLL',
                // eslint-disable-next-line react-hooks/purity
                timestamp: Date.now(),
                diceRoll: rollResult.value,
                channel: 'main',
                characterId: selectedTokenId !== 'self' ? selectedTokenId : undefined,
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
            channel: activeTab === 'system' ? 'main' : activeTab, // System tab shouldn't be chat target
            chatMessage: {
                sender: senderName,
                content: input,
            },
            characterId: selectedTokenId !== 'self' ? selectedTokenId : undefined,
        });
        setInput('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleAddTab = () => {
        if (!newTabName.trim()) return;
        const id = newTabName.toLowerCase().replace(/\s+/g, '-');

        onLog({
            id: crypto.randomUUID(),
            type: 'ADD_TAB',
            // eslint-disable-next-line react-hooks/purity
            timestamp: Date.now(),
            tabId: id,
            tabName: newTabName,
            description: `Created channel: ${newTabName} `
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

    const handleWheel = (e: React.WheelEvent) => {
        if (e.deltaY !== 0) {
            e.currentTarget.scrollLeft += e.deltaY;
        }
    };

    const scrollRef = React.useRef<HTMLDivElement>(null);
    const [isAtBottom, setIsAtBottom] = useState(true);

    // Check if user is at bottom on scroll
    const handleScroll = () => {
        if (!scrollRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
        // Allow a small buffer (e.g. 10px)
        const atBottom = scrollHeight - scrollTop - clientHeight < 10;
        setIsAtBottom(atBottom);
    };

    // Auto-scroll on logs update
    React.useEffect(() => {
        if (scrollRef.current && isAtBottom) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs, activeTab, isAtBottom]);

    // Initial scroll to bottom
    React.useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, []);

    const filterLogs = (tab: string) => {
        return logs.filter(log => {
            if (tab === 'system') return true; // System tab shows everything

            // Main tab shows Main channel chats, Rolls, and Resource Updates
            if (tab === 'main') {
                return (
                    (log.channel === 'main' || !log.channel) ||
                    log.type === 'ROLL' ||
                    log.type === 'UPDATE_RESOURCE'
                );
            }

            // Custom tabs show only chat for that channel
            return log.channel === tab && log.type === 'CHAT';
        });
    };

    const renderLog = (log: SessionLogEntry) => {
        switch (log.type) {
            case 'ROLL':
                const result = log.diceRoll!;
                return (
                    <div key={log.id} className="p-2 rounded bg-muted/50 text-sm mb-2">
                        <div className="flex justify-between items-center mb-1">
                            <span className="font-mono text-xs text-muted-foreground">{result.formula}</span>
                            <span className="text-xs text-muted-foreground" suppressHydrationWarning>
                                {new Date(log.timestamp).toLocaleTimeString()}
                            </span>
                        </div>
                        <div className="flex justify-between items-baseline">
                            <span className="font-mono text-xs text-muted-foreground truncate max-w-[70%]">
                                {result.details}
                            </span>
                            <div className="flex items-baseline gap-2">
                                {result.isCritical && <span className="text-xs font-bold text-yellow-500">CRIT!</span>}
                                {result.isFumble && <span className="text-xs font-bold text-red-500">FUMBLE!</span>}
                                {!isNaN(result.total) && <span className="font-bold text-lg">{result.total}</span>}
                            </div>
                        </div>
                    </div>
                );
            case 'CHAT':
                return (
                    <div key={log.id} className="p-2 rounded hover:bg-muted/30 text-sm mb-2">
                        <div className="flex justify-between items-baseline mb-1">
                            <span className="font-bold text-xs">{log.chatMessage?.sender}</span>
                            <span className="text-[10px] text-muted-foreground" suppressHydrationWarning>
                                {new Date(log.timestamp).toLocaleTimeString()}
                            </span>
                        </div>
                        <div className="whitespace-pre-wrap wrap-break-word">
                            {log.chatMessage?.content}
                        </div>
                    </div>
                );
            case 'UPDATE_RESOURCE':
                return (
                    <div key={log.id} className="p-2 rounded bg-blue-50/50 text-sm mb-2 border-l-2 border-blue-400">
                        <span className="text-xs text-muted-foreground">{log.description}</span>
                    </div>
                );
            default:
                return (
                    <div key={log.id} className="p-2 rounded bg-gray-50 text-xs mb-2 text-muted-foreground">
                        [{log.type}] {log.description}
                    </div>
                );
        }
    };

    return (
        <Card className={cn("h-full flex flex-col min-h-0", className)}>
            <CardHeader className="pb-2 px-4 pt-4">
                <CardTitle className="text-sm font-medium">Chat & Dice</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-2 min-h-0 px-4 pb-4">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 overflow-hidden">
                    <div className="flex items-center gap-2 shrink-0">
                        <TabsList
                            className="flex-1 justify-start overflow-x-auto no-scrollbar"
                            onWheel={handleWheel}
                        >
                            {displayTabs.map(tab => (
                                <TabsTrigger key={tab.id} value={tab.id} className="relative group">
                                    {tab.label}
                                    {tab.id !== 'main' && tab.id !== 'system' && (
                                        <span
                                            className="ml-2 opacity-0 group-hover:opacity-100 hover:text-red-500 cursor-pointer"
                                            onClick={(e) => handleRemoveTab(e, tab.id)}
                                        >
                                            <X className="w-3 h-3" />
                                        </span>
                                    )}
                                </TabsTrigger>
                            ))}
                        </TabsList>

                        <Dialog open={isAddTabOpen} onOpenChange={setIsAddTabOpen}>
                            <DialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-9 w-9">
                                    <Plus className="w-4 h-4" />
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Add New Tab</DialogTitle>
                                    <DialogDescription>
                                        Enter a name for the new chat channel.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Tab Name (e.g. Info)"
                                        value={newTabName}
                                        onChange={(e) => setNewTabName(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddTab()}
                                    />
                                    <Button onClick={handleAddTab}>Add</Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>

                    <div
                        className="flex-1 overflow-y-auto pr-2 border rounded-md bg-muted/10 p-2 min-h-0"
                        ref={scrollRef}
                        onScroll={handleScroll}
                    >
                        {filterLogs(activeTab).map(renderLog)}
                        {filterLogs(activeTab).length === 0 && (
                            <div className="text-center text-muted-foreground text-xs py-4">
                                No logs
                            </div>
                        )}
                    </div>
                </Tabs>

                <div className="flex flex-col gap-2 mt-2">
                    {/* Identity Selector Row */}
                    <div className="flex items-center">
                        {fixedIdentity ? (
                            <div className="flex items-center justify-center w-full h-9 text-xs font-bold bg-muted/20 rounded border px-2 truncate">
                                {fixedIdentity.name}
                            </div>
                        ) : (
                            <Select value={selectedTokenId} onValueChange={setSelectedTokenId}>
                                <SelectTrigger className="w-full h-9 text-xs">
                                    <SelectValue placeholder="Select Identity" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="self">Player (Self)</SelectItem>
                                    {myTokens.map(token => (
                                        <SelectItem key={token.id} value={token.id}>
                                            {token.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    </div>

                    {/* Chat Input Row */}
                    <div className="flex gap-2 items-end">
                        <Textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={activeTab === 'system' ? "Switch tab to chat..." : `Message #${activeTab} or Roll...`}
                            disabled={activeTab === 'system'}
                            className="font-mono min-h-[80px] resize-none"
                        />
                        <Button onClick={handleSend} disabled={activeTab === 'system'} size="sm" className="h-[80px]">Send</Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
