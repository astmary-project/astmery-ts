"use client";

import { SidebarContent } from '@/components/layout/SidebarContent';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useUserSession } from '@/hooks/useUserSession';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { Menu } from 'lucide-react';
import { useState } from 'react';

interface AppHeaderProps {
    user: SupabaseUser | null;
}

export function AppHeader({ user: initialUser }: AppHeaderProps) {
    const { user, profileName } = useUserSession(initialUser);
    const [isOpen, setIsOpen] = useState(false);

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 h-14">
            <div className="flex h-full items-center px-4">
                <div className="md:hidden mr-4">
                    <Sheet open={isOpen} onOpenChange={setIsOpen}>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon" className="-ml-2">
                                <Menu className="h-5 w-5" />
                                <span className="sr-only">Toggle Menu</span>
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="p-0 w-72">
                            <SidebarContent
                                user={user}
                                profileName={profileName}
                                onLinkClick={() => setIsOpen(false)}
                            />
                        </SheetContent>
                    </Sheet>
                </div>
                <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold tracking-tight">
                        Astmery
                    </h2>
                </div>
            </div>
        </header>
    );
}
