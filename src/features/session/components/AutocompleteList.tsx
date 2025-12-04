import { cn } from '@/lib/utils';
import { useEffect, useRef } from 'react';

export interface AutocompleteItem {
    label: string;
    value: string;
    description?: string;
}

interface AutocompleteListProps {
    items: AutocompleteItem[];
    selectedIndex: number;
    onSelect: (item: AutocompleteItem) => void;
    className?: string;
}

export function AutocompleteList({ items, selectedIndex, onSelect, className }: AutocompleteListProps) {
    const listRef = useRef<HTMLUListElement>(null);

    useEffect(() => {
        if (listRef.current) {
            const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
            if (selectedElement) {
                selectedElement.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [selectedIndex]);

    if (items.length === 0) return null;

    return (
        <ul
            ref={listRef}
            className={cn(
                "absolute bottom-full left-0 w-full max-h-48 overflow-y-auto bg-popover text-popover-foreground rounded-md border shadow-md z-50 mb-1",
                className
            )}
        >
            {items.map((item, index) => (
                <li
                    key={item.value}
                    className={cn(
                        "px-3 py-2 text-sm cursor-pointer flex justify-between items-center",
                        index === selectedIndex ? "bg-accent text-accent-foreground" : "hover:bg-muted"
                    )}
                    onClick={() => onSelect(item)}
                    onMouseDown={(e) => e.preventDefault()} // Prevent losing focus from input
                >
                    <span className="font-medium">{item.label}</span>
                    {item.description && (
                        <span className="text-xs text-muted-foreground ml-2 truncate max-w-[150px]">
                            {item.description}
                        </span>
                    )}
                </li>
            ))}
        </ul>
    );
}
