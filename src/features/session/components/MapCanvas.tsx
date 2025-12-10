
import { Map as MapIcon } from 'lucide-react';
import React from 'react';

interface MapCanvasProps {
    backgroundImageUrl?: string;
    backgroundWidth?: number;
    backgroundHeight?: number;
    gridSize: number;
    worldSize: number;
    worldOffset: number;
}

export const MapCanvas = React.memo(({
    backgroundImageUrl,
    backgroundWidth = 2000,
    backgroundHeight = 2000,
    gridSize,
    worldSize,
    worldOffset,
}: MapCanvasProps) => {
    return (
        <>
            {/* Infinite Grid Layer */}
            <div
                className="absolute pointer-events-none opacity-20"
                style={{
                    left: -worldOffset,
                    top: -worldOffset,
                    width: worldSize,
                    height: worldSize,
                    backgroundImage: `linear-gradient(to right, #000 1px, transparent 1px), linear-gradient(to bottom, #000 1px, transparent 1px)`,
                    backgroundSize: `${gridSize}px ${gridSize}px`,
                    backgroundPosition: `${worldOffset}px ${worldOffset}px`,
                }}
            />

            {/* Foreground Map Layer (at 0,0) */}
            {backgroundImageUrl ? (
                <div
                    className="absolute top-0 left-0 bg-cover bg-center shadow-2xl"
                    style={{
                        backgroundImage: `url(${backgroundImageUrl})`,
                        width: `${backgroundWidth}px`,
                        height: `${backgroundHeight}px`,
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
        </>
    );
});

MapCanvas.displayName = 'MapCanvas';
