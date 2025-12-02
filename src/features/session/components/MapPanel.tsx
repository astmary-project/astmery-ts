import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useSelf } from '@/liveblocks.config';
import { ImageIcon, Plus } from 'lucide-react';
import React, { useRef, useState } from 'react';
import { MapToken, SessionLogEntry } from '../domain/SessionLog';
import { MapToken as MapTokenComponent } from './MapToken';

interface MapPanelProps {
    backgroundImageUrl?: string;
    tokens: MapToken[];
    onLog: (log: SessionLogEntry) => void;
}

export function MapPanel({ backgroundImageUrl, tokens, onLog }: MapPanelProps) {
    const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);
    const [isDraggingToken, setIsDraggingToken] = useState(false);
    const [isPanning, setIsPanning] = useState(false);

    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [previewPosition, setPreviewPosition] = useState<{ x: number, y: number } | null>(null);

    const [scale, setScale] = useState(1);
    const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });

    const [newBgUrl, setNewBgUrl] = useState('');

    const containerRef = useRef<HTMLDivElement>(null);
    const GRID_SIZE = 50;

    const handleWheel = (e: React.WheelEvent) => {
        e.stopPropagation();
        if (!containerRef.current) return;

        const ZOOM_SENSITIVITY = 0.001;
        const MIN_SCALE = 0.1;
        const MAX_SCALE = 5;

        const delta = -e.deltaY * ZOOM_SENSITIVITY;
        const newScale = Math.min(Math.max(scale + delta, MIN_SCALE), MAX_SCALE);

        // Calculate mouse position relative to container
        const containerRect = containerRef.current.getBoundingClientRect();
        const mouseX = e.clientX - containerRect.left;
        const mouseY = e.clientY - containerRect.top;

        // Calculate point on map under mouse before zoom
        // MapX = (MouseX - PanX) / OldScale
        const mapX = (mouseX - panOffset.x) / scale;
        const mapY = (mouseY - panOffset.y) / scale;

        // Calculate new pan offset to keep map point under mouse
        // NewPanX = MouseX - MapX * NewScale
        const newPanX = mouseX - mapX * newScale;
        const newPanY = mouseY - mapY * newScale;

        setScale(newScale);
        setPanOffset({ x: newPanX, y: newPanY });
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        // Start panning if clicking on background (not token)
        setIsPanning(true);
        setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    };

    const handleTokenMouseDown = (e: React.MouseEvent, token: MapToken) => {
        e.stopPropagation();
        setSelectedTokenId(token.id);
        setIsDraggingToken(true);

        // Calculate offset from token top-left, accounting for scale
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setDragOffset({
            x: (e.clientX - rect.left) / scale,
            y: (e.clientY - rect.top) / scale
        });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isPanning) {
            setPanOffset({
                x: e.clientX - panStart.x,
                y: e.clientY - panStart.y
            });
            return;
        }

        if (!isDraggingToken || !selectedTokenId || !containerRef.current) return;

        const containerRect = containerRef.current.getBoundingClientRect();
        // Adjust mouse position by pan offset and scale
        // (Mouse - Container - Pan) / Scale
        const x = (e.clientX - containerRect.left - panOffset.x) / scale - dragOffset.x;
        const y = (e.clientY - containerRect.top - panOffset.y) / scale - dragOffset.y;

        // Update preview position (in pixels relative to map origin)
        setPreviewPosition({ x, y });
    };

    const handleMouseUp = (e: React.MouseEvent) => {
        if (isPanning) {
            setIsPanning(false);
            return;
        }

        if (isDraggingToken && selectedTokenId && containerRef.current) {
            const containerRect = containerRef.current.getBoundingClientRect();

            const rawX = (e.clientX - containerRect.left - panOffset.x) / scale - dragOffset.x;
            const rawY = (e.clientY - containerRect.top - panOffset.y) / scale - dragOffset.y;

            const gridX = Math.round(rawX / GRID_SIZE);
            const gridY = Math.round(rawY / GRID_SIZE);

            onLog({
                id: crypto.randomUUID(),
                type: 'MOVE_TOKEN',
                // eslint-disable-next-line react-hooks/purity
                timestamp: Date.now(),
                token: {
                    id: selectedTokenId,
                    x: Math.max(0, gridX),
                    y: Math.max(0, gridY),
                    creatorId: myId, // Required by type, though maybe we should preserve original creator?
                },
                description: `Moved token`
            });
        }
        setIsDraggingToken(false);
        setPreviewPosition(null);
        setSelectedTokenId(null);
    };

    const handleBackgroundUpdate = () => {
        if (!newBgUrl) return;
        onLog({
            id: crypto.randomUUID(),
            type: 'UPDATE_MAP_BACKGROUND',
            // eslint-disable-next-line react-hooks/purity
            timestamp: Date.now(),
            mapBackground: { url: newBgUrl },
            description: 'Updated map background'
        });
        setNewBgUrl('');
    };

    const myId = useSelf((me) => me.id);

    const handleAddToken = () => {
        const newToken: MapToken = {
            id: crypto.randomUUID(),
            name: 'New Token',
            x: 4,
            y: 4,
            size: 1,
            creatorId: myId,
        };
        onLog({
            id: crypto.randomUUID(),
            roomId: 'demo', // TODO: Pass real room ID
            type: 'ADD_TOKEN',
            token: newToken,
            // eslint-disable-next-line react-hooks/purity
            timestamp: Date.now(),
        });
    };

    return (
        <div
            className="relative w-full h-full overflow-hidden bg-muted/20 select-none group"
            ref={containerRef}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => {
                setIsDraggingToken(false);
                setIsPanning(false);
            }}
        >
            {/* Transform Container */}
            <div
                className="absolute origin-top-left transition-transform duration-75 ease-linear will-change-transform"
                style={{
                    transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${scale})`
                }}
            >
                {/* Background Layer */}
                {backgroundImageUrl ? (
                    <div
                        className="absolute inset-0 bg-cover bg-center opacity-50 pointer-events-none"
                        style={{
                            backgroundImage: `url(${backgroundImageUrl})`,
                            // Assuming a fixed size for the map area or letting it grow?
                            // For now, let's give it a large fixed size or match viewport?
                            // Actually, if we pan/zoom, we need a defined size for the map content.
                            // Let's assume a large canvas for now, e.g. 2000x2000 or dynamic.
                            // But `inset - 0` relies on parent size.
                            // The transform container has 0 size by default if absolute.
                            // We need to give it dimensions.
                            width: '2000px',
                            height: '2000px'
                        }}
                    />
                ) : (
                    <div
                        className="absolute flex items-center justify-center text-muted-foreground/20 pointer-events-none border-2 border-dashed border-muted-foreground/20"
                        style={{ width: '2000px', height: '2000px' }}
                    >
                        No Map Background
                    </div>
                )}

                {/* Grid Layer */}
                <div
                    className="absolute pointer-events-none opacity-10"
                    style={{
                        width: '2000px',
                        height: '2000px',
                        backgroundImage: `linear-gradient(to right, #000 1px, transparent 1px), linear-gradient(to bottom, #000 1px, transparent 1px)`,
                        backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`
                    }}
                />

                {/* Tokens Layer */}
                {tokens.map(token => {
                    const isSelected = selectedTokenId === token.id;
                    const x = (isSelected && previewPosition) ? previewPosition.x / GRID_SIZE : token.x;
                    const y = (isSelected && previewPosition) ? previewPosition.y / GRID_SIZE : token.y;

                    return (
                        <MapTokenComponent
                            key={token.id}
                            {...token}
                            x={x}
                            y={y}
                            isSelected={isSelected}
                            onMouseDown={(e: React.MouseEvent) => handleTokenMouseDown(e, token)}
                        />
                    );
                })}
            </div>

            {/* Controls Overlay */}
            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="bg-background/80 p-1 rounded text-xs font-mono mr-2 flex items-center">
                    {Math.round(scale * 100)}%
                </div>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="secondary" size="icon" className="shadow-md">
                            <ImageIcon className="w-4 h-4" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80">
                        <div className="flex gap-2">
                            <Input
                                placeholder="Image URL"
                                value={newBgUrl}
                                onChange={(e) => setNewBgUrl(e.target.value)}
                            />
                            <Button onClick={handleBackgroundUpdate}>Set</Button>
                        </div>
                    </PopoverContent>
                </Popover>

                <Button variant="secondary" size="icon" className="shadow-md" onClick={handleAddToken}>
                    <Plus className="w-4 h-4" />
                </Button>
            </div>
        </div>
    );
}
