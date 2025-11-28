import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ImageUpload } from '@/components/ui/image-upload';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Pencil } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { CharacterState } from '../domain/CharacterLog';

interface CharacterHeaderProps {
    name: string;
    avatarUrl?: string;
    bio?: string;
    specialtyElements?: string[];
    exp: CharacterState['exp'];
    grade?: number;
    onNameChange?: (name: string) => void;
    onAvatarChange?: (url: string) => void;
    isEditMode?: boolean;
    onToggleEditMode?: () => void;
}

export const CharacterHeader: React.FC<CharacterHeaderProps> = ({
    name,
    avatarUrl,
    bio,
    specialtyElements = [],
    exp,
    grade,
    onNameChange,
    onAvatarChange,
    isEditMode = false,
    onToggleEditMode,
}) => {
    const [isEditingName, setIsEditingName] = useState(false);
    const [tempName, setTempName] = useState(name);

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
        <Card className="mb-6">
            <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row gap-6 items-start">
                    {/* Avatar */}
                    {onAvatarChange ? (
                        <ImageUpload
                            value={avatarUrl}
                            onChange={onAvatarChange}
                            className="w-24 h-24 md:w-32 md:h-32 shrink-0"
                        />
                    ) : (
                        <Avatar className="w-24 h-24 md:w-32 md:h-32 border-4 border-muted">
                            <AvatarImage src={avatarUrl} alt={name} />
                            <AvatarFallback className="text-2xl font-bold">{name.slice(0, 2)}</AvatarFallback>
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
                                    {grade !== undefined && (
                                        <Badge variant="outline" className="text-lg px-3 py-1 border-2">
                                            Grade {grade}
                                        </Badge>
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
                            <div className="flex flex-wrap gap-2">
                                {specialtyElements.map((el) => (
                                    <Badge key={el} variant="secondary">
                                        {el}
                                    </Badge>
                                ))}
                            </div>
                        </div>

                        {/* Edit Mode Toggle */}
                        {onToggleEditMode && (
                            <div className="flex justify-end mb-2">
                                <div className="flex items-center space-x-2">
                                    <Switch
                                        id="edit-mode"
                                        checked={isEditMode}
                                        onCheckedChange={onToggleEditMode}
                                    />
                                    <Label htmlFor="edit-mode" className="text-sm font-medium">
                                        編集モード
                                    </Label>
                                </div>
                            </div>
                        )}

                        {/* Bio */}
                        {bio && <p className="text-muted-foreground mb-4 text-sm whitespace-pre-wrap">{bio}</p>}

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
        </Card>
    );
};
