"use client";

import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { Menu } from 'lucide-react';
import { usePathname } from 'next/navigation';

import { User as SupabaseUser } from '@supabase/supabase-js';

import { SidebarContent } from '@/components/layout/SidebarContent';
import { createClient } from '@/lib/supabase';
import { useEffect, useState } from 'react';

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
    user?: SupabaseUser | null;
}

export function AppSidebar({ className, user: initialUser }: SidebarProps) {
    const pathname = usePathname();
    const [user, setUser] = useState<SupabaseUser | null | undefined>(initialUser);
    const [profileName, setProfileName] = useState<string | null>(null);
    const supabase = createClient();
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        // Update user state on mount and auth changes
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
            if (user) {
                const { data } = await supabase
                    .from('user_profiles')
                    .select('display_name')
                    .eq('user_id', user.id)
                    .single();
                if (data?.display_name) {
                    setProfileName(data.display_name);
                }
            }
        };
        getUser();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            if (session?.user) {
                // Re-fetch profile on auth change
                supabase
                    .from('user_profiles')
                    .select('display_name')
                    .eq('user_id', session.user.id)
                    .single()
                    .then(({ data }) => {
                        if (data?.display_name) setProfileName(data.display_name);
                    });
            } else {
                setProfileName(null);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    return (
        <>
            {/* Desktop Sidebar */}
            <div className={cn("pb-12 w-64 border-r h-screen bg-background hidden md:block sticky top-0", className)}>
                <SidebarContent user={user} profileName={profileName} />
            </div>

            {/* Mobile Sidebar Trigger */}
            <div className="md:hidden fixed top-4 left-4 z-40">
                <Sheet open={isOpen} onOpenChange={setIsOpen}>
                    <SheetTrigger asChild>
                        <Button variant="outline" size="icon" className="md:hidden">
                            <Menu className="h-4 w-4" />
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
        </>
    );
}
