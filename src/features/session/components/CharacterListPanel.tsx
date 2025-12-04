import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Shield, Sword, Zap } from 'lucide-react';

interface Character {
    id: string;
    name: string;
    hp: { current: number; max: number };
    mp: { current: number; max: number };
    initiative?: number;
    avatarUrl?: string;
}

interface CharacterListPanelProps {
    characters: Character[];
    className?: string;
}

export function CharacterListPanel({ characters, className }: CharacterListPanelProps) {
    return (
        <Card className={cn("h-full flex flex-col min-h-0 border-none shadow-none bg-transparent", className)}>
            <CardHeader className="pb-2 px-4 pt-4">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Characters</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 px-4 pb-4 overflow-y-auto no-scrollbar">
                <div className="flex flex-col gap-3">
                    {characters.map((char) => (
                        <div key={char.id} className="group relative bg-background/60 backdrop-blur-md border rounded-xl p-3 shadow-sm hover:bg-background/80 transition-all duration-200">
                            <div className="flex items-center gap-3 mb-2">
                                <Avatar className="h-10 w-10 border-2 border-primary/20 shadow-sm">
                                    <AvatarImage src={char.avatarUrl} />
                                    <AvatarFallback className="bg-primary/10 text-primary font-bold">{char.name[0]}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-bold text-sm truncate">{char.name}</h4>
                                        {char.initiative !== undefined && (
                                            <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                                                <Zap className="w-3 h-3 text-yellow-500" />
                                                <span>{char.initiative}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                        <span className="flex items-center gap-0.5"><Sword className="w-3 h-3" /> ATK</span>
                                        <span className="flex items-center gap-0.5"><Shield className="w-3 h-3" /> DEF</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <div className="space-y-0.5">
                                    <div className="flex justify-between text-[10px] font-medium">
                                        <span className="text-green-600">HP</span>
                                        <span>{char.hp.current} / {char.hp.max}</span>
                                    </div>
                                    <Progress value={(char.hp.current / char.hp.max) * 100} className="h-1.5 bg-green-100 [&>div]:bg-green-500" />
                                </div>
                                <div className="space-y-0.5">
                                    <div className="flex justify-between text-[10px] font-medium">
                                        <span className="text-blue-600">MP</span>
                                        <span>{char.mp.current} / {char.mp.max}</span>
                                    </div>
                                    <Progress value={(char.mp.current / char.mp.max) * 100} className="h-1.5 bg-blue-100 [&>div]:bg-blue-500" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
