'use server';

import { createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';

export async function signInWithGoogle() {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: `${getURL()}/auth/callback`,
        },
    });

    if (error) {
        console.error('OAuth Error:', error);
        redirect('/login?error=oauth');
    }

    if (data.url) {
        redirect(data.url);
    }
}

const getURL = () => {
    let url =
        process.env.NEXT_PUBLIC_SITE_URL || // Set this to your site URL in production env.
        process.env.VERCEL_URL || // Automatically set by Vercel.
        process.env.NEXT_PUBLIC_VERCEL_URL || // Automatically set by Vercel.
        'http://localhost:3000';
    // Make sure to include `https://` when not localhost.
    url = url.includes('http') ? url : `https://${url}`;
    // Make sure to include trailing `/`.
    url = url.charAt(url.length - 1) === '/' ? url : `${url}/`;
    // Remove trailing slash for consistency with existing code which adds /auth/callback
    return url.replace(/\/$/, '');
};

export async function signOut() {
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect('/login');
}
