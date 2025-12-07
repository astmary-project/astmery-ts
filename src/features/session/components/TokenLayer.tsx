
import { cn } from '@/lib/utils';
import React from 'react';
import { MapToken } from '../domain/SessionLog';
import { TokenContextMenu } from './TokenContextMenu';

interface TokenLayerProps {
    tokens: MapToken[];
    selectedTokenId?: string | null;
    previewPosition: { x: number; y: number } | null;
    gridSize: number;
    isDraggingToken: boolean;
    onTokenMouseDown: (e: React.MouseEvent, token: MapToken) => void;
    onEditToken: (token: MapToken) => void;
    onDeleteToken: (token: MapToken) => void;
}

export const TokenLayer = React.memo(
    ({
        tokens,
        selectedTokenId,
        previewPosition,
        gridSize,
        isDraggingToken,
        onTokenMouseDown,
        onEditToken,
        onDeleteToken,
    }: TokenLayerProps) => {
        return (
            <>
                {/* Tokens Layer */}
                {tokens.map(token => {
                    const isSelected = selectedTokenId === token.id;
                    const x = (isSelected && previewPosition) ? previewPosition.x / gridSize : token.x;
                    const y = (isSelected && previewPosition) ? previewPosition.y / gridSize : token.y;

                    return (
                        <TokenContextMenu
                            key={token.id}
                            token={token}
                            onEditToken={onEditToken}
                            onDeleteToken={onDeleteToken}
                        >
                            <div
                                className={cn(
                                    "absolute flex items-center justify-center rounded-full shadow-md cursor-grab active:cursor-grabbing transition-transform hover:scale-110 border-2 overflow-hidden",
                                    token.participantId ? "border-blue-500 bg-blue-100" : "border-primary bg-primary/20",
                                    isDraggingToken && isSelected && "cursor-grabbing" // only show grabbing on the selected token
                                )}
                                style={{
                                    left: `${x * gridSize}px`,
                                    top: `${y * gridSize}px`,
                                    width: `${(token.size || 1) * gridSize}px`,
                                    height: `${(token.size || 1) * gridSize}px`,
                                    transform: 'translate(-50%, -50%)', // Center anchor
                                    zIndex: 10, // Ensure tokens are above map
                                }}
                                onMouseDown={e => onTokenMouseDown(e, token)}
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
                        </TokenContextMenu>
                    );
                })}
            </>
        );
    }
);

TokenLayer.displayName = 'TokenLayer';
