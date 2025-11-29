import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ImageUpload } from '@/components/ui/image-upload';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Pencil, Settings } from 'lucide-react';
import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import { CharacterCalculator } from '../domain/CharacterCalculator';
import { CharacterState } from '../domain/CharacterLog';
import { GrowthDialog } from './sheet/GrowthDialog';

interface CharacterHeaderProps {
    character: CharacterState;
    name: string;
    profile?: {
        avatarUrl?: string;
        bio?: string;
        specialtyElements?: string[];
    };
    isEditMode: boolean;
    onEditModeChange: (value: boolean) => void;
    onAvatarChange?: (url: string) => void;
    canEdit?: boolean;
    onGrow?: (key: string, cost: number) => void;
    onNameChange?: (name: string) => void;
    ownerName?: string;
    characterId?: string;
}

export const CharacterHeader: React.FC<CharacterHeaderProps> = ({
    character,
    name,
    profile,
    isEditMode,
    onEditModeChange,
    onAvatarChange,
    canEdit = false,
    onGrow,
    onNameChange,
    ownerName,
    characterId,
}) => {
    const {
        exp,
    } = character;
    const grade = character.stats['Grade'] || 0;

    const [isEditingName, setIsEditingName] = useState(false);
    const [tempName, setTempName] = useState(name);
    const [showGradeGrowth, setShowGradeGrowth] = useState(false);

    useEffect(() => {
        setTempName(name);
    }, [name]);

    const handleNameSubmit = () => {
        setIsEditingName(false);
        if (tempName !== name && onNameChange) {
            onNameChange(tempName);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleNameSubmit();
        }
    };

    // Calculate EXP percentage
    const expPercentage = exp.total > 0 ? (exp.used / exp.total) * 100 : 0;

    return (
        <Card className="mb-6 relative">
            <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row gap-6 items-start">
                    {/* Back Button */}
                    <Link href="/character" className="absolute top-4 left-4 text-muted-foreground hover:text-foreground z-10">
                        <ArrowLeft className="w-6 h-6" />
                    </Link>

                    {/* Edit Mode Toggle & Settings */}
                    {canEdit && (
                        <div className="absolute top-4 right-4 flex items-center space-x-4 z-10">
                            {characterId && (
                                <Link href={`/character/${characterId}/setup`}>
                                    <Button variant="outline" size="sm" className="h-8">
                                        <Settings className="mr-2 h-4 w-4" /> 一括編集
                                    </Button>
                                </Link>
                            )}

                            <div className="flex items-center space-x-2">
                                <Switch
                                    id="edit-mode"
                                    checked={isEditMode}
                                    onCheckedChange={onEditModeChange}
                                />
                                <Label htmlFor="edit-mode" className="flex items-center gap-2 cursor-pointer select-none">
                                    <Pencil className="w-4 h-4" />
                                    <span className="hidden sm:inline">Edit Mode</span>
                                </Label>
                            </div>
                        </div>
                    )}

                    {/* Avatar */}
                    {isEditMode && onAvatarChange ? (
                        <ImageUpload
                            value={profile?.avatarUrl}
                            onChange={onAvatarChange}
                            className="w-24 h-24 md:w-32 md:h-32 shrink-0"
                        />
                    ) : (
                        <Avatar className="w-24 h-24 border-4 border-background shadow-sm">
                            <AvatarImage src={profile?.avatarUrl} />
                            <AvatarFallback>{name.slice(0, 2)}</AvatarFallback>
                        </Avatar>
                    )}

                    {/* Info */}
                    <div className="flex-1 w-full">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 mb-2">
                            {isEditingName ? (
                                <Input
                                    value={tempName}
                                    onChange={(e) => setTempName(e.target.value)}
                                    onBlur={handleNameSubmit}
                                    onKeyDown={handleKeyDown}
                                    autoFocus
                                    className="text-3xl font-bold tracking-tight h-auto py-1 px-2 w-full md:w-auto"
                                />
                            ) : (
                                <div className="flex items-center gap-2 group">
                                    <h1 className="text-3xl font-bold tracking-tight">{name}</h1>
                                    {ownerName && (
                                        <span className="text-sm text-muted-foreground ml-2">
                                            Player: {ownerName}
                                        </span>
                                    )}
                                    {grade !== undefined && (
                                        <div className="relative group">
                                            <Badge variant="outline" className="text-lg px-3 py-1 border-2">
                                                Grade {grade}
                                            </Badge>
                                            {isEditMode && onGrow && (
                                                <button
                                                    onClick={() => setShowGradeGrowth(true)}
                                                    className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-background border border-primary text-primary flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors shadow-sm"
                                                    title="Grow Grade"
                                                >
                                                    <span className="text-[10px] font-bold">+</span>
                                                </button>
                                            )}
                                        </div>
                                    )}
                                    {onNameChange && (
                                        <button
                                            onClick={() => setIsEditingName(true)}
                                            className="text-muted-foreground hover:text-foreground p-1 hover:bg-muted rounded-md transition-colors"
                                            title="Edit Name"
                                        >
                                            <Pencil className="w-5 h-5" />
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* EXP Bar */}
                        <div className="space-y-1">
                            <div className="flex justify-between text-xs text-muted-foreground">
                                <span>経験点使用量</span>
                                <span>
                                    <span className="font-medium text-foreground">{exp.used}</span> / {exp.total} (空き: {exp.free})
                                </span>
                            </div>
                            <Progress value={expPercentage} className="h-2" />
                        </div>
                    </div>
                </div>
            </CardContent>

            {showGradeGrowth && grade !== undefined && (
                <GrowthDialog
                    isOpen={showGradeGrowth}
                    onClose={() => setShowGradeGrowth(false)}
                    statKey="Grade"
                    statLabel="グレード"
                    currentValue={grade}
                    currentExp={exp.free}
                    cost={CharacterCalculator.calculateStatCost(grade, true)}
                    onConfirm={() => {
                        if (onGrow) {
                            const cost = CharacterCalculator.calculateStatCost(grade, true);
                            onGrow('Grade', cost);
                            setShowGradeGrowth(false);
                        }
                    }}
                />
            )}
        </Card>
    );
};
