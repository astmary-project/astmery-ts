import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';
import React, { useState } from 'react';
import { CharacterState } from '../../domain/models';

interface ResourcePanelProps {
    state: CharacterState;
    resourceValues: Record<string, number>;
    // New props for Status
    tags?: string[];
    isEditMode?: boolean;
    onAddTag?: (tag: string) => void;
    onRemoveTag?: (tag: string) => void;
}

export const ResourcePanel = ({ state, resourceValues, tags, isEditMode = false, onAddTag, onRemoveTag }: ResourcePanelProps) => {
    // Tag State
    const [newTag, setNewTag] = useState('');

    const handleAddTag = () => {
        if (newTag.trim() && onAddTag) {
            onAddTag(newTag.trim());
            setNewTag('');
        }
    };

    const handleTagKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddTag();
        }
    };

    return (
        <div className="space-y-4">
            {state.resources.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>リソース・ゲージ</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                            {state.resources.map(resource => (
                                <div key={resource.id} className="p-3 border rounded-lg bg-card">
                                    <div className="text-sm font-medium text-muted-foreground mb-1">{resource.name}</div>
                                    <div className="flex items-end gap-2">
                                        <span className="text-2xl font-bold font-mono">
                                            {resourceValues[resource.id] ?? resource.initial}
                                        </span>
                                        <span className="text-sm text-muted-foreground mb-1">/ {resource.max}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Status (Tags) */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-base">状態 (Status)</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-2 mb-2">
                        {tags && tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-sm py-1 px-3">
                                {tag}
                                {isEditMode && onRemoveTag && (
                                    <button
                                        onClick={() => onRemoveTag(tag)}
                                        className="ml-2 hover:text-destructive focus:outline-none"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                )}
                            </Badge>
                        ))}
                        {(!tags || tags.length === 0) && !isEditMode && (
                            <span className="text-muted-foreground text-sm">状態異常なし</span>
                        )}
                    </div>

                    {isEditMode && onAddTag && (
                        <div className="flex gap-2 max-w-sm mt-4">
                            <Input
                                value={newTag}
                                onChange={(e) => setNewTag(e.target.value)}
                                onKeyDown={handleTagKeyDown}
                                placeholder="状態を追加..."
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
