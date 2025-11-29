import { createClient } from '@/lib/supabase-server';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export async function signInWithGoogle() {
    const supabase = await createClient();
    const redirectTo = await getRedirectUrl();
    console.log('[Auth] RedirectTo:', redirectTo); // Debug log

    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: `${redirectTo}/auth/callback`,
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

async function getRedirectUrl() {
    const headersList = await headers();
    const host = headersList.get('x-forwarded-host') || headersList.get('host');
    const protocol = headersList.get('x-forwarded-proto') || 'https';

    if (host && !host.includes('localhost')) {
        return `${protocol}://${host}`;
    }

    // Fallback to Env Vars
    let url =
        process.env.NEXT_PUBLIC_SITE_URL ||
        process.env.VERCEL_URL ||
        process.env.NEXT_PUBLIC_VERCEL_URL ||
        'http://localhost:3000';

    url = url.includes('http') ? url : `https://${url}`;
    url = url.charAt(url.length - 1) === '/' ? url : `${url}/`;
    return url.replace(/\/$/, '');
}

export async function signOut() {
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect('/login');
}
