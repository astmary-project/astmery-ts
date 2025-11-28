import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2 } from 'lucide-react';
import { CharacterLogEntry, CharacterState } from '../../domain/CharacterLog';

interface EquipmentPanelProps {
    state: CharacterState;
    onAddLog: (log: Omit<CharacterLogEntry, 'id' | 'timestamp'>) => void;
}

export const EquipmentPanel = ({ state, onAddLog }: EquipmentPanelProps) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Equipment</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {state.equipment.map((item) => (
                        <div key={item.id} className="flex items-center gap-4 border p-4 rounded-lg group relative">
                            <div className="flex-1">
                                <h4 className="font-bold">{item.name}</h4>
                                <p className="text-sm text-muted-foreground">{item.type}</p>
                            </div>
                            <div className="text-sm text-muted-foreground max-w-md">
                                {item.description}
                            </div>
                            <div className="absolute top-1/2 -translate-y-1/2 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                    onClick={() => onAddLog({
                                        type: 'UNEQUIP',
                                        item: item,
                                        description: `Unequipped ${item.name}`
                                    })}
                                >
                                    <Trash2 size={16} />
                                </Button>
                            </div>
                        </div>
                    ))}
                    {state.equipment.length === 0 && <p className="text-muted-foreground text-center py-8">No equipment equipped.</p>}
                </div>
            </CardContent>
        </Card>
    );
};
