import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ItemInput } from '@/features/character/domain/service/CharacterSetupService';
import { Plus, Trash2 } from 'lucide-react';

interface EquipmentListEditorProps {
    equipment: ItemInput[];
    onChange: (equipment: ItemInput[]) => void;
}

export function EquipmentListEditor({ equipment, onChange }: EquipmentListEditorProps) {
    const handleEquipmentChange = (index: number, field: keyof ItemInput, value: string) => {
        const newItems = [...equipment];
        // @ts-expect-error TODO: fix type
        newItems[index][field] = value;
        onChange(newItems);
    };

    const addEquipment = () => {
        onChange([...equipment, { id: crypto.randomUUID(), name: '', type: 'Weapon', summary: '', effect: '' }]);
    };

    const removeEquipment = (index: number) => {
        onChange(equipment.filter((_, i) => i !== index));
    };

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">装備</h3>
            <div className="space-y-3">
                {equipment.map((item, index) => (
                    <div key={item.id} className="flex gap-2 items-start p-3 border rounded-md bg-card">
                        <div className="grid gap-2 flex-1">
                            <div className="flex gap-2">
                                <Input
                                    placeholder="アイテム名"
                                    value={item.name}
                                    onChange={e => handleEquipmentChange(index, 'name', e.target.value)}
                                    className="flex-1"
                                />
                                <Select
                                    value={item.type}
                                    onValueChange={v => handleEquipmentChange(index, 'type', v as "Weapon" | "Armor" | "Accessory" | "Other")}
                                >
                                    <SelectTrigger className="w-[120px]">
                                        <SelectValue placeholder="種別" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Weapon">武器</SelectItem>
                                        <SelectItem value="Armor">防具</SelectItem>
                                        <SelectItem value="Accessory">装飾</SelectItem>
                                        <SelectItem value="Other">その他</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <Input
                                placeholder="概要 (フレーバーテキスト)"
                                value={item.summary}
                                onChange={e => handleEquipmentChange(index, 'summary', e.target.value)}
                            />
                            <Input
                                placeholder="効果 / 補正 (例: 攻撃+2)"
                                value={item.effect}
                                onChange={e => handleEquipmentChange(index, 'effect', e.target.value)}
                            />
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeEquipment(index)}
                            className="text-destructive"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                ))}
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addEquipment}>
                <Plus className="mr-2 h-4 w-4" /> 装備を追加
            </Button>
        </div>
    );
}
