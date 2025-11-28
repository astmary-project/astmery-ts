
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import React, { useState } from 'react';
import { CharacterLogEntry, CharacterLogType } from '../domain/CharacterLog';
import { CharacterLogFactory } from '../domain/CharacterLogFactory';
import { ABILITY_STATS, STAT_LABELS } from '../domain/constants';

interface LogEditorProps {
    onAddLog: (log: Omit<CharacterLogEntry, 'id' | 'timestamp'>) => void;
}

export const LogEditor: React.FC<LogEditorProps> = ({ onAddLog }) => {
    const [type, setType] = useState<CharacterLogType>('GROWTH');
    const [statKey, setStatKey] = useState('Grade');
    const [value, setValue] = useState('');
    const [expCost, setExpCost] = useState('');
    const [comment, setComment] = useState('');

    // Skill/Item fields
    const [name, setName] = useState('');
    const [subtype, setSubtype] = useState('Active'); // For Skill type or Item type
    const [customSubtype, setCustomSubtype] = useState(''); // For custom skill type input
    const [description, setDescription] = useState('');
    const [modifiersJson, setModifiersJson] = useState('');
    const [dynamicModifiersJson, setDynamicModifiersJson] = useState('');
    const [isMainStat, setIsMainStat] = useState(false);

    // Skill specific fields
    const [timing, setTiming] = useState('');
    const [range, setRange] = useState('');
    const [target, setTarget] = useState('');
    const [cost, setCost] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        let log: CharacterLogEntry | null = null;

        if (type === 'GROWTH') {
            const numValue = parseFloat(value);
            if (isNaN(numValue)) return;
            log = CharacterLogFactory.createGrowthLog(statKey, numValue, comment);
        } else if (type === 'GAIN_EXP') {
            const numValue = parseFloat(value);
            if (isNaN(numValue)) return;
            log = CharacterLogFactory.createGainExpLog(numValue, comment || 'Gained EXP');
        } else if (type === 'SPEND_EXP') {
            const numValue = parseFloat(value);
            if (isNaN(numValue)) return;
            log = CharacterLogFactory.createSpendExpLog(numValue, comment || 'Spent EXP');
        } else if (type === 'LEARN_SKILL') {
            log = CharacterLogFactory.createSkillLog({
                name,
                type: subtype === 'Custom' ? customSubtype : subtype,
                description: description, // Skill description
                timing,
                range,
                target,
                cost,
                modifiersJson,
                dynamicModifiersJson
            });
            if (comment) log.description = `${log.description} - ${comment}`;
        } else if (type === 'EQUIP') {
            log = CharacterLogFactory.createItemLog({
                name,
                subtype,
                description: description, // Item description
                timing,
                range,
                modifiersJson,
                dynamicModifiersJson
            });
            if (comment) log.description = `${log.description} - ${comment}`;
        } else if (type === 'REGISTER_STAT_LABEL') {
            log = CharacterLogFactory.createRegisterStatLabelLog(statKey, name, isMainStat);
            if (comment) log.description = `${log.description} - ${comment}`;
        } else if (type === 'REGISTER_RESOURCE') {
            log = CharacterLogFactory.createRegisterResourceLog(name, Number(value), Number(cost));
            if (comment) log.description = `${log.description} - ${comment}`;
        }

        if (log) {
            onAddLog(log);
        }

        // Handle EXP Cost for Growth
        if (type === 'GROWTH' && expCost) {
            const costVal = parseFloat(expCost);
            if (!isNaN(costVal) && costVal > 0) {
                const costLog = CharacterLogFactory.createSpendExpLog(costVal, `Cost for ${statKey} growth`);
                onAddLog(costLog);
            }
        }

        // Reset fields
        setValue('');
        setExpCost('');
        setComment('');
        setName('');
        setDescription('');
        setModifiersJson('');
        setDynamicModifiersJson('');
        setIsMainStat(false);
        setTiming('');
        setRange('');
        setTarget('');
        setCost('');
        setCustomSubtype('');
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Add Log</CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Type</Label>
                            <Select value={type} onValueChange={(v) => setType(v as CharacterLogType)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="GROWTH">成長 (Growth)</SelectItem>
                                    <SelectItem value="GAIN_EXP">経験点獲得 (Gain EXP)</SelectItem>
                                    <SelectItem value="SPEND_EXP">経験点消費 (Spend EXP)</SelectItem>
                                    <SelectItem value="LEARN_SKILL">スキル習得 (Learn Skill)</SelectItem>
                                    <SelectItem value="EQUIP">装備 (Equip)</SelectItem>
                                    <SelectItem value="REGISTER_STAT_LABEL">ラベル登録 (Register Label)</SelectItem>
                                    <SelectItem value="REGISTER_RESOURCE">リソース定義 (Define Resource)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {(type === 'GROWTH' || type === 'REGISTER_STAT_LABEL') && (
                            <div className="space-y-2">
                                <Label>Stat Key</Label>
                                <div className="flex gap-2">
                                    <Select value={statKey} onValueChange={setStatKey}>
                                        <SelectTrigger className="w-[180px]">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {ABILITY_STATS.map(key => (
                                                <SelectItem key={key} value={key}>
                                                    {STAT_LABELS[key] || key}
                                                </SelectItem>
                                            ))}
                                            <SelectItem value="Custom">カスタム...</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {statKey === 'Custom' && (
                                        <Input
                                            placeholder="Key (e.g. Cooking)"
                                            onChange={(e) => setStatKey(e.target.value)}
                                            className="flex-1"
                                        />
                                    )}
                                </div>
                            </div>
                        )}

                        {(type === 'LEARN_SKILL' || type === 'EQUIP') && (
                            <div className="space-y-2">
                                <Label>{type === 'LEARN_SKILL' ? 'Skill Type' : 'Item Type'}</Label>
                                <Select value={subtype} onValueChange={setSubtype}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {type === 'LEARN_SKILL' ? (
                                            <>
                                                <SelectItem value="Active">Active</SelectItem>
                                                <SelectItem value="Passive">Passive</SelectItem>
                                                <SelectItem value="Spell">Spell</SelectItem>
                                                <SelectItem value="Other">Other</SelectItem>
                                                <SelectItem value="Custom">Custom...</SelectItem>
                                            </>
                                        ) : (
                                            <>
                                                <SelectItem value="Weapon">Weapon</SelectItem>
                                                <SelectItem value="Armor">Armor</SelectItem>
                                                <SelectItem value="Accessory">Accessory</SelectItem>
                                                <SelectItem value="Focus">Focus</SelectItem>
                                                <SelectItem value="Other">Other</SelectItem>
                                            </>
                                        )}
                                    </SelectContent>
                                </Select>
                                {type === 'LEARN_SKILL' && subtype === 'Custom' && (
                                    <Input
                                        placeholder="Type (e.g. Ultimate)"
                                        value={customSubtype}
                                        onChange={(e) => setCustomSubtype(e.target.value)}
                                        className="mt-2"
                                    />
                                )}
                            </div>
                        )}
                    </div>

                    {(type === 'GROWTH' || type === 'GAIN_EXP' || type === 'SPEND_EXP') && (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Value</Label>
                                <Input
                                    type="number"
                                    value={value}
                                    onChange={(e) => setValue(e.target.value)}
                                    placeholder="Amount (e.g. 1)"
                                    required
                                />
                            </div>

                            {type === 'GROWTH' && (
                                <div className="space-y-2">
                                    <Label>EXP Cost (Optional)</Label>
                                    <Input
                                        type="number"
                                        value={expCost}
                                        onChange={(e) => setExpCost(e.target.value)}
                                        placeholder="Cost (e.g. 10)"
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {type === 'REGISTER_RESOURCE' && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Resource Name</Label>
                                <Input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Name (e.g. Reactor Gauge)"
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Max Value</Label>
                                    <Input
                                        type="number"
                                        value={value}
                                        onChange={(e) => setValue(e.target.value)}
                                        placeholder="Max (e.g. 5)"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Initial Value</Label>
                                    <Input
                                        type="number"
                                        value={cost} // Reuse cost field for initial value
                                        onChange={(e) => setCost(e.target.value)}
                                        placeholder="Initial (e.g. 0)"
                                        required
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {type === 'REGISTER_STAT_LABEL' && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Label Name</Label>
                                <Input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Label (e.g. 料理)"
                                    required
                                />
                            </div>
                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="isMainStat"
                                    checked={isMainStat}
                                    onChange={(e) => setIsMainStat(e.target.checked)}
                                    className="h-4 w-4 rounded border-gray-300"
                                />
                                <Label htmlFor="isMainStat">Show in Main Stats</Label>
                            </div>
                        </div>
                    )}

                    {(type === 'LEARN_SKILL' || type === 'EQUIP') && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Name</Label>
                                <Input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder={type === 'LEARN_SKILL' ? "Skill Name" : "Item Name"}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Description / Effects</Label>
                                <Input
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Details..."
                                />
                            </div>

                            {type === 'LEARN_SKILL' && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Timing</Label>
                                        <Input value={timing} onChange={(e) => setTiming(e.target.value)} placeholder="e.g. Action" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Range</Label>
                                        <Input value={range} onChange={(e) => setRange(e.target.value)} placeholder="e.g. Close" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Target</Label>
                                        <Input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="e.g. Single" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Cost</Label>
                                        <Input value={cost} onChange={(e) => setCost(e.target.value)} placeholder="e.g. 3 MP" />
                                    </div>
                                </div>
                            )}

                            {type === 'EQUIP' && (subtype === 'Weapon' || subtype === 'Focus') && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Roll Formula</Label>
                                        <Input value={timing} onChange={(e) => setTiming(e.target.value)} placeholder="e.g. 2d6+Combat" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Effect/Damage</Label>
                                        <Input value={range} onChange={(e) => setRange(e.target.value)} placeholder="e.g. k20+Combat" />
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label>Stat Modifiers (JSON)</Label>
                                <Input
                                    value={modifiersJson}
                                    onChange={(e) => setModifiersJson(e.target.value)}
                                    placeholder='e.g. {"Science": 1}'
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Dynamic Modifiers (JSON)</Label>
                                <Input
                                    value={dynamicModifiersJson}
                                    onChange={(e) => setDynamicModifiersJson(e.target.value)}
                                    placeholder='e.g. {"Attack": "Strength / 2"}'
                                />
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label>Comment (Optional)</Label>
                        <Input
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="Reason or details..."
                        />
                    </div>

                    <Button type="submit" className="w-full">Add Log</Button>
                </form>
            </CardContent>
        </Card>
    );
};
