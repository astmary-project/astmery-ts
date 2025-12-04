import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { STAT_LABELS } from '@/features/character';
import { useCharacterData } from '@/features/character/hooks/useCharacterData';
import { MessageSquare } from 'lucide-react';
import { ReactNode } from 'react';
import { SessionParticipant } from '../domain/SessionRoster';

interface RosterItemTooltipProps {
    participant: SessionParticipant;
    children: ReactNode;
}

export function RosterItemTooltip({ participant, children }: RosterItemTooltipProps) {
    // If it's an extra, we don't have detailed stats to show (unless we store them in state later)
    // For now, only show for linked characters
    if (participant.type !== 'linked' || !participant.characterId) {
        return <>{children}</>;
    }

    return (
        <TooltipProvider delayDuration={300}>
            <Tooltip>
                <TooltipTrigger asChild>
                    {children}
                </TooltipTrigger>
                <TooltipContent side="right" className="w-80 p-0 bg-transparent border-none shadow-none">
                    <CharacterStatsCard characterId={participant.characterId} nextAction={participant.state.nextAction} />
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

function CharacterStatsCard({ characterId, nextAction }: { characterId: string, nextAction?: string }) {
    const { state } = useCharacterData(characterId);

    if (!state) return null;

    const basicStats = [
        'Body', 'Spirit', 'Combat', 'Science', 'Magic', 'SpellKnowledge', 'ActionSpeed', 'DamageDice'
    ];

    const defenseStats = [
        'Defense', 'MagicDefense'
    ];

    return (
        <div className="bg-popover/95 backdrop-blur-sm border rounded-lg shadow-lg p-4 text-popover-foreground space-y-3">
            {/* Next Action Section */}
            {nextAction && (
                <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-md p-2 mb-2">
                    <div className="flex items-center gap-2 mb-1">
                        <MessageSquare className="w-3 h-3 text-indigo-500" />
                        <span className="text-xs font-bold text-indigo-500 uppercase tracking-wider">Next Action</span>
                    </div>
                    <p className="text-sm font-medium leading-snug break-words">{nextAction}</p>
                </div>
            )}

            <div className="flex items-center justify-between border-b pb-2">
                <span className="font-bold text-sm">Grade {state.stats.Grade ?? 0}</span>
                <div className="flex gap-1 flex-wrap justify-end">
                    {Array.from(state.tags).map(tag => (
                        <span key={tag} className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded border border-primary/20">
                            {tag}
                        </span>
                    ))}
                </div>
            </div>

            <div className="space-y-2">
                <div>
                    <h5 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Basic Stats</h5>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                        {basicStats.map(key => (
                            <div key={key} className="flex justify-between text-xs">
                                <span className="text-muted-foreground">{STAT_LABELS[key] ?? key}</span>
                                <span className="font-medium">{state.stats[key] ?? state.derivedStats[key] ?? 0}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div>
                    <h5 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Defense</h5>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                        {defenseStats.map(key => (
                            <div key={key} className="flex justify-between text-xs">
                                <span className="text-muted-foreground">{STAT_LABELS[key] ?? key}</span>
                                <span className="font-medium">{state.derivedStats[key] ?? state.stats[key] ?? 0}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
