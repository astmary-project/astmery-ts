
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu';
import { ImageIcon, Trash2 } from 'lucide-react';
import React from 'react';
import { MapToken } from '../domain/SessionLog';

interface TokenContextMenuProps {
    token: MapToken;
    onEditToken: (token: MapToken) => void;
    onDeleteToken: (token: MapToken) => void;
    children: React.ReactNode;
}

export const TokenContextMenu = ({ token, onEditToken, onDeleteToken, children }: TokenContextMenuProps) => {
    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
            <ContextMenuContent>
                <ContextMenuItem onClick={() => onEditToken(token)}>
                    <ImageIcon className="w-4 h-4 mr-2" />
                    Token Details...
                </ContextMenuItem>
                <ContextMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => onDeleteToken(token)}
                >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Token
                </ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    );
};
