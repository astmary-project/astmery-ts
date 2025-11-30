import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CustomStatInput } from '@/features/character/domain/service/CharacterSetupService';
import { Plus, Trash2 } from 'lucide-react';

interface CustomStatEditorProps {
    stats: CustomStatInput[];
    onChange: (stats: CustomStatInput[]) => void;
}

export function CustomStatEditor({ stats, onChange }: CustomStatEditorProps) {
    const handleCustomStatChange = (index: number, field: keyof CustomStatInput, value: string | boolean) => {
        const newStats = [...stats];
        // Note: Using any for assignment because value is union type but field is specific type.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (newStats[index] as any)[field] = value;
        onChange(newStats);
    };

    const addCustomStat = () => {
        onChange([...stats, { key: '', label: '', value: '0', isMain: false }]);
    };

    const removeCustomStat = (index: number) => {
        onChange(stats.filter((_, i) => i !== index));
    };

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">カスタムステータス</h3>
            <div className="space-y-3">
                {stats.map((stat, index) => (
                    <div key={index} className="flex gap-2 items-center">
                        <Input
                            placeholder="ID (例: karma)"
                            value={stat.key}
                            onChange={e => handleCustomStatChange(index, 'key', e.target.value)}
                            className="w-1/3"
                        />
                        <Input
                            placeholder="表示名 (例: カルマ)"
                            value={stat.label}
                            onChange={e => handleCustomStatChange(index, 'label', e.target.value)}
                            className="w-1/3"
                        />
                        <Input
                            type="number"
                            placeholder="値"
                            value={stat.value}
                            onChange={e => handleCustomStatChange(index, 'value', e.target.value)}
                            className="w-20"
                        />
                        <div className="flex items-center gap-2">
                            <Label htmlFor={`main-${index}`} className="text-xs whitespace-nowrap">メイン</Label>
                            <input
                                type="checkbox"
                                id={`main-${index}`}
                                checked={stat.isMain}
                                onChange={e => handleCustomStatChange(index, 'isMain', e.target.checked)}
                            />
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeCustomStat(index)}
                            className="text-destructive"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                ))}
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addCustomStat}>
                <Plus className="mr-2 h-4 w-4" /> ステータスを追加
            </Button>
        </div>
    );
}
