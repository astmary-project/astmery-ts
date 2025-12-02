import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import React from 'react';

interface MapTokenProps {
    id: string;
    x: number;
    y: number;
    label?: string;
    imageUrl?: string;
    size?: number; // Size in grid units (default 1)
    color?: string;
    isSelected?: boolean;
    onMouseDown?: (e: React.MouseEvent) => void;
}

export function MapToken({
    x,
    y,
    label,
    imageUrl,
    size = 1,
    color = 'bg-primary',
    isSelected,
    onMouseDown,
}: MapTokenProps) {
    // Grid size in pixels (should match MapPanel)
    const GRID_SIZE = 50;

    return (
        <div
            className={cn(
                "absolute flex flex-col items-center justify-center cursor-move transition-transform duration-75 select-none",
                isSelected && "z-10 scale-110"
            )}
            style={{
                left: x * GRID_SIZE,
                top: y * GRID_SIZE,
                width: size * GRID_SIZE,
                height: size * GRID_SIZE,
            }}
            onMouseDown={onMouseDown}
        >
            <div className={cn(
                "relative w-full h-full rounded-full border-2 shadow-sm overflow-hidden",
                isSelected ? "border-yellow-400 ring-2 ring-yellow-400/50" : "border-white",
                color
            )}>
                <Avatar className="w-full h-full">
                    <AvatarImage src={imageUrl} alt={label} className="object-cover" />
                    <AvatarFallback className="bg-primary/20 text-primary-foreground font-bold text-xs">
                        {label?.slice(0, 2).toUpperCase() || '?'}
                    </AvatarFallback>
                </Avatar>
            </div>
            {label && (
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded-full whitespace-nowrap pointer-events-none">
                    {label}
                </div>
            )}
        </div>
    );
}
