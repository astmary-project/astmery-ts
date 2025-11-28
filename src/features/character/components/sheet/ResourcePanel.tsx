import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CharacterState } from '../../domain/CharacterLog';

interface ResourcePanelProps {
    state: CharacterState;
    resourceValues: Record<string, number>;
}

export const ResourcePanel = ({ state, resourceValues }: ResourcePanelProps) => {
    return (
        <div className="space-y-4">
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
        </div>
    );
};
