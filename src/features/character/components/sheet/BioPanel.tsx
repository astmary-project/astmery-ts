import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';

interface BioPanelProps {
    bio?: string;
    tags: Set<string>;
    isEditMode: boolean;
    onUpdateBio: (bio: string) => void;
    onAddTag: (tag: string) => void;
    onRemoveTag: (tag: string) => void;
    onDeleteCharacter?: () => void;
}

export const BioPanel: React.FC<BioPanelProps> = ({
    bio = '',
    tags,
    isEditMode,
    onUpdateBio,
    onAddTag,
    onRemoveTag,
    onDeleteCharacter,
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

            {/* Tags Section */}
            <Card>
                <CardHeader>
                    <CardTitle>Tags</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-2 mb-4">
                        {Array.from(tags).map(tag => ( // Changed from tags.map to Array.from(tags).map to match original type
                            <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                                {tag}
                                {isEditMode && (
                                    <X
                                        className="h-3 w-3 cursor-pointer hover:text-destructive"
                                        onClick={() => onRemoveTag(tag)}
                                    />
                                )}
                            </Badge>
                        ))}
                        {tags.size === 0 && !isEditMode && ( // Added back condition for no tags
                            <span className="text-muted-foreground text-sm">タグはありません。</span>
                        )}
                    </div>
                    {isEditMode && (
                        <div className="flex gap-2 max-w-sm"> {/* Added max-w-sm back */}
                            <Input
                                placeholder="Add new tag..."
                                value={newTag}
                                onChange={(e) => setNewTag(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        handleAddTag();
                                    }
                                }}
                            />
                            <Button onClick={handleAddTag} size="sm" variant="outline"> {/* Added variant="outline" back */}
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Settings */}
            {isEditMode && onDeleteCharacter && (
                <Card>
                    <CardHeader>
                        <CardTitle>設定</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="border border-destructive/50 rounded-md p-4 bg-destructive/5">
                            <h4 className="text-destructive font-medium mb-2 flex items-center gap-2">
                                <X className="h-4 w-4" />
                                Danger Zone
                            </h4>
                            <p className="text-sm text-muted-foreground mb-4">
                                このキャラクターを削除します。この操作は取り消せません。
                            </p>
                            <Button
                                variant="destructive"
                                onClick={() => {
                                    if (confirm('本当にこのキャラクターを削除しますか？この操作は取り消せません。')) {
                                        onDeleteCharacter();
                                    }
                                }}
                            >
                                キャラクターを削除
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};
