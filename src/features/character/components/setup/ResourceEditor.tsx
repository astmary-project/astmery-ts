import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ResourceInput } from '@/features/character/domain/service/CharacterSetupService';
import { Plus, Trash2 } from 'lucide-react';

interface ResourceEditorProps {
    resources: ResourceInput[];
    onChange: (resources: ResourceInput[]) => void;
}

export function ResourceEditor({ resources, onChange }: ResourceEditorProps) {
    const handleResourceChange = (index: number, field: keyof ResourceInput, value: string) => {
        const newResources = [...resources];
        // @ts-ignore
        newResources[index][field] = value;
        onChange(newResources);
    };

    const addResource = () => {
        onChange([...resources, { id: crypto.randomUUID(), name: '', max: '10', initial: '10' }]);
    };

    const removeResource = (index: number) => {
        onChange(resources.filter((_, i) => i !== index));
    };

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">リソース (HP/MP以外)</h3>
            <div className="space-y-3">
                {resources.map((res, index) => (
                    <div key={res.id} className="flex gap-2 items-center">
                        <Input
                            placeholder="名称 (例: 弾薬)"
                            value={res.name}
                            onChange={e => handleResourceChange(index, 'name', e.target.value)}
                            className="flex-1"
                        />
                        <div className="flex items-center gap-1">
                            <span className="text-sm">最大:</span>
                            <Input
                                type="number"
                                value={res.max}
                                onChange={e => handleResourceChange(index, 'max', e.target.value)}
                                className="w-20"
                            />
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="text-sm">初期:</span>
                            <Input
                                type="number"
                                value={res.initial}
                                onChange={e => handleResourceChange(index, 'initial', e.target.value)}
                                className="w-20"
                            />
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeResource(index)}
                            className="text-destructive"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                ))}
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addResource}>
                <Plus className="mr-2 h-4 w-4" /> リソースを追加
            </Button>
        </div>
    );
}
