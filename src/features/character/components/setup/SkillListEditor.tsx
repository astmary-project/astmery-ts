import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SkillInput } from '@/features/character/domain/service/CharacterSetupService';
import { ChevronDown, Plus, Settings2, Trash2 } from 'lucide-react';

interface SkillListEditorProps {
    skills: SkillInput[];
    onChange: (skills: SkillInput[]) => void;
}

export function SkillListEditor({ skills, onChange }: SkillListEditorProps) {
    const handleSkillChange = (index: number, field: keyof SkillInput, value: string) => {
        const newSkills = [...skills];
        // @ts-ignore
        newSkills[index][field] = value;
        onChange(newSkills);
    };

    const addSkill = () => {
        onChange([...skills, {
            id: crypto.randomUUID(),
            name: '',
            type: 'Passive',
            summary: '', // New
            effect: '',
            timing: '', cooldown: '', target: '', range: '', cost: '', roll: '',
            magicGrade: '', shape: '', duration: '', activeCheck: '', passiveCheck: '', chatPalette: ''
        }]);
    };

    const removeSkill = (index: number) => {
        onChange(skills.filter((_, i) => i !== index));
    };

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">スキル</h3>
            <div className="space-y-3">
                {skills.map((skill, index) => (
                    <div key={skill.id} className="flex gap-2 items-start p-3 border rounded-md bg-card">
                        <div className="grid gap-2 flex-1">
                            <div className="flex gap-2">
                                <Input
                                    placeholder="スキル名"
                                    value={skill.name}
                                    onChange={e => handleSkillChange(index, 'name', e.target.value)}
                                    className="flex-1"
                                />
                                <div className="flex gap-1">
                                    <Input
                                        placeholder="種別"
                                        value={skill.type}
                                        onChange={e => handleSkillChange(index, 'type', e.target.value)}
                                        className="w-[120px]"
                                    />
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline" size="icon" className="shrink-0">
                                                <ChevronDown className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            <DropdownMenuItem onClick={() => handleSkillChange(index, 'type', 'Active')}>
                                                アクティブ
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleSkillChange(index, 'type', 'Passive')}>
                                                パッシブ
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleSkillChange(index, 'type', 'Magic')}>
                                                魔術
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="概要 (フレーバーテキスト)"
                                    value={skill.summary}
                                    onChange={e => handleSkillChange(index, 'summary', e.target.value)}
                                    className="flex-1"
                                />
                            </div>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="効果 / 補正 (例: 攻撃+1)"
                                    value={skill.effect}
                                    onChange={e => handleSkillChange(index, 'effect', e.target.value)}
                                    className="flex-1"
                                />
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" size="icon" title="詳細設定">
                                            <Settings2 className="h-4 w-4" />
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                                        <DialogHeader>
                                            <DialogTitle>スキル詳細設定: {skill.name}</DialogTitle>
                                            <DialogDescription>
                                                スキルの詳細なパラメータを設定します。
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="grid gap-4 py-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="grid gap-2">
                                                    <Label>タイミング</Label>
                                                    <Input value={skill.timing} onChange={e => handleSkillChange(index, 'timing', e.target.value)} />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label>魔術グレード</Label>
                                                    <Input value={skill.magicGrade} onChange={e => handleSkillChange(index, 'magicGrade', e.target.value)} />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label>CT (クールタイム)</Label>
                                                    <Input value={skill.cooldown} onChange={e => handleSkillChange(index, 'cooldown', e.target.value)} />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label>消費コスト</Label>
                                                    <Input value={skill.cost} onChange={e => handleSkillChange(index, 'cost', e.target.value)} />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label>対象</Label>
                                                    <Input value={skill.target} onChange={e => handleSkillChange(index, 'target', e.target.value)} />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label>射程</Label>
                                                    <Input value={skill.range} onChange={e => handleSkillChange(index, 'range', e.target.value)} />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label>形状</Label>
                                                    <Input value={skill.shape} onChange={e => handleSkillChange(index, 'shape', e.target.value)} />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label>継続</Label>
                                                    <Input value={skill.duration} onChange={e => handleSkillChange(index, 'duration', e.target.value)} />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label>能動判定</Label>
                                                    <Input value={skill.activeCheck} onChange={e => handleSkillChange(index, 'activeCheck', e.target.value)} />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label>受動判定</Label>
                                                    <Input value={skill.passiveCheck} onChange={e => handleSkillChange(index, 'passiveCheck', e.target.value)} />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label>判定式 (Roll)</Label>
                                                    <Input value={skill.roll} onChange={e => handleSkillChange(index, 'roll', e.target.value)} placeholder="2d6 + 攻撃" />
                                                </div>
                                            </div>
                                            <div className="grid gap-2">
                                                <Label>チャットパレット (任意)</Label>
                                                <Textarea
                                                    value={skill.chatPalette}
                                                    onChange={e => handleSkillChange(index, 'chatPalette', e.target.value)}
                                                    placeholder="2d6+5 攻撃判定&#13;&#10;k20+5 ダメージ"
                                                    rows={4}
                                                />
                                            </div>
                                        </div>
                                    </DialogContent>
                                </Dialog>
                            </div>
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeSkill(index)}
                            className="text-destructive"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                ))}
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addSkill}>
                <Plus className="mr-2 h-4 w-4" /> スキルを追加
            </Button>
        </div>
    );
}
