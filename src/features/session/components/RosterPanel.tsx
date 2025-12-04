import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CharacterData } from '@/features/character/domain/repository/ICharacterRepository';
import { SupabaseCharacterRepository } from '@/features/character/infrastructure/SupabaseCharacterRepository';
import { cn } from '@/lib/utils';
import { Plus, Search, Trash2, UserPlus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { SessionParticipant } from '../domain/SessionRoster';
import { RosterItemTooltip } from './RosterItemTooltip';



interface RosterPanelProps {
    participants: SessionParticipant[];
    onAddExtra: (name: string) => void;
    onAddLinked: (character: CharacterData) => void;
    onRemove?: (id: string) => void;
    onUpdate?: (participant: SessionParticipant) => void;
    onStartCombat?: () => void;
    onNextRound?: () => void;
    className?: string;
}

export function RosterPanel({ participants, onAddExtra, onAddLinked, onRemove, onStartCombat, onNextRound, className }: RosterPanelProps) {
    const [isAddExtraOpen, setIsAddExtraOpen] = useState(false);
    const [extraName, setExtraName] = useState('');

    const [isImportOpen, setIsImportOpen] = useState(false);
    const [availableCharacters, setAvailableCharacters] = useState<CharacterData[]>([]);
    const [isLoadingCharacters, setIsLoadingCharacters] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const handleAddExtra = () => {
        if (!extraName.trim()) return;
        onAddExtra(extraName);
        setExtraName('');
        setIsAddExtraOpen(false);
    };

    useEffect(() => {
        if (isImportOpen && availableCharacters.length === 0) {
            const fetchCharacters = async () => {
                setIsLoadingCharacters(true);
                const repo = new SupabaseCharacterRepository();
                const result = await repo.listAll();
                if (result.isSuccess) {
                    setAvailableCharacters(result.value);
                }
                setIsLoadingCharacters(false);
            };
            fetchCharacters();
        }
    }, [isImportOpen, availableCharacters.length]);

    const filteredCharacters = availableCharacters.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Sort participants by Initiative (Descending)
    const sortedParticipants = [...participants].sort((a, b) => b.state.initiative - a.state.initiative);

    // Identify Active Character (Highest Positive Initiative)
    const activeParticipantId = sortedParticipants.find(p => p.state.initiative > 0)?.id;

    return (
        <Card className={cn("h-full flex flex-col min-h-0 border-none shadow-none bg-transparent", className)}>
            <CardHeader className="pb-2 px-4 pt-4 flex flex-col gap-2">
                <div className="flex flex-row items-center justify-between w-full">
                    <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Roster</CardTitle>
                    <div className="flex gap-1">
                        {/* Import Character Dialog */}
                        <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
                            <DialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6" title="Import Character">
                                    <Plus className="w-4 h-4" />
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md h-[80vh] flex flex-col">
                                <DialogHeader>
                                    <DialogTitle>Import Character</DialogTitle>
                                </DialogHeader>
                                <div className="relative mb-2">
                                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-8"
                                    />
                                </div>
                                <ScrollArea className="flex-1 -mx-6 px-6">
                                    <div className="flex flex-col gap-2 pb-4">
                                        {isLoadingCharacters ? (
                                            <div className="text-center py-4 text-muted-foreground">Loading...</div>
                                        ) : filteredCharacters.length === 0 ? (
                                            <div className="text-center py-4 text-muted-foreground">No characters found.</div>
                                        ) : (
                                            filteredCharacters.map(char => (
                                                <div
                                                    key={char.id}
                                                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer border border-transparent hover:border-border transition-colors"
                                                    onClick={() => {
                                                        onAddLinked(char);
                                                        setIsImportOpen(false);
                                                    }}
                                                >
                                                    <Avatar className="h-10 w-10 border">
                                                        <AvatarImage src={char.profile?.avatarUrl} />
                                                        <AvatarFallback>{char.name[0]}</AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-medium truncate">{char.name}</div>
                                                        <div className="text-xs text-muted-foreground truncate">{char.profile?.bio || 'No bio'}</div>
                                                    </div>
                                                    <Button size="sm" variant="ghost">Import</Button>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </ScrollArea>
                            </DialogContent>
                        </Dialog>

                        {/* Add Extra Dialog */}
                        <Dialog open={isAddExtraOpen} onOpenChange={setIsAddExtraOpen}>
                            <DialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6" title="Add Extra (NPC)">
                                    <UserPlus className="w-4 h-4" />
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Add Extra (NPC)</DialogTitle>
                                </DialogHeader>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Name (e.g. Goblin A)"
                                        value={extraName}
                                        onChange={(e) => setExtraName(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddExtra()}
                                    />
                                    <Button onClick={handleAddExtra}>Add</Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>
                {/* Combat Toolbar */}
                <div className="flex gap-2 w-full">
                    <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 h-7 text-xs"
                        onClick={onStartCombat}
                        title="Reset all initiative to 0"
                    >
                        Start Combat
                    </Button>
                    <Button
                        variant="default"
                        size="sm"
                        className="flex-1 h-7 text-xs bg-indigo-600 hover:bg-indigo-700"
                        onClick={onNextRound}
                        title="Add Action Speed + 2d6 to all"
                    >
                        Next Round
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 px-4 pb-4 overflow-y-auto no-scrollbar">
                <div className="flex flex-col gap-3">
                    {sortedParticipants.map((participant) => (
                        <RosterItemTooltip key={participant.id} participant={participant}>
                            <div
                                className={cn(
                                    "group relative bg-background/60 backdrop-blur-md border rounded-xl p-3 shadow-sm hover:bg-background/80 transition-all duration-200 cursor-grab active:cursor-grabbing",
                                    participant.id === activeParticipantId ? "ring-2 ring-yellow-500 border-yellow-500/50 bg-yellow-500/5" : ""
                                )}
                                draggable
                                onDragStart={(e) => {
                                    e.dataTransfer.setData('application/json', JSON.stringify({
                                        type: 'ROSTER_PARTICIPANT',
                                        participantId: participant.id,
                                        name: participant.name,
                                        avatarUrl: participant.avatarUrl, // Added avatarUrl
                                        size: 1 // Default size
                                    }));
                                    e.dataTransfer.effectAllowed = 'copy';
                                }}
                            >
                                {/* Remove Button (Visible on Hover) */}
                                {onRemove && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onRemove(participant.id);
                                        }}
                                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-100 hover:text-red-500 rounded-md z-10"
                                        title="Remove from Roster"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                )}

                                <div className="flex items-center gap-3 mb-2">
                                    <Avatar className="h-10 w-10 border-2 border-primary/20 shadow-sm">
                                        <AvatarImage src={participant.avatarUrl} />
                                        <AvatarFallback className={cn(
                                            "font-bold",
                                            participant.type === 'extra' ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"
                                        )}>
                                            {participant.name[0]}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0 pr-7">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="font-bold text-sm truncate">{participant.name}</span>
                                            <span className={cn(
                                                "text-xs font-mono font-bold px-1.5 py-0.5 rounded",
                                                participant.state.initiative > 0 ? "bg-blue-500/20 text-blue-600" : "bg-muted text-muted-foreground"
                                            )}>
                                                {participant.state.initiative}
                                            </span>
                                        </div>



                                        {participant.type === 'extra' && (
                                            <div className="text-[10px] text-muted-foreground italic">
                                                Extra
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {participant.type === 'linked' && (
                                    <div className="space-y-1.5">
                                        <div className="space-y-0.5">
                                            <div className="flex justify-between text-[10px] font-medium">
                                                <span className="text-green-600">HP</span>
                                                <span>{participant.state.hp.current} / {participant.state.hp.max}</span>
                                            </div>
                                            <Progress value={(participant.state.hp.current / participant.state.hp.max) * 100} className="h-1.5 bg-green-100 [&>div]:bg-green-500" />
                                        </div>
                                        <div className="space-y-0.5">
                                            <div className="flex justify-between text-[10px] font-medium">
                                                <span className="text-blue-600">MP</span>
                                                <span>{participant.state.mp.current} / {participant.state.mp.max}</span>
                                            </div>
                                            <Progress value={(participant.state.mp.current / participant.state.mp.max) * 100} className="h-1.5 bg-blue-100 [&>div]:bg-blue-500" />
                                        </div>
                                        {/* Custom Resources */}
                                        {participant.state.resources && participant.state.resources.map(res => (
                                            <div key={res.id} className="space-y-0.5">
                                                <div className="flex justify-between text-[10px] font-medium">
                                                    <span className="text-purple-600">{res.name}</span>
                                                    <span>{res.current} / {res.max}</span>
                                                </div>
                                                <Progress value={(res.current / res.max) * 100} className="h-1.5 bg-purple-100 [&>div]:bg-purple-500" />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </RosterItemTooltip>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
