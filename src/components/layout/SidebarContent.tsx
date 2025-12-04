"use client";

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { BookOpen, Home, Image as ImageIcon, MessageSquare, Music, Settings, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { signOut } from '@/features/auth/actions/auth';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { LogOut } from 'lucide-react';

interface SidebarContentProps extends React.HTMLAttributes<HTMLDivElement> {
    user: SupabaseUser | null | undefined;
    profileName: string | null;
    onLinkClick?: () => void;
}

export function SidebarContent({ className, user, profileName, onLinkClick }: SidebarContentProps) {
    const pathname = usePathname();

    const routes = [
        {
            label: 'Home',
            icon: Home,
            href: '/',
            active: pathname === '/',
        },
        {
            label: 'Characters',
            icon: User,
            href: '/character',
            active: pathname.startsWith('/character'),
        },
        {
            label: 'Sessions',
            icon: MessageSquare,
            href: '/room',
            active: pathname.startsWith('/room'),
        },
        {
            label: 'Rules',
            icon: BookOpen,
            href: '/rules', // Placeholder
            active: pathname.startsWith('/rules'),
        },

    ];

    return (
        <div className={cn("flex flex-col h-full bg-background", className)}>
            <div className="space-y-4 py-4 flex-1 overflow-y-auto">
                <div className="px-3 py-2">
                    <div className="space-y-1">
                        {routes.map((route) => (
                            <Button
                                key={route.href}
                                variant={route.active ? "secondary" : "ghost"}
                                className="w-full justify-start"
                                onClick={onLinkClick}
                                asChild
                            >
                                <Link href={route.href}>
                                    <route.icon className="mr-2 h-4 w-4" />
                                    {route.label}
                                </Link>
                            </Button>
                        ))}
                    </div>
                </div>
                <div className="px-3 py-2">
                    <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
                        Library
                    </h2>
                    <div className="space-y-1">
                        <Button
                            variant={pathname.startsWith('/library/songs') ? "secondary" : "ghost"}
                            className="w-full justify-start"
                            onClick={onLinkClick}
                            asChild
                        >
                            <Link href="/library/songs">
                                <Music className="mr-2 h-4 w-4" />
                                Songs
                            </Link>
                        </Button>
                        <Button
                            variant={pathname.startsWith('/library/pictures') ? "secondary" : "ghost"}
                            className="w-full justify-start"
                            onClick={onLinkClick}
                            asChild
                        >
                            <Link href="/library/pictures">
                                <ImageIcon className="mr-2 h-4 w-4" />
                                Pictures
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>

            {/* User Section */}
            <div className="mt-auto p-3 border-t">
                {user ? (
                    <div className="flex flex-col gap-2 p-2 rounded-md bg-muted/50">
                        <div className="flex flex-col overflow-hidden px-2">
                            <span className="text-sm font-medium truncate" title={profileName || user.user_metadata?.full_name || user.user_metadata?.name || user.email}>
                                {profileName || user.user_metadata?.full_name || user.user_metadata?.name || user.email}
                            </span>
                            <span className="text-xs text-muted-foreground truncate" title={user.email}>
                                {user.email}
                            </span>
                        </div>
                        <div className="flex flex-col gap-1">
                            <Button variant="ghost" size="sm" className="w-full justify-start" onClick={onLinkClick} asChild>
                                <Link href="/settings">
                                    <Settings className="mr-2 h-4 w-4" />
                                    Settings
                                </Link>
                            </Button>
                            <form action={signOut} className="w-full">
                                <Button variant="ghost" size="sm" className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10">
                                    <LogOut className="mr-2 h-4 w-4" />
                                    Log out
                                </Button>
                            </form>
                        </div>
                    </div>
                ) : (
                    <Button variant="default" className="w-full" onClick={onLinkClick} asChild>
                        <Link href="/login">Login</Link>
                    </Button>
                )}
            </div>
        </div>
    );
}
