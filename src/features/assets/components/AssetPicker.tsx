import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useState } from 'react';
import { Asset, AssetType } from '../domain/Asset';
import { AssetManager } from './AssetManager';

interface AssetPickerProps {
    trigger?: React.ReactNode;
    onSelect: (url: string) => void;
    type?: AssetType;
    title?: string;
}

export function AssetPicker({ trigger, onSelect, type = 'image', title = 'Select Asset' }: AssetPickerProps) {
    const [open, setOpen] = useState(false);

    const handleSelect = (asset: Asset) => {
        onSelect(asset.url);
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || <Button variant="outline">Select Asset</Button>}
            </DialogTrigger>
            <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                </DialogHeader>
                <AssetManager
                    initialTab={type}
                    onSelect={handleSelect}
                    className="flex-1 min-h-0"
                />
            </DialogContent>
        </Dialog>
    );
}
