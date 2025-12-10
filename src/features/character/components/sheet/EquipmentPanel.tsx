/* eslint-disable @typescript-eslint/no-explicit-any */
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Settings2, Trash2 } from 'lucide-react';
import React, { useState } from 'react';
import { CharacterEvent } from '../../domain/Event';
import { EquipmentItem, InventoryItem as Item } from '../../domain/Item';
import { CharacterState } from '../../domain/models';
import { ItemEditorDialog } from './ItemEditorDialog';

interface EquipmentPanelProps {
    state: CharacterState;
    onRoll: (formula: string, description?: string) => void;
    isEditMode?: boolean;
    onAddItem?: (item: Item) => void;
    onUpdateItem?: (item: Item) => void;
    onAddLog: (log: Omit<CharacterEvent, 'id' | 'timestamp'>) => void;
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

    // Filter for Equipment items
    // If state.inventory has items with category 'EQUIPMENT'
    const equipmentItems = state.inventory.filter(i => i.category === 'EQUIPMENT') as Extract<Item, { category: 'EQUIPMENT' }>[];

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle>Equipment</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {equipmentItems.map((item) => {
                        const isEquipped = state.equipmentSlots.some(s => s.id === item.id);
                        const variant = item.variants[item.currentVariant] || item.variants.default;

                        return (
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
                                    {/* Unequip or Delete? 
                                    Old code had "UNEQUIP". 
                                    If it is equipped, we should unequip.
                                    If it is NOT equipped, maybe we delete (remove from inventory)?
                                    For now, mapping generic "Remove" to Log logic.
                                */}
                                    {isEquipped ? (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-muted-foreground hover:text-warning"
                                            onClick={() => onAddLog({
                                                type: 'ITEM_UNEQUIPPED', // Correct Event Type
                                                itemId: item.id,
                                                slot: item.slot, // Assuming slot matches where it was equipped
                                                description: `Unequipped ${item.name}`
                                            } as any)}
                                            title="Unequip"
                                        >
                                            <span className="text-xs">Un</span>
                                        </Button>
                                    ) : (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                            onClick={() => onAddLog({
                                                type: 'ITEM_REMOVED',
                                                itemId: item.id,
                                                description: `Removed ${item.name}`
                                            } as any)}
                                            title="Remove"
                                        >
                                            <Trash2 size={16} />
                                        </Button>
                                    )}

                                    {/* Equip Button if not equipped? */}
                                    {!isEquipped && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                                            onClick={() => onAddLog({
                                                type: 'ITEM_EQUIPPED',
                                                itemId: item.id,
                                                slot: item.slot, // Default slot
                                                description: `Equipped ${item.name}`
                                            } as any)}
                                            title="Equip"
                                        >
                                            <Plus size={16} />
                                        </Button>
                                    )}
                                </div>

                                <div className="flex justify-between items-start mb-1 pr-16">
                                    <div className="font-medium flex items-center gap-2">
                                        {item.name}
                                        {isEquipped && <Badge className="text-[10px] h-5">Equipped</Badge>}
                                        {/* Subtype if available (legacy or variant data) */}
                                        {/* <Badge variant="outline" className="text-[10px] h-5">{item.slot}</Badge> */}
                                    </div>
                                </div>
                                <div className="text-sm text-muted-foreground mb-2">
                                    {/* Description/Effect display */}
                                    {item.description}
                                    {variant.passiveCheck && (
                                        <div className="mt-1 text-xs opacity-90 italic">{variant.passiveCheck}</div>
                                    )}
                                </div>

                                {/* Mechanics */}
                                {/* Assuming variant has modifiers/effects we might want to roll or display */}
                                {/* (Mechanics display logic omitted or simplified since schema changed structure) */}
                            </div>
                        );
                    })}
                    {equipmentItems.length === 0 && <p className="text-muted-foreground text-center py-8">装備品がありません。</p>}

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
                            initialItem={editingItem.item as Partial<EquipmentItem>}
                            // Mapping legacy onSave if needed, but here we pass directly
                            onSave={(item) => handleSaveItem(item as Item)}
                            mode={editingItem.mode}
                        />
                    )}
                </div>
            </CardContent>
        </Card>
    );
};
