import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
            acquisitionType: 'Standard', // Default
            summary: '', // New
            effect: '',
            restriction: '', // New
            timing: '', cooldown: '', target: '', range: '', cost: '', rollModifier: '',
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
                                        value={
                                            // Display Japanese for standard types, otherwise raw value
                                            skill.type === 'Active' ? 'アクティブ' :
                                                skill.type === 'Passive' ? 'パッシブ' :
                                                    skill.type === 'Spell' ? '魔術' :
                                                        skill.type
                                        }
                                        onChange={e => {
                                            // If user types, it becomes a custom type (raw value)
                                            // Note: If they type "アクティブ", it saves as "アクティブ", not "Active".
                                            // This is acceptable as per user request for manual input.
                                            handleSkillChange(index, 'type', e.target.value);
                                        }}
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
                                            <DropdownMenuItem onClick={() => handleSkillChange(index, 'type', 'Spell')}>
                                                魔術
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                                <Select
                                    value={skill.acquisitionType || 'Standard'}
                                    onValueChange={(val) => handleSkillChange(index, 'acquisitionType', val)}
                                >
                                    <SelectTrigger className="w-[130px]">
                                        <SelectValue placeholder="習得種別" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Free">無料習得</SelectItem>
                                        <SelectItem value="Standard">自由習得</SelectItem>
                                        <SelectItem value="Grade">グレード習得</SelectItem>
                                    </SelectContent>
                                </Select>
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
                                                    <Label>制限</Label>
                                                    <Input value={skill.restriction} onChange={e => handleSkillChange(index, 'restriction', e.target.value)} />
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
                                                    <Label>消費コスト</Label>
                                                    <Input
                                                        value={skill.cost}
                                                        onChange={e => handleSkillChange(index, 'cost', e.target.value)}
                                                        placeholder="MP-5, 弾薬-1"
                                                    />
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
                                                    <Label>判定補正 (Roll Modifier)</Label>
                                                    <Input value={skill.rollModifier} onChange={e => handleSkillChange(index, 'rollModifier', e.target.value)} placeholder="2, -1" />
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
