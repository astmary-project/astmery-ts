import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import React from 'react';

interface GrowthDialogProps {
    isOpen: boolean;
    onClose: () => void;
    statKey: string;
    statLabel: string;
    currentValue: number;
    currentExp: number;
    cost: number;
    onConfirm: () => void;
}

export const GrowthDialog: React.FC<GrowthDialogProps> = ({
    isOpen,
    onClose,
    statKey,
    statLabel,
    currentValue,
    currentExp,
    cost,
    onConfirm,
}) => {
    const canAfford = currentExp >= cost;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{statLabel} の成長</DialogTitle>
                    <DialogDescription>
                        経験点を消費してステータスを強化します。
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">現在値</Label>
                        <span className="col-span-3 text-lg font-mono">{currentValue}</span>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">成長後</Label>
                        <span className="col-span-3 text-lg font-mono font-bold text-primary">
                            {currentValue} <span className="text-muted-foreground">→</span> {currentValue + 1}
                        </span>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">消費EXP</Label>
                        <span className="col-span-3">
                            {cost} <span className="text-sm text-muted-foreground">(所持: {currentExp})</span>
                        </span>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>キャンセル</Button>
                    <Button onClick={onConfirm} disabled={!canAfford}>
                        成長させる
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
