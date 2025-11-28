import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dices, Plus, Settings2, Trash2 } from 'lucide-react';
import React, { useState } from 'react';
import { CharacterLogEntry, CharacterState, Item } from '../../domain/CharacterLog';
import { ItemEditorDialog } from './ItemEditorDialog';

interface EquipmentPanelProps {
    state: CharacterState;
    onRoll: (formula: string, description?: string) => void;
    isEditMode?: boolean;
    onAddItem?: (item: Item) => void;
    onUpdateItem?: (item: Item) => void;
    onAddLog: (log: Omit<CharacterLogEntry, 'id' | 'timestamp'>) => void;
}

export const EquipmentPanel: React.FC<EquipmentPanelProps> = ({ state, onAddLog, onRoll, isEditMode = false, onAddItem, onUpdateItem }) => {
    const [editingItem, setEditingItem] = useState<{ item: Partial<Item>; mode: 'add' | 'edit' } | null>(null);

    const handleAddClick = () => {
        setEditingItem({ item: {}, mode: 'add' });
    };

    const handleEditClick = (item: Item) => {
        setEditingItem({ item, mode: 'edit' });
    };

    const handleSaveItem = (item: Partial<Item>) => {
        if (editingItem?.mode === 'add' && onAddItem) {
            onAddItem({ ...item, id: crypto.randomUUID() } as Item);
        } else if (editingItem?.mode === 'edit' && onUpdateItem) {
            onUpdateItem(item as Item);
        }
        setEditingItem(null);
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle>Equipment</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {state.equipment.map((item) => (
                        <div key={item.id} className="p-3 border rounded-lg bg-card hover:bg-accent/5 transition-colors group relative">
                            {/* Delete Button (Hover) */}
                            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                {isEditMode && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                                        onClick={() => handleEditClick(item)}
                                    >
                                        <Settings2 size={16} />
                                    </Button>
                                )}
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

                            <div className="flex justify-between items-start mb-1 pr-16">
                                <div className="font-medium flex items-center gap-2">
                                    {item.name}
                                    <Badge variant="outline" className="text-[10px] h-5">
                                        {item.type}
                                    </Badge>
                                </div>
                            </div>
                            <div className="text-sm text-muted-foreground mb-2">
                                {item.description}
                            </div>
                            {/* Item Mechanics Display */}
                            {(item.roll || item.effect) && (
                                <div className="mt-2 pt-2 border-t flex gap-4 text-xs font-mono text-foreground/80">
                                    {item.roll && (
                                        <div className="flex items-center gap-1">
                                            <span className="text-muted-foreground">Roll:</span>
                                            {item.roll}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-5 w-5 ml-1"
                                                onClick={() => onRoll(item.roll!, `${item.name} Check`)}
                                                title="Roll Check"
                                            >
                                                <Dices className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    )}
                                    {item.effect && (
                                        <div className="flex items-center gap-1">
                                            <span className="text-muted-foreground">Effect:</span>
                                            {item.effect}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-5 w-5 ml-1"
                                                onClick={() => onRoll(item.effect!, `${item.name} Effect`)}
                                                title="Roll Effect"
                                            >
                                                <Dices className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                    {state.equipment.length === 0 && <p className="text-muted-foreground text-center py-8">装備品がありません。</p>}

                    {isEditMode && (
                        <div className="mt-6 border-t pt-4">
                            <Button className="w-full" variant="outline" onClick={handleAddClick}>
                                <Plus className="mr-2 h-4 w-4" /> アイテムを追加
                            </Button>
                        </div>
                    )}

                    {editingItem && (
                        <ItemEditorDialog
                            isOpen={!!editingItem}
                            onClose={() => setEditingItem(null)}
                            initialItem={editingItem.item}
                            onSave={handleSaveItem}
                            mode={editingItem.mode}
                        />
                    )}
                </div>
            </CardContent>
        </Card>
    );
};
