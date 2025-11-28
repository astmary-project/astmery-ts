import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2 } from 'lucide-react';
import { CharacterLogEntry } from '../../domain/CharacterLog';
import { LogEditor } from '../LogEditor';

interface HistoryPanelProps {
    logs: CharacterLogEntry[];
    onAddLog: (log: Omit<CharacterLogEntry, 'id' | 'timestamp'>) => void;
    onDeleteLog: (logId: string) => void;
}

export const HistoryPanel = ({ logs, onAddLog, onDeleteLog }: HistoryPanelProps) => {
    return (
        <div className="space-y-6">
            <LogEditor onAddLog={onAddLog} />
            <Card>
                <CardHeader>
                    <CardTitle>History Log</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {[...logs]
                            .reverse()
                            .map((log) => (
                                <div key={log.id} className="text-sm border-b pb-2 last:border-0 group relative pr-8">
                                    <div className="flex justify-between text-muted-foreground text-xs mb-1">
                                        <span>{new Date(log.timestamp).toLocaleString()}</span>
                                        <span className="font-mono">{log.type}</span>
                                    </div>
                                    <div>
                                        {log.type === 'GROW_STAT' && `Growth: ${log.statGrowth?.key} +${log.statGrowth?.value}`}
                                        {log.type === 'GAIN_EXP' && `Gained ${log.value} EXP`}
                                        {log.type === 'SPEND_EXP' && `Spent ${log.value} EXP`}
                                        {log.type === 'LEARN_SKILL' && `Learned Skill: ${log.skill?.name || log.stringValue || 'Unknown'}`}
                                        {log.type === 'EQUIP' && `Equipped: ${log.item?.name || log.stringValue || 'Unknown'}`}
                                        {log.description && <span className="text-muted-foreground ml-2">- {log.description}</span>}
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute top-2 right-0 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                                        onClick={() => onDeleteLog(log.id)}
                                        title="Delete Log"
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </div>
                            ))}
                    </div>

                </CardContent>
            </Card>
        </div >
    );
};
