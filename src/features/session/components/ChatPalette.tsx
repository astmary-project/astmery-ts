import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CharacterState } from '@/features/character';
import { STANDARD_CHECK_FORMULAS } from '@/features/character/domain/constants';
import { BookOpen } from 'lucide-react';
import { useState } from 'react';

interface ChatPaletteProps {
    state: CharacterState;
    onSelect: (text: string) => void;
}

export function ChatPalette({ state, onSelect }: ChatPaletteProps) {
    const [isOpen, setIsOpen] = useState(false);

    const handleSelect = (text: string) => {
        onSelect(text);
        setIsOpen(false);
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" title="Chat Palette">
                    <BookOpen className="h-4 w-4" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="start">
                <div className="p-3 border-b bg-muted/50">
                    <h4 className="font-medium leading-none">Chat Palette</h4>
                    <p className="text-xs text-muted-foreground mt-1">Select a command to insert.</p>
                </div>
                <ScrollArea className="h-[300px]">
                    <div className="p-2 flex flex-col gap-4">
                        {/* Standard Checks */}
                        <div className="space-y-1">
                            <h5 className="text-xs font-bold text-muted-foreground px-2 uppercase tracking-wider">Standard Checks</h5>
                            <div className="grid gap-1">
                                {Object.entries(STANDARD_CHECK_FORMULAS).map(([label, formula]) => (
                                    <Button
                                        key={label}
                                        variant="ghost"
                                        size="sm"
                                        className="justify-start h-auto py-1.5 px-2 font-normal text-left whitespace-normal"
                                        onClick={() => handleSelect(`${label} ${formula}`)}
                                    >
                                        <div className="flex flex-col items-start gap-0.5 w-full">
                                            <span className="font-medium text-xs">{label}</span>
                                            <span className="text-[10px] text-muted-foreground font-mono truncate w-full">{formula}</span>
                                        </div>
                                    </Button>
                                ))}
                            </div>
                        </div>

                        {/* Skills */}
                        {state.skills.length > 0 && (
                            <div className="space-y-1">
                                <h5 className="text-xs font-bold text-muted-foreground px-2 uppercase tracking-wider">Skills</h5>
                                <div className="grid gap-1">
                                    {state.skills.map((skill) => {
                                        // 1. Explicit Chat Palette
                                        if (skill.chatPalette) {
                                            const lines = skill.chatPalette.split('\n').filter(line => line.trim());
                                            return lines.map((line, idx) => (
                                                <Button
                                                    key={`${skill.id}-${idx}`}
                                                    variant="ghost"
                                                    size="sm"
                                                    className="justify-start h-auto py-1.5 px-2 font-normal text-left whitespace-normal"
                                                    onClick={() => handleSelect(line)}
                                                >
                                                    <div className="flex flex-col items-start gap-0.5 w-full">
                                                        <span className="font-medium text-xs">{skill.name}</span>
                                                        <span className="text-[10px] text-muted-foreground font-mono truncate w-full">{line}</span>
                                                    </div>
                                                </Button>
                                            ));
                                        }

                                        // 2. Active Check Fallback
                                        if (skill.activeCheck) {
                                            const formula = `2d6 + ${skill.activeCheck}`; // Assuming activeCheck is a modifier or stat
                                            // Actually activeCheck might be "Combat" or "Combat + 1"
                                            // If it's just a stat name, we want "2d6 + {Stat}"
                                            // But usually activeCheck in this system is just the text description or modifier?
                                            // Let's assume it's a modifier expression for now.
                                            // Wait, Skill interface says activeCheck?: string.
                                            // If it's a stat name like "Combat", we should probably format it.
                                            // But let's just output what's there for now or wrap in 2d6 if it looks like a modifier.
                                            // Safe bet: just output the name and the check.

                                            // Let's construct a standard check format: "SkillName 2d6 + {activeCheck}"
                                            // If activeCheck is just "Combat", it becomes "2d6 + {Combat}"
                                            const checkText = `${skill.name} 2d6 + {${skill.activeCheck}}`;

                                            return (
                                                <Button
                                                    key={skill.id}
                                                    variant="ghost"
                                                    size="sm"
                                                    className="justify-start h-auto py-1.5 px-2 font-normal text-left whitespace-normal"
                                                    onClick={() => handleSelect(checkText)}
                                                >
                                                    <div className="flex flex-col items-start gap-0.5 w-full">
                                                        <span className="font-medium text-xs">{skill.name}</span>
                                                        <span className="text-[10px] text-muted-foreground font-mono truncate w-full">{checkText}</span>
                                                    </div>
                                                </Button>
                                            );
                                        }
                                        return null;
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </PopoverContent>
        </Popover>
    );
}
