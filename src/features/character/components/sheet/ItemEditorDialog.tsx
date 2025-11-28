import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Item } from '@/features/character/domain/CharacterLog';
import React, { useEffect, useState } from 'react';

interface ItemEditorDialogProps {
    isOpen: boolean;
    onClose: () => void;
    initialItem?: Partial<Item>;
    onSave: (item: Partial<Item>) => void;
    mode: 'add' | 'edit';
}

export const ItemEditorDialog: React.FC<ItemEditorDialogProps> = ({
    isOpen,
    onClose,
    initialItem,
    onSave,
    mode
}) => {
    const [item, setItem] = useState<Partial<Item>>({
        name: '',
        type: 'Other',
        description: '',
        ...initialItem
    });

    useEffect(() => {
        if (isOpen) {
            setItem({
                name: '',
                type: 'Other',
                description: '',
                ...initialItem
            });
        }
    }, [isOpen, initialItem]);

    const handleChange = (field: keyof Item, value: string) => {
        setItem(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = () => {
        onSave(item);
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
                            <Input value={item.name} onChange={e => handleChange('name', e.target.value)} placeholder="名称" />
                        </div>
                        <div className="grid gap-2">
                            <Label>種別</Label>
                            <Select
                                value={item.type || 'Other'}
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
                        <Input value={item.description} onChange={e => handleChange('description', e.target.value)} />
                    </div>

                    <div className="grid grid-cols-2 gap-4 border-t pt-4 mt-2">
                        <div className="grid gap-2">
                            <Label>判定 (Roll)</Label>
                            <Input value={item.roll} onChange={e => handleChange('roll', e.target.value)} placeholder="2d6+Str" />
                        </div>
                        <div className="grid gap-2">
                            <Label>効果 (Effect)</Label>
                            <Input value={item.effect} onChange={e => handleChange('effect', e.target.value)} placeholder="k20+5" />
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
