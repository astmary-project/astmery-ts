'use client';

import { Button } from '@/components/ui/button';
import { useState } from 'react';

export function RoomEntryOverlay() {
    const [isVisible, setIsVisible] = useState(true);

    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="text-center space-y-4 p-6">
                <h2 className="text-2xl font-bold">Ready to join?</h2>
                <p className="text-muted-foreground">Click below to enter the session room.</p>
                <Button
                    size="lg"
                    onClick={() => setIsVisible(false)}
                    className="min-w-[200px]"
                >
                    Enter Room
                </Button>
            </div>
        </div>
    );
}
