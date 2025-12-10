"use client";

import { SidebarContent } from '@/components/layout/SidebarContent';
import { useUserSession } from '@/hooks/useUserSession';
import { cn } from '@/lib/utils';
import { User as SupabaseUser } from '@supabase/supabase-js';

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
    user?: SupabaseUser | null;
}

export function AppSidebar({ className, user: initialUser }: SidebarProps) {
    const { user, profileName } = useUserSession(initialUser);

    return (
        <div className={cn("w-64 border-r bg-background hidden md:block sticky top-14 h-[calc(100vh-3.5rem)]", className)}>
            <SidebarContent user={user} profileName={profileName} />
        </div>
    );
}
