import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SpecialtyElementInput } from '@/features/character/domain/service/CharacterSetupService';
import { Plus, Trash2 } from 'lucide-react';

interface SpecialtyElementEditorProps {
    elements: SpecialtyElementInput[];
    onChange: (elements: SpecialtyElementInput[]) => void;
}

export function SpecialtyElementEditor({ elements, onChange }: SpecialtyElementEditorProps) {
    const handleElementChange = (index: number, field: keyof SpecialtyElementInput, value: string) => {
        const newElements = [...elements];
        newElements[index][field] = value;
        onChange(newElements);
    };

    const addElement = () => {
        onChange([...elements, { name: '', benefit: '' }]);
    };

    const removeElement = (index: number) => {
        const newElements = elements.filter((_, i) => i !== index);
        onChange(newElements);
    };

    return (
        <div className="space-y-2">
            <Label>得意属性・要素</Label>
            <div className="space-y-2">
                {elements.map((el, index) => (
                    <div key={index} className="flex gap-2 items-start">
                        <div className="flex-1">
                            <Input
                                placeholder="属性名 (例: 火)"
                                value={el.name}
                                onChange={e => handleElementChange(index, 'name', e.target.value)}
                            />
                        </div>
                        <div className="flex-1">
                            <Input
                                placeholder="恩恵 (例: 攻撃+1)"
                                value={el.benefit}
                                onChange={e => handleElementChange(index, 'benefit', e.target.value)}
                            />
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeElement(index)}
                            className="text-destructive hover:text-destructive/90"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                ))}
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addElement} className="mt-2">
                <Plus className="mr-2 h-4 w-4" /> 要素を追加
            </Button>
        </div>
    );
}
