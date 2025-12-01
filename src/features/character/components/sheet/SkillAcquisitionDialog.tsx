import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import React, { useState } from 'react';
import { CharacterCalculator } from '../../domain/CharacterCalculator';
import { Skill } from '../../domain/CharacterLog';

interface SkillAcquisitionDialogProps {
    isOpen: boolean;
    onClose: () => void;
    skill: Skill;
    onConfirm: (cost: number, isSuccess: boolean, type: 'Free' | 'Standard' | 'Grade') => void;
    currentStandardSkills: number;
    currentExp: number;
}

export const SkillAcquisitionDialog: React.FC<SkillAcquisitionDialogProps> = ({
    isOpen,
    onClose,
    skill,
    onConfirm,
    currentStandardSkills,
    currentExp
}) => {
    const [type, setType] = useState<'Free' | 'Standard' | 'Grade'>((skill.acquisitionType as 'Free' | 'Standard' | 'Grade') || 'Standard');
    const [isRetry, setIsRetry] = useState(false);

    const costs = CharacterCalculator.calculateSkillCost(currentStandardSkills, type, isRetry);

    const handleConfirm = (isSuccess: boolean) => {
        const cost = isSuccess ? costs.success : costs.failure;
        onConfirm(cost, isSuccess, type);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>スキル習得: {skill.name}</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>習得タイプ</Label>
                        <RadioGroup
                            value={type}
                            onValueChange={(val) => setType(val as 'Free' | 'Standard' | 'Grade')}
                            className="flex gap-4"
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="Standard" id="standard" />
                                <Label htmlFor="standard">自由習得 (Standard)</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="Free" id="free" />
                                <Label htmlFor="free">無料習得 (Free)</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="Grade" id="grade" />
                                <Label htmlFor="grade">グレード習得 (Grade)</Label>
                            </div>
                        </RadioGroup>
                    </div>

                    {type === 'Grade' && (
                        <div className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                id="retry"
                                checked={isRetry}
                                onChange={(e) => setIsRetry(e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300"
                            />
                            <Label htmlFor="retry">再挑戦 (2回目以降の失敗)</Label>
                        </div>
                    )}

                    <div className="bg-muted p-3 rounded-md text-sm">
                        <div className="flex justify-between mb-1">
                            <span>成功時コスト:</span>
                            <span className={currentExp < costs.success ? "font-bold text-destructive" : "font-bold"}>
                                {costs.success} EXP
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span>失敗時コスト:</span>
                            <span className={currentExp < costs.failure ? "font-bold text-destructive" : "font-bold"}>
                                {costs.failure} EXP
                            </span>
                        </div>
                        <div className="flex justify-between mt-2 pt-2 border-t">
                            <span>所持経験点:</span>
                            <span className="font-mono">{currentExp} EXP</span>
                        </div>
                    </div>
                </div>

                <DialogFooter className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={onClose}>キャンセル</Button>
                    <Button
                        variant="destructive"
                        onClick={() => handleConfirm(false)}
                        disabled={currentExp < costs.failure}
                    >
                        失敗 (コスト: {costs.failure})
                    </Button>
                    <Button
                        onClick={() => handleConfirm(true)}
                        disabled={currentExp < costs.success}
                    >
                        習得 (コスト: {costs.success})
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
