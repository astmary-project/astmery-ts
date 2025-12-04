import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { Loader2, Music, Trash2, Upload } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Asset, AssetType } from '../domain/Asset';
import { R2AssetRepository } from '../infrastructure/R2AssetRepository';

interface AssetManagerProps {
    onSelect?: (asset: Asset) => void;
    className?: string;
    initialTab?: AssetType;
}

export function AssetManager({ onSelect, className, initialTab = 'image' }: AssetManagerProps) {
    const [activeTab, setActiveTab] = useState<AssetType>(initialTab);
    const [assets, setAssets] = useState<Asset[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [repository] = useState(() => new R2AssetRepository());

    const loadAssets = useCallback(async (type: AssetType) => {
        setIsLoading(true);
        const result = await repository.list(type);
        if (result.isSuccess) {
            setAssets(result.value);
        } else {
            console.error('Failed to load assets:', result.error);
        }
        setIsLoading(false);
    }, [repository]);

    useEffect(() => {
        const timer = setTimeout(() => {
            void loadAssets(activeTab);
        }, 0);
        return () => clearTimeout(timer);
    }, [activeTab, loadAssets]);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // File size validation
        const MAX_IMAGE_SIZE = 20 * 1024 * 1024; // 20MB
        const MAX_AUDIO_SIZE = 50 * 1024 * 1024; // 50MB

        if (activeTab === 'image' && file.size > MAX_IMAGE_SIZE) {
            alert(`Image too large. Max size is 20MB.\nYour file: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
            e.target.value = '';
            return;
        }

        if (activeTab === 'audio' && file.size > MAX_AUDIO_SIZE) {
            alert(`Audio too large. Max size is 50MB.\nYour file: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
            e.target.value = '';
            return;
        }

        setIsUploading(true);
        const result = await repository.upload(file, activeTab);
        if (result.isSuccess) {
            await loadAssets(activeTab);
        } else {
            console.error('Failed to upload asset:', result.error);
            alert('Upload failed: ' + result.error.message);
        }
        setIsUploading(false);
        // Reset input
        e.target.value = '';
    };

    const handleDelete = async (e: React.MouseEvent, asset: Asset) => {
        e.stopPropagation();
        if (!confirm('Are you sure you want to delete this asset?')) return;

        const result = await repository.delete(asset.id);
        if (result.isSuccess) {
            setAssets(assets.filter(a => a.id !== asset.id));
        } else {
            console.error('Failed to delete asset:', result.error);
            alert('Delete failed: ' + result.error.message);
        }
    };

    return (
        <div className={cn("flex flex-col h-full", className)}>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as AssetType)} className="flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between mb-4">
                    <TabsList>
                        <TabsTrigger value="image">Images</TabsTrigger>
                        <TabsTrigger value="audio">Audio</TabsTrigger>
                    </TabsList>
                    <div className="flex items-center gap-2">
                        <Input
                            type="file"
                            accept={activeTab === 'image' ? "image/*" : "audio/*"}
                            className="hidden"
                            id="asset-upload"
                            onChange={handleUpload}
                            disabled={isUploading}
                        />
                        <Label
                            htmlFor="asset-upload"
                            className={cn(
                                "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                                "bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2 cursor-pointer",
                                isUploading && "opacity-50 cursor-not-allowed"
                            )}
                        >
                            {isUploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                            Upload
                        </Label>
                    </div>
                </div>

                <div className="flex-1 min-h-0 relative border rounded-md bg-muted/10">
                    {isLoading ? (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <ScrollArea className="h-full p-4">
                            {assets.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                                    <p>No assets found.</p>
                                    <p className="text-sm">Upload some files to get started.</p>
                                    <p className="text-xs mt-2 opacity-70">
                                        Max size: {activeTab === 'image' ? '20MB' : '50MB'}
                                    </p>
                                </div>
                            ) : (
                                <div className={cn(
                                    "grid gap-4",
                                    activeTab === 'image' ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4" : "grid-cols-1"
                                )}>
                                    {assets.map(asset => (
                                        <Card
                                            key={asset.id}
                                            className={cn(
                                                "group relative overflow-hidden cursor-pointer transition-all hover:ring-2 hover:ring-primary",
                                                activeTab === 'audio' && "flex items-center p-2"
                                            )}
                                            onClick={() => onSelect?.(asset)}
                                        >
                                            {activeTab === 'image' ? (
                                                <div className="aspect-square relative bg-muted">
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img
                                                        src={asset.url}
                                                        alt={asset.name}
                                                        className="object-cover w-full h-full"
                                                    />
                                                    <div className="absolute inset-x-0 bottom-0 bg-black/60 p-2 text-xs text-white truncate opacity-0 group-hover:opacity-100 transition-opacity">
                                                        {asset.name}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-3 w-full">
                                                    <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center text-primary">
                                                        <Music className="w-5 h-5" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium truncate">{asset.name}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {(asset.size / 1024 / 1024).toFixed(2)} MB
                                                        </p>
                                                    </div>
                                                </div>
                                            )}

                                            <Button
                                                variant="destructive"
                                                size="icon"
                                                className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={(e) => handleDelete(e, asset)}
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </Button>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    )}
                </div>
            </Tabs>
        </div>
    );
}
