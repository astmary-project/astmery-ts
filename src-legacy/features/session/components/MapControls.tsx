
import { AssetPicker } from '@/features/assets/components/AssetPicker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Grid, Image as ImageIcon, Monitor, Plus } from 'lucide-react';
import React from 'react';

interface MapControlsProps {
    scale: number;
    newBgUrl: string;
    setNewBgUrl: (url: string) => void;
    newBgWidth: string;
    setNewBgWidth: (width: string) => void;
    newBgHeight: string;
    setNewBgHeight: (height: string) => void;
    handleBackgroundUpdate: () => void;
    newStaticBgUrl: string;
    setNewStaticBgUrl: (url: string) => void;
    handleStaticBackgroundUpdate: () => void;
    onAddToken: () => void;
    onAddScreenPanel: () => void;
}

export const MapControls = React.memo(
    ({
        scale,
        newBgUrl,
        setNewBgUrl,
        newBgWidth,
        setNewBgWidth,
        newBgHeight,
        setNewBgHeight,
        handleBackgroundUpdate,
        newStaticBgUrl,
        setNewStaticBgUrl,
        handleStaticBackgroundUpdate,
        onAddToken,
        onAddScreenPanel,
    }: MapControlsProps) => {
        return (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-auto z-20">
                <div className="bg-background/80 backdrop-blur-md p-1.5 rounded-md border shadow-lg flex items-center gap-2">
                    <div className="text-xs font-mono text-center px-2 border-r mr-1">{Math.round(scale * 100)}%</div>

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
                                                <div className="flex gap-2">
                                                    <Input placeholder="Map URL" value={newBgUrl} onChange={e => setNewBgUrl(e.target.value)} />
                                                    <AssetPicker
                                                        type="image"
                                                        onSelect={setNewBgUrl}
                                                        trigger={
                                                            <Button variant="outline" size="icon">
                                                                <ImageIcon className="w-4 h-4" />
                                                            </Button>
                                                        }
                                                    />
                                                </div>
                                                <div className="flex gap-2">
                                                    <Input
                                                        type="number"
                                                        placeholder="Width"
                                                        value={newBgWidth}
                                                        onChange={e => setNewBgWidth(e.target.value)}
                                                        className="w-20"
                                                    />
                                                    <Input
                                                        type="number"
                                                        placeholder="Height"
                                                        value={newBgHeight}
                                                        onChange={e => setNewBgHeight(e.target.value)}
                                                        className="w-20"
                                                    />
                                                    <Button size="sm" onClick={handleBackgroundUpdate} className="flex-1">
                                                        Set
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <h4 className="font-medium text-xs text-muted-foreground">
                                                Static Background (Wallpaper)
                                            </h4>
                                            <div className="flex gap-2">
                                                <div className="flex gap-2 flex-1">
                                                    <Input
                                                        placeholder="Wallpaper URL"
                                                        value={newStaticBgUrl}
                                                        onChange={e => setNewStaticBgUrl(e.target.value)}
                                                    />
                                                    <AssetPicker
                                                        type="image"
                                                        onSelect={setNewStaticBgUrl}
                                                        trigger={
                                                            <Button variant="outline" size="icon">
                                                                <ImageIcon className="w-4 h-4" />
                                                            </Button>
                                                        }
                                                    />
                                                </div>
                                                <Button size="sm" onClick={handleStaticBackgroundUpdate}>
                                                    Set
                                                </Button>
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
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                                onClick={onAddToken}
                            >
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
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                                onClick={onAddScreenPanel}
                            >
                                <Monitor className="w-4 h-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">Add Screen Panel</TooltipContent>
                    </Tooltip>
                </div>
            </div>
        );
    }
);

MapControls.displayName = 'MapControls';
