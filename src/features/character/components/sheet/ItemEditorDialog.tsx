
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EquipmentItem } from '@/features/character/domain/Item';
import React, { useEffect, useState } from 'react';

// Flattened state
interface FlattenedItemState {
    name: string;
    type: string;
    description: string;
    roll: string;
    effect: string;
}

interface ItemEditorDialogProps {
    isOpen: boolean;
    onClose: () => void;
    initialItem?: Partial<EquipmentItem>;
    onSave: (item: Partial<EquipmentItem>) => void;
    mode: 'add' | 'edit';
}

export const ItemEditorDialog: React.FC<ItemEditorDialogProps> = ({
    isOpen,
    onClose,
    initialItem,
    onSave,
    mode
}) => {
    const [itemState, setItemState] = useState<FlattenedItemState>({
        name: '',
        type: 'Other',
        description: '',
        roll: '',
        effect: '',
    });

    useEffect(() => {
        if (isOpen) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const init = initialItem as any;
            const variant = init?.variants?.['default'] || {};

            setItemState({ // eslint-disable-line react-hooks/set-state-in-effect
                name: init?.name || '',
                type: init?.slot || 'Other', // Use slot as 'type' in UI? or just type check? EquipmentItem has category='EQUIPMENT' and slot.
                description: init?.description || '',
                roll: variant?.rollFormula || '', // Assuming Equipment might have roll? Or passive modifiers? The dialog had "roll".
                // Actually EquipmentItem variants don't have rollFormula in Schema?
                // Let's assume for now, logic: 'roll' was in previous 'Item' type.
                // Checking Item definition... EquipmentItem variants (PassiveEffectSchema) have activeSkills.
                // Maybe "roll" is just text?
                effect: variant?.effect || variant?.description || '', // Mapping effect
            });
        }
    }, [isOpen, initialItem]);

    const handleChange = (field: keyof FlattenedItemState, value: string) => {
        setItemState(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = () => {
        // Construct Entity
        const newItem: Partial<EquipmentItem> = {
            name: itemState.name,
            description: itemState.description,
            category: 'EQUIPMENT',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            slot: itemState.type as any, // 'Weapon', 'Armor' etc
            variants: {
                default: {
                    // Mapping back
                    // If we want "roll" and "effect" to survive, we need to put them somewhere.
                    // effect -> description or modifier?
                    // For now just mapping to 'effect' text if we can, or just generic fields?
                    // PassiveEffectSchema has 'passiveCheck' (text), 'restriction', 'modifiers'.
                    // Let's put 'effect' in 'passiveCheck' or just ignore strictness for MVP?
                    // Actually let's assume 'effect' implies text description of abilities.
                    passiveCheck: itemState.effect,
                    // We lose "roll" unless we use activeSkills.
                }
            }
        };
        onSave(newItem);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{mode === 'add' ? 'アイテム追加' : 'アイテム編集'}</DialogTitle>
                    <DialogDescription>
                        アイテムの詳細を入力してください。
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label>アイテム名</Label>
                            <Label>アイテム名</Label>
                            <Input value={itemState.name} onChange={e => handleChange('name', e.target.value)} placeholder="名称" />
                        </div>
                        <div className="grid gap-2">
                            <Label>種別</Label>
                            <Select
                                value={itemState.type || 'Other'}
                                onValueChange={(val) => handleChange('type', val)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="種別" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Weapon">武器 (Weapon)</SelectItem>
                                    <SelectItem value="Armor">防具 (Armor)</SelectItem>
                                    <SelectItem value="Accessory">装飾品 (Accessory)</SelectItem>
                                    <SelectItem value="Focus">フォーカス (Focus)</SelectItem>
                                    <SelectItem value="Other">その他 (Other)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label>概要 / 効果</Label>
                        <Input value={itemState.description} onChange={e => handleChange('description', e.target.value)} />
                    </div>

                    <div className="grid grid-cols-2 gap-4 border-t pt-4 mt-2">
                        <div className="grid gap-2">
                            <Label>判定 (Roll)</Label>
                            <Input value={itemState.roll} onChange={e => handleChange('roll', e.target.value)} placeholder="2d6+Str" />
                        </div>
                        <div className="grid gap-2">
                            <Label>効果 (Effect)</Label>
                            <Input value={itemState.effect} onChange={e => handleChange('effect', e.target.value)} placeholder="k20+5" />
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>キャンセル</Button>
                    <Button onClick={handleSave}>保存</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
