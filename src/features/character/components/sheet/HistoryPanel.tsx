import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2 } from 'lucide-react';
import { CharacterEvent } from '../../domain/Event';
import { LogEditor } from '../LogEditor';

interface HistoryPanelProps {
    events: CharacterEvent[];
    onAddEvent: (event: Omit<CharacterEvent, 'id' | 'timestamp'>) => void;
    onDeleteEvent: (eventId: string) => void;
    isEditMode?: boolean;
}

export const HistoryPanel = ({ events, onAddEvent, onDeleteEvent, isEditMode }: HistoryPanelProps) => {
    return (
        <div className="space-y-6">
            {isEditMode && <LogEditor onAddEvent={onAddEvent} />}
            <Card>
                <CardHeader>
                    <CardTitle>History Log</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {[...events]
                            .reverse()
                            .map((event) => (
                                <div key={event.id} className="text-sm border-b pb-2 last:border-0 group relative pr-8">
                                    <div className="flex justify-between text-muted-foreground text-xs mb-1">
                                        <span>{new Date(event.timestamp).toLocaleString()}</span>
                                        <span className="font-mono">{event.type}</span>
                                    </div>
                                    <div>
                                        {event.type === 'STAT_GROWN' && `Growth: ${event.key} +${event.delta}`}
                                        {event.type === 'EXPERIENCE_GAINED' && `Gained ${event.amount} EXP`}
                                        {event.type === 'EXPERIENCE_SPENT' && `Spent ${event.amount} EXP`}
                                        {event.type === 'SKILL_LEARNED' && `Learned Skill: ${event.skill.name}`}
                                        {event.type === 'ITEM_ADDED' && `Added Item: ${event.item.name}`}
                                        {event.description && <span className="text-muted-foreground ml-2">- {event.description}</span>}
                                    </div>
                                    {isEditMode && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="absolute top-2 right-0 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                                            onClick={() => onDeleteEvent(event.id)}
                                            title="Delete Log"
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    )}
                                </div>
                            ))}
                    </div>

                </CardContent>
            </Card>
        </div >
    );
};
