
import { Button } from '@/components/ui/button';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useSelf } from '@/liveblocks.config';
import { Edit, Grid, Image as ImageIcon, Map as MapIcon, Monitor, Plus, Trash2 } from 'lucide-react';
/* eslint-disable @next/next/no-img-element */
import React, { useRef, useState } from 'react';
import { MapToken, ScreenPanel, SessionLogEntry } from '../domain/SessionLog';

interface MapPanelProps {
    backgroundImageUrl?: string;
    backgroundWidth?: number;
    backgroundHeight?: number;
    staticBackgroundImageUrl?: string;
    tokens: MapToken[];
    screenPanels?: ScreenPanel[];
    onLog: (log: SessionLogEntry) => void;
    selectedTokenId?: string | null;
    onSelectToken?: (id: string) => void;
    currentUserId?: string;
}

export function MapPanel({ backgroundImageUrl, backgroundWidth = 2000, backgroundHeight = 2000, staticBackgroundImageUrl, tokens, screenPanels = [], onLog, selectedTokenId, onSelectToken, currentUserId }: MapPanelProps) {
    // const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null); // Removed local state
    const [isDraggingToken, setIsDraggingToken] = useState(false);
    const [isDraggingPanel, setIsDraggingPanel] = useState(false);
    const [selectedPanelId, setSelectedPanelId] = useState<string | null>(null);
    const [isPanning, setIsPanning] = useState(false);

    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [previewPosition, setPreviewPosition] = useState<{ x: number, y: number } | null>(null);

    const [scale, setScale] = useState(1);
    const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });

    const [newBgUrl, setNewBgUrl] = useState('');
    const [newBgWidth, setNewBgWidth] = useState('2000');
    const [newBgHeight, setNewBgHeight] = useState('2000');
    const [newStaticBgUrl, setNewStaticBgUrl] = useState('');

    const containerRef = useRef<HTMLDivElement>(null);
    const GRID_SIZE = 50;
    // Huge world size for "infinite" feel
    const WORLD_SIZE = 20000;
    const WORLD_OFFSET = WORLD_SIZE / 2; // Center (0,0) in the middle of the world div

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
        const mapX = (mouseX - panOffset.x) / scale;
        const mapY = (mouseY - panOffset.y) / scale;

        // Calculate new pan offset to keep map point under mouse
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
        // Only allow left-click to drag
        if (e.button !== 0) return;

        if (!containerRef.current) return;

        // Select the token
        onSelectToken?.(token.id);
        setIsDraggingToken(true);

        const containerRect = containerRef.current.getBoundingClientRect();
        const mouseX = (e.clientX - containerRect.left - panOffset.x) / scale;
        const mouseY = (e.clientY - containerRect.top - panOffset.y) / scale;

        const tokenX = token.x * GRID_SIZE;
        const tokenY = token.y * GRID_SIZE;

        setDragOffset({
            x: mouseX - tokenX,
            y: mouseY - tokenY
        });
    };

    const handlePanelMouseDown = (e: React.MouseEvent, panel: ScreenPanel) => {
        e.stopPropagation();
        if (e.button !== 0) return;
        if (!containerRef.current) return;

        setSelectedPanelId(panel.id);
        setIsDraggingPanel(true);

        const containerRect = containerRef.current.getBoundingClientRect();
        const mouseX = (e.clientX - containerRect.left - panOffset.x) / scale;
        const mouseY = (e.clientY - containerRect.top - panOffset.y) / scale;

        const panelX = panel.x * GRID_SIZE;
        const panelY = panel.y * GRID_SIZE;

        setDragOffset({
            x: mouseX - panelX,
            y: mouseY - panelY
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

        if ((!isDraggingToken && !isDraggingPanel) || !containerRef.current) return;
        if (isDraggingToken && !selectedTokenId) return;
        if (isDraggingPanel && !selectedPanelId) return;

        const containerRect = containerRef.current.getBoundingClientRect();
        // Adjust mouse position by pan offset and scale
        const x = (e.clientX - containerRect.left - panOffset.x) / scale - dragOffset.x;
        const y = (e.clientY - containerRect.top - panOffset.y) / scale - dragOffset.y;

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

            // Check if position actually changed
            const token = tokens.find(t => t.id === selectedTokenId);
            if (token && (token.x !== gridX || token.y !== gridY)) {
                onLog({
                    id: crypto.randomUUID(),
                    type: 'MOVE_TOKEN',
                    // eslint-disable-next-line react-hooks/purity
                    timestamp: Date.now(),
                    token: {
                        id: selectedTokenId,
                        x: gridX, // Allow negative coordinates
                        y: gridY,
                        creatorId: myId,
                    },
                    description: `Moved token`
                });
            }
        } else if (isDraggingPanel && selectedPanelId && containerRef.current) {
            const containerRect = containerRef.current.getBoundingClientRect();
            const rawX = (e.clientX - containerRect.left - panOffset.x) / scale - dragOffset.x;
            const rawY = (e.clientY - containerRect.top - panOffset.y) / scale - dragOffset.y;
            const gridX = Math.round(rawX / GRID_SIZE);
            const gridY = Math.round(rawY / GRID_SIZE);

            const panel = screenPanels.find(p => p.id === selectedPanelId);
            if (panel && (panel.x !== gridX || panel.y !== gridY)) {
                onLog({
                    id: crypto.randomUUID(),
                    type: 'UPDATE_SCREEN_PANEL',
                    // eslint-disable-next-line react-hooks/purity
                    timestamp: Date.now(),
                    screenPanel: {
                        ...panel,
                        x: gridX,
                        y: gridY
                    },
                    description: `Moved screen panel`
                });
            }
        }
        setIsDraggingToken(false);
        setIsDraggingPanel(false);
        setPreviewPosition(null);
        // Do NOT clear selection on mouse up, so it stays selected
        // setSelectedTokenId(null); 
    };

    const handleBackgroundUpdate = () => {
        if (!newBgUrl) return;
        const width = parseInt(newBgWidth) || 2000;
        const height = parseInt(newBgHeight) || 2000;

        onLog({
            id: crypto.randomUUID(),
            type: 'UPDATE_MAP_BACKGROUND',
            timestamp: Date.now(),
            mapBackground: {
                url: newBgUrl,
                width,
                height
            },
            description: 'Updated map background'
        });
        setNewBgUrl('');
    };

    const handleStaticBackgroundUpdate = () => {
        if (!newStaticBgUrl) return;
        onLog({
            id: crypto.randomUUID(),
            type: 'UPDATE_STATIC_BACKGROUND',
            timestamp: Date.now(),
            staticBackground: { url: newStaticBgUrl },
            description: 'Updated static background'
        });
        setNewStaticBgUrl('');
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
            roomId: 'demo',
            type: 'ADD_TOKEN',
            token: newToken,
            // eslint-disable-next-line react-hooks/purity
            timestamp: Date.now(),
        });
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (!containerRef.current) return;

        try {
            const data = JSON.parse(e.dataTransfer.getData('application/json'));
            if (data.type === 'ROSTER_PARTICIPANT') {
                const containerRect = containerRef.current.getBoundingClientRect();
                const rawX = (e.clientX - containerRect.left - panOffset.x) / scale;
                const rawY = (e.clientY - containerRect.top - panOffset.y) / scale;

                const gridX = Math.round(rawX / GRID_SIZE);
                const gridY = Math.round(rawY / GRID_SIZE);

                const newToken: MapToken = {
                    id: crypto.randomUUID(),
                    name: data.name,
                    x: gridX,
                    y: gridY,
                    size: data.size || 1,
                    creatorId: myId,
                    participantId: data.participantId, // Link to roster
                    imageUrl: data.avatarUrl // Use avatarUrl
                };

                onLog({
                    id: crypto.randomUUID(),
                    roomId: 'demo', // This might need to be passed or removed if not used
                    type: 'ADD_TOKEN',
                    token: newToken,
                    // eslint-disable-next-line react-hooks/purity
                    timestamp: Date.now(),
                    description: `Added token for ${data.name}`
                });
            }
        } catch (err) {
            console.error('Failed to parse drop data', err);
        }
    };

    const [editingToken, setEditingToken] = useState<MapToken | null>(null);
    const [editImageUrl, setEditImageUrl] = useState('');

    // Screen Panel Wizard State
    const [editingPanel, setEditingPanel] = useState<Partial<ScreenPanel> | null>(null);
    const [isPanelWizardOpen, setIsPanelWizardOpen] = useState(false);

    const handleAddScreenPanel = () => {
        setEditingPanel({
            id: crypto.randomUUID(),
            x: Math.round((-panOffset.x / scale + 100) / GRID_SIZE), // Center-ish
            y: Math.round((-panOffset.y / scale + 100) / GRID_SIZE),
            width: 4,
            height: 3,
            zIndex: 0,
            imageUrl: '',
            backImageUrl: '',
            memo: '',
            visibility: 'all',
            ownerId: myId
        });
        setIsPanelWizardOpen(true);
    };

    const handleSaveScreenPanel = () => {
        if (!editingPanel || !editingPanel.id) return;

        // If it's a new panel (not in list), ADD. If existing, UPDATE.
        const existing = screenPanels.find(p => p.id === editingPanel.id);
        const type = existing ? 'UPDATE_SCREEN_PANEL' : 'ADD_SCREEN_PANEL';

        onLog({
            id: crypto.randomUUID(),
            type: type,
            // eslint-disable-next-line react-hooks/purity
            timestamp: Date.now(),
            screenPanel: editingPanel as ScreenPanel,
            description: existing ? 'Updated screen panel' : 'Added screen panel'
        });
        setIsPanelWizardOpen(false);
        setEditingPanel(null);
    };

    const handleUpdateTokenImage = () => {
        if (!editingToken) return;
        onLog({
            id: crypto.randomUUID(),
            type: 'UPDATE_TOKEN',
            timestamp: Date.now(),
            token: {
                ...editingToken,
                imageUrl: editImageUrl,
                // name and size are already updated in editingToken state by inputs
            },
            description: `Updated token: ${editingToken.name}`
        });
        setEditingToken(null);
        setEditImageUrl('');
    };

    return (
        <TooltipProvider>
            <div
                className="relative w-full h-full overflow-hidden bg-muted/10 select-none group rounded-lg border border-border/50 shadow-inner"
                ref={containerRef}
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={() => {
                    setIsDraggingToken(false);
                    setIsDraggingPanel(false);
                    setIsPanning(false);
                }}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
            >
                {/* Layer 0: Static Background (Fixed) */}
                {staticBackgroundImageUrl && (
                    <div
                        className="absolute inset-0 bg-cover bg-center z-0 opacity-50 pointer-events-none"
                        style={{ backgroundImage: `url(${staticBackgroundImageUrl})` }}
                    />
                )}

                {/* Transform Container */}
                <div
                    className="absolute origin-top-left transition-transform duration-75 ease-linear will-change-transform z-10"
                    style={{
                        transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${scale})`
                    }}
                >
                    {/* Infinite Grid Layer */}
                    <div
                        className="absolute pointer-events-none opacity-20"
                        style={{
                            left: -WORLD_OFFSET,
                            top: -WORLD_OFFSET,
                            width: WORLD_SIZE,
                            height: WORLD_SIZE,
                            backgroundImage: `linear-gradient(to right, #000 1px, transparent 1px), linear-gradient(to bottom, #000 1px, transparent 1px)`,
                            backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
                            // Align grid so (0,0) is at a line intersection
                            backgroundPosition: `${WORLD_OFFSET}px ${WORLD_OFFSET}px`
                        }}
                    />

                    {/* Foreground Map Layer (at 0,0) */}
                    {backgroundImageUrl ? (
                        <div
                            className="absolute top-0 left-0 bg-cover bg-center shadow-2xl"
                            style={{
                                backgroundImage: `url(${backgroundImageUrl})`,
                                width: `${backgroundWidth}px`,
                                height: `${backgroundHeight}px`
                            }}
                        />
                    ) : (
                        <div
                            className="absolute top-0 left-0 flex items-center justify-center pointer-events-none border-2 border-dashed border-muted-foreground/20 bg-background/10"
                            style={{ width: '2000px', height: '2000px' }}
                        >
                            <div className="flex flex-col items-center gap-4 text-muted-foreground/20">
                                <MapIcon className="w-32 h-32" />
                                <span className="text-4xl font-bold uppercase tracking-widest">Map Area</span>
                            </div>
                        </div>
                    )}


                    {/* Screen Panels Layer */}
                    {screenPanels.map(panel => {
                        const isSelected = selectedPanelId === panel.id;
                        const x = (isSelected && previewPosition) ? previewPosition.x / GRID_SIZE : panel.x;
                        const y = (isSelected && previewPosition) ? previewPosition.y / GRID_SIZE : panel.y;

                        // Visibility Logic
                        const isOwner = panel.ownerId === currentUserId;
                        let isVisible = true;
                        let showBack = false;

                        if (panel.visibility === 'none') {
                            isVisible = false; // Hidden from everyone (except maybe owner? usually owner sees ghost)
                            if (isOwner) isVisible = true; // Owner sees it
                        } else if (panel.visibility === 'owner') {
                            if (!isOwner) showBack = true;
                        } else if (panel.visibility === 'others') {
                            if (isOwner) showBack = true;
                        }

                        // If hidden completely (none + not owner), don't render or render placeholder?
                        // "Hidden" usually means "Not on map" or "Invisible". 
                        // But user asked for "Back Image" when hidden.
                        // Let's interpret:
                        // 'none': Only owner sees front. Others see NOTHING (or back image if set?). 
                        // Let's assume 'none' means "Hidden from map" for others.
                        if (!isVisible) return null;

                        const displayUrl = showBack ? (panel.backImageUrl || '') : panel.imageUrl;
                        const hasMemo = !!panel.memo && !showBack;

                        return (
                            <ContextMenu key={panel.id}>
                                <ContextMenuTrigger asChild>
                                    <div
                                        className={cn(
                                            "absolute transition-transform hover:brightness-110",
                                            isDraggingPanel && isSelected && "cursor-grabbing",
                                            !isDraggingPanel && "cursor-grab"
                                        )}
                                        style={{
                                            left: `${x * GRID_SIZE}px`,
                                            top: `${y * GRID_SIZE}px`,
                                            width: `${panel.width * GRID_SIZE}px`,
                                            height: `${panel.height * GRID_SIZE}px`,
                                            zIndex: panel.zIndex
                                        }}
                                        onMouseDown={(e) => handlePanelMouseDown(e, panel)}
                                    >
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <div className="w-full h-full relative group">
                                                    {displayUrl ? (
                                                        <img
                                                            src={displayUrl}
                                                            alt="Panel"
                                                            className="w-full h-full object-cover rounded-sm shadow-md pointer-events-none select-none"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full bg-black/50 flex items-center justify-center text-white/50 border-2 border-dashed border-white/30 rounded-sm">
                                                            <Monitor className="w-8 h-8" />
                                                        </div>
                                                    )}
                                                    {/* Memo Indicator */}
                                                    {hasMemo && (
                                                        <div className="absolute top-1 right-1 w-3 h-3 bg-yellow-400 rounded-full shadow-sm border border-yellow-600" />
                                                    )}
                                                </div>
                                            </TooltipTrigger>
                                            {hasMemo && (
                                                <TooltipContent className="max-w-xs whitespace-pre-wrap">
                                                    {panel.memo}
                                                </TooltipContent>
                                            )}
                                        </Tooltip>
                                    </div>
                                </ContextMenuTrigger>
                                <ContextMenuContent>
                                    <ContextMenuItem onClick={() => {
                                        setEditingPanel(panel);
                                        setIsPanelWizardOpen(true);
                                    }}>
                                        <Edit className="w-4 h-4 mr-2" />
                                        Edit Panel...
                                    </ContextMenuItem>
                                    <ContextMenuItem
                                        className="text-destructive"
                                        onClick={() => {
                                            onLog({
                                                id: crypto.randomUUID(),
                                                type: 'REMOVE_SCREEN_PANEL',
                                                timestamp: Date.now(),
                                                screenPanel: panel,
                                                description: 'Removed screen panel'
                                            });
                                        }}
                                    >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Remove Panel
                                    </ContextMenuItem>
                                </ContextMenuContent>
                            </ContextMenu>
                        );
                    })}

                    {/* Tokens Layer */}
                    {tokens.map(token => {
                        const isSelected = selectedTokenId === token.id;
                        const x = (isSelected && previewPosition) ? previewPosition.x / GRID_SIZE : token.x;
                        const y = (isSelected && previewPosition) ? previewPosition.y / GRID_SIZE : token.y;

                        return (
                            <ContextMenu key={token.id}>
                                <ContextMenuTrigger asChild>
                                    <div
                                        className={cn(
                                            "absolute flex items-center justify-center rounded-full shadow-md cursor-grab active:cursor-grabbing transition-transform hover:scale-110 border-2 overflow-hidden",
                                            token.participantId ? "border-blue-500 bg-blue-100" : "border-primary bg-primary/20",
                                            isDraggingToken && "cursor-grabbing"
                                        )}
                                        style={{
                                            left: `${x * GRID_SIZE}px`,
                                            top: `${y * GRID_SIZE}px`,
                                            width: `${(token.size || 1) * GRID_SIZE}px`,
                                            height: `${(token.size || 1) * GRID_SIZE}px`,
                                            transform: 'translate(-50%, -50%)', // Center anchor
                                            zIndex: 10 // Ensure tokens are above map
                                        }}
                                        onMouseDown={(e) => handleTokenMouseDown(e, token)}
                                    >
                                        {token.imageUrl ? (
                                            <img
                                                src={token.imageUrl}
                                                alt={token.name}
                                                className="w-full h-full object-cover pointer-events-none select-none"
                                            />
                                        ) : (
                                            <span className="text-xs font-bold truncate max-w-full px-1 pointer-events-none select-none">
                                                {token.name}
                                            </span>
                                        )}
                                    </div>
                                </ContextMenuTrigger>
                                <ContextMenuContent>
                                    <ContextMenuItem
                                        onClick={() => {
                                            setEditingToken(token);
                                            setEditImageUrl(token.imageUrl || '');
                                        }}
                                    >
                                        <ImageIcon className="w-4 h-4 mr-2" />
                                        Token Details...
                                    </ContextMenuItem>
                                    <ContextMenuItem
                                        className="text-destructive focus:text-destructive"
                                        onClick={() => {
                                            onLog({
                                                id: crypto.randomUUID(),
                                                roomId: 'demo',
                                                type: 'REMOVE_TOKEN',
                                                token: token,
                                                timestamp: Date.now(),
                                                description: `Removed token: ${token.name}`
                                            });
                                        }}
                                    >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Delete Token
                                    </ContextMenuItem>
                                </ContextMenuContent>
                            </ContextMenu>
                        );
                    })}
                </div>

                {/* Controls Overlay */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-auto z-20">
                    <div className="bg-background/80 backdrop-blur-md p-1.5 rounded-md border shadow-lg flex items-center gap-2">
                        <div className="text-xs font-mono text-center px-2 border-r mr-1">
                            {Math.round(scale * 100)}%
                        </div>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary">
                                            <ImageIcon className="w-4 h-4" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-80" align="center">
                                        <div className="flex flex-col gap-3">
                                            <div className="space-y-1">
                                                <h4 className="font-medium text-xs text-muted-foreground">Map Image (Foreground)</h4>
                                                <div className="flex flex-col gap-2">
                                                    <Input
                                                        placeholder="Map URL"
                                                        value={newBgUrl}
                                                        onChange={(e) => setNewBgUrl(e.target.value)}
                                                    />
                                                    <div className="flex gap-2">
                                                        <Input
                                                            type="number"
                                                            placeholder="Width"
                                                            value={newBgWidth}
                                                            onChange={(e) => setNewBgWidth(e.target.value)}
                                                            className="w-20"
                                                        />
                                                        <Input
                                                            type="number"
                                                            placeholder="Height"
                                                            value={newBgHeight}
                                                            onChange={(e) => setNewBgHeight(e.target.value)}
                                                            className="w-20"
                                                        />
                                                        <Button size="sm" onClick={handleBackgroundUpdate} className="flex-1">Set</Button>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <h4 className="font-medium text-xs text-muted-foreground">Static Background (Wallpaper)</h4>
                                                <div className="flex gap-2">
                                                    <Input
                                                        placeholder="Wallpaper URL"
                                                        value={newStaticBgUrl}
                                                        onChange={(e) => setNewStaticBgUrl(e.target.value)}
                                                    />
                                                    <Button size="sm" onClick={handleStaticBackgroundUpdate}>Set</Button>
                                                </div>
                                            </div>
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">Background Settings</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary" onClick={handleAddToken}>
                                    <Plus className="w-4 h-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">Add Token</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary">
                                    <Grid className="w-4 h-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">Toggle Grid (WIP)</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary" onClick={handleAddScreenPanel}>
                                    <Monitor className="w-4 h-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">Add Screen Panel</TooltipContent>
                        </Tooltip>
                    </div>
                </div>

                {/* Screen Panel Wizard Dialog */}
                <Dialog open={isPanelWizardOpen} onOpenChange={setIsPanelWizardOpen}>
                    <DialogContent className="sm:max-w-[600px]">
                        <DialogHeader>
                            <DialogTitle>Screen Panel Wizard</DialogTitle>
                            <DialogDescription>
                                Configure the screen panel appearance, content, and visibility.
                            </DialogDescription>
                        </DialogHeader>

                        {editingPanel && (
                            <Tabs defaultValue="appearance" className="w-full">
                                <TabsList className="grid w-full grid-cols-3">
                                    <TabsTrigger value="appearance">Appearance</TabsTrigger>
                                    <TabsTrigger value="content">Content & Memo</TabsTrigger>
                                    <TabsTrigger value="settings">Settings</TabsTrigger>
                                </TabsList>

                                <TabsContent value="appearance" className="space-y-4 py-4">
                                    <div className="grid gap-2">
                                        <Label>Front Image URL</Label>
                                        <Input
                                            value={editingPanel.imageUrl || ''}
                                            onChange={(e) => setEditingPanel({ ...editingPanel, imageUrl: e.target.value })}
                                            placeholder="https://..."
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Back Image URL (Optional)</Label>
                                        <Input
                                            value={editingPanel.backImageUrl || ''}
                                            onChange={(e) => setEditingPanel({ ...editingPanel, backImageUrl: e.target.value })}
                                            placeholder="Image to show when hidden/unauthorized"
                                        />
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="grid gap-2 flex-1">
                                            <Label>Width (Grid)</Label>
                                            <Input
                                                type="number"
                                                value={editingPanel.width}
                                                onChange={(e) => setEditingPanel({ ...editingPanel, width: parseInt(e.target.value) || 1 })}
                                            />
                                        </div>
                                        <div className="grid gap-2 flex-1">
                                            <Label>Height (Grid)</Label>
                                            <Input
                                                type="number"
                                                value={editingPanel.height}
                                                onChange={(e) => setEditingPanel({ ...editingPanel, height: parseInt(e.target.value) || 1 })}
                                            />
                                        </div>
                                        <div className="grid gap-2 flex-1">
                                            <Label>Z-Index</Label>
                                            <Input
                                                type="number"
                                                value={editingPanel.zIndex}
                                                onChange={(e) => setEditingPanel({ ...editingPanel, zIndex: parseInt(e.target.value) || 0 })}
                                            />
                                        </div>
                                    </div>
                                </TabsContent>

                                <TabsContent value="content" className="space-y-4 py-4">
                                    <div className="grid gap-2 h-full">
                                        <Label>Memo (Tooltip)</Label>
                                        <Textarea
                                            className="min-h-[200px]"
                                            value={editingPanel.memo || ''}
                                            onChange={(e) => setEditingPanel({ ...editingPanel, memo: e.target.value })}
                                            placeholder="Enter text to display when hovering over the panel..."
                                        />
                                    </div>
                                </TabsContent>

                                <TabsContent value="settings" className="space-y-4 py-4">
                                    <div className="grid gap-2">
                                        <Label>Visibility Mode</Label>
                                        <Select
                                            value={editingPanel.visibility}
                                            onValueChange={(val: string) => setEditingPanel({ ...editingPanel, visibility: val as "none" | "all" | "owner" | "others" })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">Everyone (All)</SelectItem>
                                                <SelectItem value="owner">Only Me (Owner)</SelectItem>
                                                <SelectItem value="others">Everyone Else (Others)</SelectItem>
                                                <SelectItem value="none">Nobody (Hidden)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <p className="text-sm text-muted-foreground mt-2">
                                            <strong>All:</strong> Everyone sees the Front Image and Memo.<br />
                                            <strong>Only Me:</strong> You see Front+Memo. Others see Back Image.<br />
                                            <strong>Others:</strong> Others see Front+Memo. You see Back Image.<br />
                                            <strong>Hidden:</strong> Only you see Front+Memo (Ghost). Others see nothing.
                                        </p>
                                    </div>
                                </TabsContent>
                            </Tabs>
                        )}

                        <div className="flex justify-end gap-2 mt-4">
                            <Button variant="outline" onClick={() => setIsPanelWizardOpen(false)}>Cancel</Button>
                            <Button onClick={handleSaveScreenPanel}>Save Panel</Button>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Edit Token Details Dialog */}
                <Dialog open={!!editingToken} onOpenChange={(open) => !open && setEditingToken(null)}>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Token Details</DialogTitle>
                            <DialogDescription>
                                Configure the appearance and properties of this token.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <label htmlFor="name" className="text-right text-sm font-medium">
                                    Name
                                </label>
                                <Input
                                    id="name"
                                    value={editingToken?.name || ''}
                                    onChange={(e) => editingToken && setEditingToken({ ...editingToken, name: e.target.value })}
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <label htmlFor="image" className="text-right text-sm font-medium">
                                    Image URL
                                </label>
                                <Input
                                    id="image"
                                    value={editImageUrl}
                                    onChange={(e) => setEditImageUrl(e.target.value)}
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <label className="text-right text-sm font-medium">
                                    Size
                                </label>
                                <div className="col-span-3">
                                    <Input
                                        type="number"
                                        min={1}
                                        step={1}
                                        value={editingToken?.size || 1}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value);
                                            if (!isNaN(val) && val >= 1) {
                                                if (editingToken) {
                                                    setEditingToken({ ...editingToken, size: val });
                                                }
                                            }
                                        }}
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Enter a natural number (e.g., 1, 2, 3).
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <Button onClick={handleUpdateTokenImage}>Save Changes</Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </TooltipProvider>
    );
}
