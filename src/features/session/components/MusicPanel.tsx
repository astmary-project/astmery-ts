import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { AssetPicker } from '@/features/assets/components/AssetPicker';
import { cn } from '@/lib/utils';
import { Music, Pause, Play, Repeat, Volume2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { SessionLogEntry } from '../domain/SessionLog';

interface MusicPanelProps {
    currentBgm?: {
        url: string;
        title: string;
        volume: number;
        isPlaying: boolean;
        isLoop: boolean;
    };
    onLog: (log: SessionLogEntry) => void;
}

export function MusicPanel({ currentBgm, onLog }: MusicPanelProps) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [volume, setVolume] = useState(currentBgm?.volume ?? 0.5);
    const [localIsPlaying, setLocalIsPlaying] = useState(false);

    // Sync with props
    useEffect(() => {
        if (currentBgm && audioRef.current) {
            audioRef.current.volume = currentBgm.volume;

            if (currentBgm.isPlaying) {
                const playPromise = audioRef.current.play();
                if (playPromise !== undefined) {
                    playPromise.catch(e => {
                        console.error("Audio play failed", e);
                        // Don't alert here, as it might be autoplay policy.
                        // Just update local state to match reality if needed.
                    });
                }
                setLocalIsPlaying(true);
            } else {
                audioRef.current.pause();
                setLocalIsPlaying(false);
            }
        }
    }, [currentBgm]); // Re-run when currentBgm changes (including isPlaying, volume, url)

    const handlePlayPause = () => {
        if (!currentBgm) return;
        const newIsPlaying = !currentBgm.isPlaying;

        onLog({
            id: crypto.randomUUID(),
            type: 'UPDATE_BGM',
            timestamp: Date.now(),
            bgm: {
                ...currentBgm,
                isPlaying: newIsPlaying
            },
            description: newIsPlaying ? `Started BGM: ${currentBgm.title}` : `Paused BGM`
        });
    };

    const handleToggleLoop = () => {
        if (!currentBgm) return;
        const newIsLoop = !currentBgm.isLoop;

        onLog({
            id: crypto.randomUUID(),
            type: 'UPDATE_BGM',
            timestamp: Date.now(),
            bgm: {
                ...currentBgm,
                isLoop: newIsLoop
            },
            description: newIsLoop ? `Enabled BGM Loop` : `Disabled BGM Loop`
        });
    };

    const handleVolumeChange = (val: number[]) => {
        const newVol = val[0];
        setVolume(newVol);
        if (audioRef.current) {
            audioRef.current.volume = newVol;
        }
        // Debounce or just update on commit? For now, update on change might be too frequent for logs.
        // Let's update local state immediately, but log only on commit (not supported by Slider directly easily without custom wrapper or onValueCommit).
        // shadcn Slider has onValueCommit.
    };

    const handleVolumeCommit = (val: number[]) => {
        if (!currentBgm) return;
        onLog({
            id: crypto.randomUUID(),
            type: 'UPDATE_BGM',
            timestamp: Date.now(),
            bgm: {
                ...currentBgm,
                volume: val[0]
            },
            description: `Changed BGM volume`
        });
    };

    const handleSelectMusic = (url: string) => {
        // We need the title. AssetPicker only returns URL.
        // Ideally AssetPicker should return the whole Asset object or we fetch it.
        // For now, let's extract filename or just use "Unknown Title" if we can't get it.
        // Wait, I can modify AssetPicker to return Asset or I can just pass a callback that takes Asset.
        // But AssetPicker props say `onSelect: (url: string) => void`.
        // I should update AssetPicker to pass the Asset object or just use the URL.
        // Let's assume URL for now and try to guess title or just say "Music".

        // Actually, I can update AssetPicker to accept `onSelectAsset` instead of `onSelect`.
        // But to avoid breaking MapPanel, I'll keep `onSelect` and add `onSelectAsset`?
        // Or just change `onSelect` signature? MapPanel uses it with `setNewBgUrl` which expects string.
        // So `onSelect` must return string.

        // I'll stick to URL for now.
        const title = url.split('/').pop() || 'Music';

        onLog({
            id: crypto.randomUUID(),
            type: 'UPDATE_BGM',
            timestamp: Date.now(),
            bgm: {
                url,
                title,
                volume: volume,
                isPlaying: true,
                isLoop: true // Default to loop
            },
            description: `Changed BGM to ${title}`
        });
    };

    return (
        <div className="flex items-center gap-2 bg-background/80 backdrop-blur rounded-full px-3 py-1.5 border shadow-sm">
            <audio
                ref={audioRef}
                src={currentBgm?.url}
                loop={currentBgm?.isLoop ?? true}
                crossOrigin="anonymous"
                onError={(e) => {
                    // Keep simple error logging for now
                    console.error("Audio playback error", e.currentTarget.error);
                }}
            />

            <AssetPicker
                type="audio"
                onSelect={handleSelectMusic}
                trigger={
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                        <Music className="w-4 h-4" />
                    </Button>
                }
            />

            {currentBgm && (
                <>
                    <div className="flex flex-col max-w-[100px] sm:max-w-[150px]">
                        <span className="text-xs font-medium truncate">{currentBgm.title}</span>
                        <span className="text-[10px] text-muted-foreground truncate">
                            {localIsPlaying ? "Playing" : "Paused"}
                        </span>
                    </div>

                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={handlePlayPause}>
                        {localIsPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </Button>

                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn("h-8 w-8 rounded-full", currentBgm.isLoop ? "text-primary" : "text-muted-foreground")}
                        onClick={handleToggleLoop}
                        title={currentBgm.isLoop ? "Loop On" : "Loop Off"}
                    >
                        <Repeat className="w-4 h-4" />
                    </Button>

                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                                <Volume2 className="w-4 h-4" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-40 p-4" side="top">
                            <div className="flex flex-col gap-2">
                                <span className="text-xs font-medium">Volume</span>
                                <Slider
                                    value={[volume]}
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    onValueChange={handleVolumeChange}
                                    onValueCommit={handleVolumeCommit}
                                />
                            </div>
                        </PopoverContent>
                    </Popover>
                </>
            )}
        </div>
    );
}
