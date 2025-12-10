import { createClient } from '@/lib/supabase';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

export function useUserSession(initialUser: SupabaseUser | null | undefined) {
    const [user, setUser] = useState<SupabaseUser | null | undefined>(initialUser);
    const [profileName, setProfileName] = useState<string | null>(null);
    const [supabase] = useState(() => createClient());

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
                    .maybeSingle();
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
                    .maybeSingle()
                    .then(({ data }) => {
                        if (data?.display_name) setProfileName(data.display_name);
                    });
            } else {
                setProfileName(null);
            }
        });

        return () => subscription.unsubscribe();
    }, [supabase]);

    return { user, profileName };
}
