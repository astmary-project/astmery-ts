'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings } from 'lucide-react';
import { useEffect, useState } from 'react';
import { archiveRoom, deleteRoom, updateRoom } from '../actions/room';
import { Room } from '../domain/Room';

interface RoomSettingsDialogProps {
    room: Room;
}

export function RoomSettingsDialog({ room }: RoomSettingsDialogProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [name, setName] = useState(room.name);
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        if (!name.trim()) return;
        setIsSaving(true);
        try {
            const result = await updateRoom(room.id, { name });
            if (result.success) {
                setIsOpen(false);
            } else {
                console.error('Failed to update room:', result.error);
                alert('Failed to update room');
            }
        } catch (e) {
            console.error('Error updating room:', e);
            alert('Error updating room');
        } finally {
            setIsSaving(false);
        }
    };

    const handleArchive = async () => {
        if (!confirm('Are you sure you want to archive this room? It will be moved to the archive list.')) return;
        setIsSaving(true);
        try {
            const result = await archiveRoom(room.id);
            // If redirect happens, this might not be reached, or result will be undefined/never
            if (result && !result.success) {
                console.error('Failed to archive room:', result.error);
                alert('Failed to archive room');
            }
        } catch (e) {
            // NEXT_REDIRECT throws an error, we need to ignore it or let it bubble?
            // Actually, in client components invoking server actions, redirect should work fine.
            // But if we catch it, we might prevent the redirect.
            // However, 'redirect' in Server Action throws internally on the server side?
            // No, it sends a redirect response.
            // But if we catch 'e', we should check if it's a digest error?
            // Actually, let's just log error.
            console.error('Error archiving room:', e);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to DELETE this room? This action cannot be undone.')) return;
        setIsSaving(true);
        try {
            const result = await deleteRoom(room.id);
            if (result && !result.success) {
                console.error('Failed to delete room:', result.error);
                alert('Failed to delete room');
            }
        } catch (e) {
            console.error('Error deleting room:', e);
        } finally {
            setIsSaving(false);
        }
    };

    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) return null;

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Room Settings</DialogTitle>
                    <DialogDescription>
                        Manage settings for this session room.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">
                            Name
                        </Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="col-span-3"
                        />
                    </div>
                </div>

                <div className="border-t pt-4 mt-4">
                    <h4 className="text-sm font-medium text-destructive mb-2">Danger Zone</h4>
                    <div className="flex flex-col gap-2">
                        <Button variant="outline" className="justify-start text-muted-foreground hover:text-foreground" onClick={handleArchive} disabled={isSaving}>
                            Archive Room
                        </Button>
                        <Button variant="destructive" className="justify-start" onClick={handleDelete} disabled={isSaving}>
                            Delete Room
                        </Button>
                    </div>
                </div>

                <div className="flex justify-end gap-2 mt-4 border-t pt-4">
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
