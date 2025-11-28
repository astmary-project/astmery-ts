import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { X } from 'lucide-react';
import React, { useEffect, useState } from 'react';

interface BioPanelProps {
    bio?: string;
    tags: Set<string>;
    isEditMode: boolean;
    onUpdateBio: (bio: string) => void;
    onAddTag: (tag: string) => void;
    onRemoveTag: (tag: string) => void;
}

export const BioPanel: React.FC<BioPanelProps> = ({
    bio = '',
    tags,
    isEditMode,
    onUpdateBio,
    onAddTag,
    onRemoveTag,
}) => {
    const [tempBio, setTempBio] = useState(bio);
    const [newTag, setNewTag] = useState('');

    useEffect(() => {
        setTempBio(bio);
    }, [bio]);

    const handleBioBlur = () => {
        if (tempBio !== bio) {
            onUpdateBio(tempBio);
        }
    };

    const handleAddTag = () => {
        if (newTag.trim()) {
            onAddTag(newTag.trim());
            setNewTag('');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddTag();
        }
    };

    return (
        <div className="space-y-6">
            {/* Character Settings (Bio) */}
            <Card>
                <CardHeader>
                    <CardTitle>キャラクター設定</CardTitle>
                </CardHeader>
                <CardContent>
                    {isEditMode ? (
                        <Textarea
                            value={tempBio}
                            onChange={(e) => setTempBio(e.target.value)}
                            onBlur={handleBioBlur}
                            className="min-h-[200px]"
                            placeholder="キャラクターの背景、性格、設定などを入力してください..."
                        />
                    ) : (
                        <div className="whitespace-pre-wrap text-sm leading-relaxed">
                            {bio || <span className="text-muted-foreground">設定が入力されていません。</span>}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Tags */}
            <Card>
                <CardHeader>
                    <CardTitle>タグ</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-2 mb-4">
                        {Array.from(tags).map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-sm py-1 px-3">
                                {tag}
                                {isEditMode && (
                                    <button
                                        onClick={() => onRemoveTag(tag)}
                                        className="ml-2 hover:text-destructive focus:outline-none"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                )}
                            </Badge>
                        ))}
                        {tags.size === 0 && !isEditMode && (
                            <span className="text-muted-foreground text-sm">タグはありません。</span>
                        )}
                    </div>

                    {isEditMode && (
                        <div className="flex gap-2 max-w-sm">
                            <Input
                                value={newTag}
                                onChange={(e) => setNewTag(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="新しいタグ..."
                            />
                            <Button onClick={handleAddTag} variant="outline" size="sm">
                                追加
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};
