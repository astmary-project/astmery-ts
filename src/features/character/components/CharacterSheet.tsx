import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import React from 'react';
import { CharacterHeader } from './CharacterHeader';

import { CharacterLogEntry, CharacterState } from '../domain/CharacterLog';
import { STANDARD_STAT_ORDER, STAT_LABELS } from '../domain/constants';
import { LogEditor } from './LogEditor';

interface CharacterSheetProps {
    character: {
        name: string;
        avatarUrl?: string;
        bio?: string;
        specialtyElements?: string[];
    };
    state: CharacterState;
    logs: CharacterLogEntry[];
    onAddLog: (log: Omit<CharacterLogEntry, 'id' | 'timestamp'>) => void;
}

export const CharacterSheet: React.FC<CharacterSheetProps> = ({ character, state, logs, onAddLog }) => {
    // Helper to render stats grid
    const renderStats = () => {
        // Mapping for Japanese labels
        // Use shared constants
        const labelMap = STAT_LABELS;
        const standardOrder = STANDARD_STAT_ORDER;

        // Separate stats into Standard and Bonuses
        const allKeys = Array.from(new Set([...Object.keys(state.stats), ...Object.keys(state.derivedStats)]));
        const mainStats = allKeys.filter(key => standardOrder.includes(key));
        const bonusStats = allKeys.filter(key => !standardOrder.includes(key));

        // Sort Standard Stats
        const sortedMainStats = mainStats.sort((a, b) => {
            return standardOrder.indexOf(a) - standardOrder.indexOf(b);
        });

        return (
            <div className="space-y-6">
                {/* Main Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {sortedMainStats.map((key) => {
                        const value = state.derivedStats[key] ?? state.stats[key];
                        const label = labelMap[key] || key;
                        return (
                            <div key={key} className="flex flex-col p-3 bg-muted/50 rounded-lg">
                                <span className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{label}</span>
                                <span className="text-2xl font-bold font-mono">{value}</span>
                            </div>
                        );
                    })}
                </div>

                {/* Bonuses */}
                {bonusStats.length > 0 && (
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base">Bonuses & Modifiers</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-wrap gap-4">
                                {bonusStats.map((key) => {
                                    const value = state.derivedStats[key] ?? state.stats[key];
                                    const label = labelMap[key] || key;
                                    return (
                                        <div key={key} className="flex items-center gap-2 px-3 py-2 bg-secondary/50 rounded-md border">
                                            <span className="text-sm font-medium">{label}</span>
                                            <span className="font-mono font-bold text-primary">
                                                {value > 0 ? '+' : ''}{value}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        );
    };

    // Helper to group skills
    const groupedSkills = {
        Active: state.skills.filter(s => s.type === 'Active'),
        Passive: state.skills.filter(s => s.type === 'Passive'),
        Spell: state.skills.filter(s => s.type === 'Spell'),
        Other: state.skills.filter(s => !['Active', 'Passive', 'Spell'].includes(s.type)),
    };

    const renderSkillSection = (title: string, skills: typeof state.skills) => {
        if (skills.length === 0) return null;
        return (
            <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    {title}
                    <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{skills.length}</span>
                </h3>
                <div className="space-y-4">
                    {skills.map((skill) => (
                        <div key={skill.id} className="border rounded-lg p-4 bg-card">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h4 className="font-bold text-base">{skill.name}</h4>
                                </div>
                            </div>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{skill.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="container mx-auto p-4 max-w-4xl">
            <CharacterHeader
                name={character.name}
                avatarUrl={character.avatarUrl}
                bio={character.bio}
                specialtyElements={character.specialtyElements}
                exp={state.exp}
            />

            <Tabs defaultValue="status" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="status">ステータス</TabsTrigger>
                    <TabsTrigger value="skills">スキル</TabsTrigger>
                    <TabsTrigger value="equipment">装備</TabsTrigger>
                    <TabsTrigger value="history">履歴</TabsTrigger>
                </TabsList>

                {/* Status Tab */}
                <TabsContent value="status" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>能力値</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {renderStats()}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>タグ・状態</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-wrap gap-2">
                                {Array.from(state.tags).map(tag => (
                                    <span key={tag} className="px-2 py-1 bg-primary/10 text-primary rounded text-sm border border-primary/20">
                                        {tag}
                                    </span>
                                ))}
                                {state.tags.size === 0 && <span className="text-muted-foreground italic">なし</span>}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Skills Tab */}
                <TabsContent value="skills">
                    <Card>
                        <CardHeader>
                            <CardTitle>スキル一覧</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {renderSkillSection('アクティブ', groupedSkills.Active)}
                            {renderSkillSection('パッシブ', groupedSkills.Passive)}
                            {renderSkillSection('魔術', groupedSkills.Spell)}
                            {renderSkillSection('その他', groupedSkills.Other)}

                            {state.skills.length === 0 && <p className="text-muted-foreground text-center py-8">スキルを習得していません。</p>}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Equipment Tab */}
                <TabsContent value="equipment">
                    <Card>
                        <CardHeader>
                            <CardTitle>Equipment</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {state.equipment.map((item) => (
                                    <div key={item.id} className="flex items-center gap-4 border p-4 rounded-lg">
                                        <div className="flex-1">
                                            <h4 className="font-bold">{item.name}</h4>
                                            <p className="text-sm text-muted-foreground">{item.type}</p>
                                        </div>
                                        <div className="text-sm text-muted-foreground max-w-md">
                                            {item.description}
                                        </div>
                                    </div>
                                ))}
                                {state.equipment.length === 0 && <p className="text-muted-foreground text-center py-8">No equipment equipped.</p>}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* History Tab */}
                <TabsContent value="history" className="space-y-6">
                    <LogEditor onAddLog={onAddLog} />

                    <Card>
                        <CardHeader>
                            <CardTitle>History Log</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {[...logs].reverse().map((log) => (
                                    <div key={log.id} className="text-sm border-b pb-2 last:border-0">
                                        <div className="flex justify-between text-muted-foreground text-xs mb-1">
                                            <span>{new Date(log.timestamp).toLocaleString()}</span>
                                            <span className="font-mono">{log.type}</span>
                                        </div>
                                        <div>
                                            {log.type === 'GROWTH' && `Growth: ${log.statKey} +${log.value}`}
                                            {log.type === 'GAIN_EXP' && `Gained ${log.value} EXP`}
                                            {log.type === 'SPEND_EXP' && `Spent ${log.value} EXP`}
                                            {log.type === 'LEARN_SKILL' && `Learned Skill: ${log.stringValue}`}
                                            {log.type === 'EQUIP' && `Equipped: ${log.stringValue}`}
                                            {log.description && <span className="text-muted-foreground ml-2">- {log.description}</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};
