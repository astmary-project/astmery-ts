"use client";

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { BookOpen, Home, Settings, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> { }

export function AppSidebar({ className }: SidebarProps) {
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
        <div className={cn("pb-12 w-64 border-r min-h-screen bg-background hidden md:block", className)}>
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
        </div>
    );
}
