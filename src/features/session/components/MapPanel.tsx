
import { Button } from '@/components/ui/button';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useSelf } from '@/liveblocks.config';
import { Edit, Image as ImageIcon, Monitor, Trash2 } from 'lucide-react';
/* eslint-disable @next/next/no-img-element */
import { AssetPicker } from '@/features/assets/components/AssetPicker';
import React, { useCallback, useRef, useState } from 'react';
import { MapToken, ScreenPanel, SessionLogEntry } from '../domain/SessionLog';
import { MapCanvas } from './MapCanvas';
import { MapControls } from './MapControls';
import { TokenLayer } from './TokenLayer';

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

const GRID_SIZE = 50;
const WORLD_SIZE = 20000;
const WORLD_OFFSET = WORLD_SIZE / 2;

export function MapPanel({
    backgroundImageUrl,
    backgroundWidth = 2000,
    backgroundHeight = 2000,
    staticBackgroundImageUrl,
    tokens,
    screenPanels = [],
    onLog,
    selectedTokenId,
    onSelectToken,
    currentUserId,
}: MapPanelProps) {
    const [isDraggingToken, setIsDraggingToken] = useState(false);
    const [isDraggingPanel, setIsDraggingPanel] = useState(false);
    const [selectedPanelId, setSelectedPanelId] = useState<string | null>(null);
    const [isPanning, setIsPanning] = useState(false);

    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [previewPosition, setPreviewPosition] = useState<{ x: number; y: number } | null>(null);

    const [scale, setScale] = useState(1);
    const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });

    const [newBgUrl, setNewBgUrl] = useState('');
    const [newBgWidth, setNewBgWidth] = useState('2000');
    const [newBgHeight, setNewBgHeight] = useState('2000');
    const [newStaticBgUrl, setNewStaticBgUrl] = useState('');

    const containerRef = useRef<HTMLDivElement>(null);
    const myId = useSelf(me => me.id);

    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.stopPropagation();
        if (!containerRef.current) return;

        const ZOOM_SENSITIVITY = 0.001;
        const MIN_SCALE = 0.1;
        const MAX_SCALE = 5;

        const delta = -e.deltaY * ZOOM_SENSITIVITY;
        const newScale = Math.min(Math.max(scale + delta, MIN_SCALE), MAX_SCALE);
        const containerRect = containerRef.current.getBoundingClientRect();
        const mouseX = e.clientX - containerRect.left;
        const mouseY = e.clientY - containerRect.top;
        const mapX = (mouseX - panOffset.x) / scale;
        const mapY = (mouseY - panOffset.y) / scale;
        const newPanX = mouseX - mapX * newScale;
        const newPanY = mouseY - mapY * newScale;

        setScale(newScale);
        setPanOffset({ x: newPanX, y: newPanY });
    }, [panOffset.x, panOffset.y, scale]);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        setIsPanning(true);
        setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    }, [panOffset.x, panOffset.y]);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (isPanning) {
            setPanOffset({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
            return;
        }

        if ((!isDraggingToken && !isDraggingPanel) || !containerRef.current) return;
        if ((isDraggingToken && !selectedTokenId) || (isDraggingPanel && !selectedPanelId)) return;

        const containerRect = containerRef.current.getBoundingClientRect();
        const x = (e.clientX - containerRect.left - panOffset.x) / scale - dragOffset.x;
        const y = (e.clientY - containerRect.top - panOffset.y) / scale - dragOffset.y;
        setPreviewPosition({ x, y });
    }, [dragOffset.x, dragOffset.y, isDraggingPanel, isDraggingToken, isPanning, panOffset.x, panOffset.y, panStart.x, panStart.y, scale, selectedPanelId, selectedTokenId]);

    const handleMouseUp = useCallback((e: React.MouseEvent) => {
        if (isPanning) {
            setIsPanning(false);
            return;
        }

        if (!containerRef.current) return;
        const containerRect = containerRef.current.getBoundingClientRect();
        const rawX = (e.clientX - containerRect.left - panOffset.x) / scale - dragOffset.x;
        const rawY = (e.clientY - containerRect.top - panOffset.y) / scale - dragOffset.y;
        const gridX = Math.round(rawX / GRID_SIZE);
        const gridY = Math.round(rawY / GRID_SIZE);

        if (isDraggingToken && selectedTokenId) {
            const token = tokens.find(t => t.id === selectedTokenId);
            if (token && (token.x !== gridX || token.y !== gridY)) {
                onLog({
                    id: crypto.randomUUID(),
                    type: 'MOVE_TOKEN',
                    timestamp: Date.now(),
                    token: { id: selectedTokenId, x: gridX, y: gridY, creatorId: myId },
                    description: 'Moved token',
                });
            }
        } else if (isDraggingPanel && selectedPanelId) {
            const panel = screenPanels.find(p => p.id === selectedPanelId);
            if (panel && (panel.x !== gridX || panel.y !== gridY)) {
                onLog({
                    id: crypto.randomUUID(),
                    type: 'UPDATE_SCREEN_PANEL',
                    timestamp: Date.now(),
                    screenPanel: { ...panel, x: gridX, y: gridY },
                    description: 'Moved screen panel',
                });
            }
        }

        setIsDraggingToken(false);
        setIsDraggingPanel(false);
        setPreviewPosition(null);
    }, [dragOffset.x, dragOffset.y, isDraggingPanel, isDraggingToken, isPanning, myId, onLog, panOffset.x, panOffset.y, scale, screenPanels, selectedPanelId, selectedTokenId, tokens]);

    const handleMouseLeave = useCallback(() => {
        setIsDraggingToken(false);
        setIsDraggingPanel(false);
        setIsPanning(false);
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
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

                onLog({
                    id: crypto.randomUUID(),
                    type: 'ADD_TOKEN',
                    timestamp: Date.now(),
                    token: {
                        id: crypto.randomUUID(),
                        name: data.name,
                        x: gridX,
                        y: gridY,
                        size: data.size || 1,
                        creatorId: myId,
                        participantId: data.participantId,
                        imageUrl: data.avatarUrl,
                    },
                    description: `Added token for ${data.name}`,
                });
            }
        } catch (err) {
            console.error('Failed to parse drop data', err);
        }
    }, [myId, onLog, panOffset.x, panOffset.y, scale]);


    const handleTokenMouseDown = useCallback((e: React.MouseEvent, token: MapToken) => {
        e.stopPropagation();
        if (e.button !== 0 || !containerRef.current) return;

        onSelectToken?.(token.id);
        setIsDraggingToken(true);

        const containerRect = containerRef.current.getBoundingClientRect();
        const mouseX = (e.clientX - containerRect.left - panOffset.x) / scale;
        const mouseY = (e.clientY - containerRect.top - panOffset.y) / scale;
        const tokenX = token.x * GRID_SIZE;
        const tokenY = token.y * GRID_SIZE;

        setDragOffset({ x: mouseX - tokenX, y: mouseY - tokenY });
    }, [onSelectToken, panOffset.x, panOffset.y, scale]);

    const handlePanelMouseDown = useCallback((e: React.MouseEvent, panel: ScreenPanel) => {
        e.stopPropagation();
        if (e.button !== 0 || !containerRef.current) return;

        setSelectedPanelId(panel.id);
        setIsDraggingPanel(true);

        const containerRect = containerRef.current.getBoundingClientRect();
        const mouseX = (e.clientX - containerRect.left - panOffset.x) / scale;
        const mouseY = (e.clientY - containerRect.top - panOffset.y) / scale;
        const panelX = panel.x * GRID_SIZE;
        const panelY = panel.y * GRID_SIZE;

        setDragOffset({ x: mouseX - panelX, y: mouseY - panelY });
    }, [panOffset.x, panOffset.y, scale]);

    // Dialog and Control handlers
    const [editingToken, setEditingToken] = useState<MapToken | null>(null);
    const [editImageUrl, setEditImageUrl] = useState('');
    const [editingPanel, setEditingPanel] = useState<Partial<ScreenPanel> | null>(null);
    const [isPanelWizardOpen, setIsPanelWizardOpen] = useState(false);

    const handleBackgroundUpdate = useCallback(() => {
        if (!newBgUrl) return;
        onLog({
            id: crypto.randomUUID(),
            type: 'UPDATE_MAP_BACKGROUND',
            timestamp: Date.now(),
            mapBackground: { url: newBgUrl, width: parseInt(newBgWidth) || 2000, height: parseInt(newBgHeight) || 2000 },
            description: 'Updated map background',
        });
        setNewBgUrl('');
    }, [newBgUrl, newBgWidth, newBgHeight, onLog]);

    const handleStaticBackgroundUpdate = useCallback(() => {
        if (!newStaticBgUrl) return;
        onLog({
            id: crypto.randomUUID(),
            type: 'UPDATE_STATIC_BACKGROUND',
            timestamp: Date.now(),
            staticBackground: { url: newStaticBgUrl },
            description: 'Updated static background',
        });
        setNewStaticBgUrl('');
    }, [newStaticBgUrl, onLog]);

    const handleAddToken = useCallback(() => {
        onLog({
            id: crypto.randomUUID(),
            type: 'ADD_TOKEN',
            timestamp: Date.now(),
            token: { id: crypto.randomUUID(), name: 'New Token', x: 4, y: 4, size: 1, creatorId: myId },
        });
    }, [myId, onLog]);

    const handleAddScreenPanel = useCallback(() => {
        setEditingPanel({
            id: crypto.randomUUID(),
            x: Math.round((-panOffset.x / scale + 100) / GRID_SIZE),
            y: Math.round((-panOffset.y / scale + 100) / GRID_SIZE),
            width: 4,
            height: 3,
            zIndex: 0,
            imageUrl: '',
            backImageUrl: '',
            memo: '',
            visibility: 'all',
            ownerId: myId,
        });
        setIsPanelWizardOpen(true);
    }, [myId, panOffset.x, panOffset.y, scale]);

    const handleSaveScreenPanel = useCallback(() => {
        if (!editingPanel?.id) return;
        const existing = screenPanels.find(p => p.id === editingPanel.id);
        onLog({
            id: crypto.randomUUID(),
            type: existing ? 'UPDATE_SCREEN_PANEL' : 'ADD_SCREEN_PANEL',
            timestamp: Date.now(),
            screenPanel: editingPanel as ScreenPanel,
            description: existing ? 'Updated screen panel' : 'Added screen panel',
        });
        setIsPanelWizardOpen(false);
        setEditingPanel(null);
    }, [editingPanel, onLog, screenPanels]);

    const handleUpdateTokenImage = useCallback(() => {
        if (!editingToken) return;
        onLog({
            id: crypto.randomUUID(),
            type: 'UPDATE_TOKEN',
            timestamp: Date.now(),
            token: { ...editingToken, imageUrl: editImageUrl },
            description: `Updated token: ${editingToken.name}`,
        });
        setEditingToken(null);
        setEditImageUrl('');
    }, [editingToken, editImageUrl, onLog]);

    const handleDeleteToken = useCallback((token: MapToken) => {
        onLog({
            id: crypto.randomUUID(),
            type: 'REMOVE_TOKEN',
            token,
            timestamp: Date.now(),
            description: `Removed token: ${token.name}`,
        });
    }, [onLog]);

    const handleEditToken = useCallback((token: MapToken) => {
        setEditingToken(token);
        setEditImageUrl(token.imageUrl || '');
    }, []);

    const renderScreenPanels = () => screenPanels.map(panel => {
        const isSelected = selectedPanelId === panel.id;
        const x = isSelected && previewPosition ? previewPosition.x / GRID_SIZE : panel.x;
        const y = isSelected && previewPosition ? previewPosition.y / GRID_SIZE : panel.y;
        const isOwner = panel.ownerId === currentUserId;
        const isVisible = panel.visibility !== 'none' || isOwner;
        const showBack = (panel.visibility === 'owner' && !isOwner) || (panel.visibility === 'others' && isOwner);

        if (!isVisible) return null;

        const displayUrl = showBack ? panel.backImageUrl || '' : panel.imageUrl;
        const hasMemo = !!panel.memo && !showBack;

        return (
            <ContextMenu key={panel.id}>
                <ContextMenuTrigger asChild>
                    <div
                        className={cn(
                            'absolute transition-transform hover:brightness-110',
                            isDraggingPanel && isSelected ? 'cursor-grabbing' : 'cursor-grab'
                        )}
                        style={{
                            left: `${x * GRID_SIZE}px`,
                            top: `${y * GRID_SIZE}px`,
                            width: `${panel.width * GRID_SIZE}px`,
                            height: `${panel.height * GRID_SIZE}px`,
                            zIndex: panel.zIndex,
                        }}
                        onMouseDown={e => handlePanelMouseDown(e, panel)}
                    >
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="w-full h-full relative group">
                                    {displayUrl ? (
                                        <img src={displayUrl} alt="Panel" className="w-full h-full object-cover rounded-sm shadow-md pointer-events-none select-none" />
                                    ) : (
                                        <div className="w-full h-full bg-black/50 flex items-center justify-center text-white/50 border-2 border-dashed border-white/30 rounded-sm">
                                            <Monitor className="w-8 h-8" />
                                        </div>
                                    )}
                                    {hasMemo && <div className="absolute top-1 right-1 w-3 h-3 bg-yellow-400 rounded-full shadow-sm border border-yellow-600" />}
                                </div>
                            </TooltipTrigger>
                            {hasMemo && <TooltipContent className="max-w-xs whitespace-pre-wrap">{panel.memo}</TooltipContent>}
                        </Tooltip>
                    </div>
                </ContextMenuTrigger>
                <ContextMenuContent>
                    <ContextMenuItem onClick={() => { setEditingPanel(panel); setIsPanelWizardOpen(true); }}>
                        <Edit className="w-4 h-4 mr-2" />Edit Panel...
                    </ContextMenuItem>
                    <ContextMenuItem className="text-destructive" onClick={() => onLog({ id: crypto.randomUUID(), type: 'REMOVE_SCREEN_PANEL', timestamp: Date.now(), screenPanel: panel, description: 'Removed screen panel' })}>
                        <Trash2 className="w-4 h-4 mr-2" />Remove Panel
                    </ContextMenuItem>
                </ContextMenuContent>
            </ContextMenu>
        );
    });

    return (
        <TooltipProvider>
            <div
                className="relative w-full h-full overflow-hidden bg-muted/10 select-none group rounded-lg border border-border/50 shadow-inner"
                ref={containerRef}
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
            >
                {staticBackgroundImageUrl && (
                    <div className="absolute inset-0 bg-cover bg-center z-0 opacity-50 pointer-events-none" style={{ backgroundImage: `url(${staticBackgroundImageUrl})` }} />
                )}

                <div className="absolute origin-top-left transition-transform duration-75 ease-linear will-change-transform z-10" style={{ transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${scale})` }}>
                    <MapCanvas
                        backgroundImageUrl={backgroundImageUrl}
                        backgroundWidth={backgroundWidth}
                        backgroundHeight={backgroundHeight}
                        gridSize={GRID_SIZE}
                        worldSize={WORLD_SIZE}
                        worldOffset={WORLD_OFFSET}
                    />
                    {renderScreenPanels()}
                    <TokenLayer
                        tokens={tokens}
                        selectedTokenId={selectedTokenId}
                        previewPosition={previewPosition}
                        gridSize={GRID_SIZE}
                        isDraggingToken={isDraggingToken}
                        onTokenMouseDown={handleTokenMouseDown}
                        onEditToken={handleEditToken}
                        onDeleteToken={handleDeleteToken}
                    />
                </div>

                <MapControls
                    scale={scale}
                    newBgUrl={newBgUrl} setNewBgUrl={setNewBgUrl}
                    newBgWidth={newBgWidth} setNewBgWidth={setNewBgWidth}
                    newBgHeight={newBgHeight} setNewBgHeight={setNewBgHeight}
                    handleBackgroundUpdate={handleBackgroundUpdate}
                    newStaticBgUrl={newStaticBgUrl} setNewStaticBgUrl={setNewStaticBgUrl}
                    handleStaticBackgroundUpdate={handleStaticBackgroundUpdate}
                    onAddToken={handleAddToken}
                    onAddScreenPanel={handleAddScreenPanel}
                />

                <Dialog open={isPanelWizardOpen} onOpenChange={setIsPanelWizardOpen}>
                    <DialogContent className="sm:max-w-[600px]">
                        <DialogHeader>
                            <DialogTitle>Screen Panel Wizard</DialogTitle>
                            <DialogDescription>Configure the screen panel appearance, content, and visibility.</DialogDescription>
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
                                        <div className="flex gap-2">
                                            <Input value={editingPanel.imageUrl || ''} onChange={e => setEditingPanel({ ...editingPanel, imageUrl: e.target.value })} placeholder="https://..." />
                                            <AssetPicker type="image" onSelect={url => setEditingPanel({ ...editingPanel, imageUrl: url })} trigger={<Button variant="outline" size="icon"><ImageIcon className="w-4 h-4" /></Button>} />
                                        </div>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Back Image URL (Optional)</Label>
                                        <div className="flex gap-2">
                                            <Input value={editingPanel.backImageUrl || ''} onChange={e => setEditingPanel({ ...editingPanel, backImageUrl: e.target.value })} placeholder="Image to show when hidden/unauthorized" />
                                            <AssetPicker type="image" onSelect={url => setEditingPanel({ ...editingPanel, backImageUrl: url })} trigger={<Button variant="outline" size="icon"><ImageIcon className="w-4 h-4" /></Button>} />
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="grid gap-2 flex-1"><Label>Width (Grid)</Label><Input type="number" value={editingPanel.width} onChange={e => setEditingPanel({ ...editingPanel, width: parseInt(e.target.value) || 1 })} /></div>
                                        <div className="grid gap-2 flex-1"><Label>Height (Grid)</Label><Input type="number" value={editingPanel.height} onChange={e => setEditingPanel({ ...editingPanel, height: parseInt(e.target.value) || 1 })} /></div>
                                        <div className="grid gap-2 flex-1"><Label>Z-Index</Label><Input type="number" value={editingPanel.zIndex} onChange={e => setEditingPanel({ ...editingPanel, zIndex: parseInt(e.target.value) || 0 })} /></div>
                                    </div>
                                </TabsContent>
                                <TabsContent value="content" className="space-y-4 py-4">
                                    <div className="grid gap-2 h-full">
                                        <Label>Memo (Tooltip)</Label>
                                        <Textarea className="min-h-[200px]" value={editingPanel.memo || ''} onChange={e => setEditingPanel({ ...editingPanel, memo: e.target.value })} placeholder="Enter text to display when hovering over the panel..." />
                                    </div>
                                </TabsContent>
                                <TabsContent value="settings" className="space-y-4 py-4">
                                    <div className="grid gap-2">
                                        <Label>Visibility Mode</Label>
                                        <Select value={editingPanel.visibility} onValueChange={(val: string) => setEditingPanel({ ...editingPanel, visibility: val as ScreenPanel['visibility'] })}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
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

                <Dialog open={!!editingToken} onOpenChange={open => !open && setEditingToken(null)}>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Token Details</DialogTitle>
                            <DialogDescription>Configure the appearance and properties of this token.</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="name" className="text-right text-sm font-medium">Name</Label><Input id="name" value={editingToken?.name || ''} onChange={e => editingToken && setEditingToken({ ...editingToken, name: e.target.value })} className="col-span-3" /></div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="image" className="text-right text-sm font-medium">Image URL</Label>
                                <div className="col-span-3 flex gap-2">
                                    <Input id="image" value={editImageUrl} onChange={e => setEditImageUrl(e.target.value)} />
                                    <AssetPicker type="image" onSelect={setEditImageUrl} trigger={<Button variant="outline" size="icon"><ImageIcon className="w-4 h-4" /></Button>} />
                                </div>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right text-sm font-medium">Size</Label>
                                <div className="col-span-3">
                                    <Input type="number" min={1} step={1} value={editingToken?.size || 1} onChange={e => { const val = parseInt(e.target.value); if (!isNaN(val) && val >= 1 && editingToken) { setEditingToken({ ...editingToken, size: val }); } }} />
                                    <p className="text-xs text-muted-foreground mt-1">Enter a natural number (e.g., 1, 2, 3).</p>
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
