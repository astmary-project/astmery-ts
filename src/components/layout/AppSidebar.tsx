"use client";

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { BookOpen, Home, Settings, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { signOut } from '@/features/auth/actions/auth';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { LogOut } from 'lucide-react';

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
            label: 'Rules',
            icon: BookOpen,
            href: '/rules', // Placeholder
            active: pathname.startsWith('/rules'),
        },
        {
            label: 'Settings',
            icon: Settings,
            href: '/settings', // Placeholder
            active: pathname.startsWith('/settings'),
        },
    ];

    return (
        <div className={cn("pb-12 w-64 border-r h-screen bg-background hidden md:block sticky top-0", className)}>
            <div className="space-y-4 py-4">
                <div className="px-3 py-2">
                    <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
                        Astmery
                    </h2>
                    <div className="space-y-1">
                        {routes.map((route) => (
                            <Button
                                key={route.href}
                                variant={route.active ? "secondary" : "ghost"}
                                className="w-full justify-start"
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
                        <Button variant="ghost" className="w-full justify-start">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="mr-2 h-4 w-4"
                            >
                                <path d="M21 15V6" />
                                <path d="M18.5 18a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
                                <path d="M12 12H3" />
                                <path d="M16 6H3" />
                                <path d="M12 18H3" />
                            </svg>
                            Playlists
                        </Button>
                        <Button variant="ghost" className="w-full justify-start">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="mr-2 h-4 w-4"
                            >
                                <circle cx="8" cy="18" r="4" />
                                <path d="M12 18V2l7 4" />
                            </svg>
                            Songs
                        </Button>
                    </div>
                </div>
            </div>

            {/* User Section */}
            <div className="absolute bottom-4 left-0 w-full px-3">
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
                            <Button variant="ghost" size="sm" className="w-full justify-start" asChild>
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
                    <Button variant="default" className="w-full" asChild>
                        <Link href="/login">Login</Link>
                    </Button>
                )}
            </div>
        </div>
    );
}
