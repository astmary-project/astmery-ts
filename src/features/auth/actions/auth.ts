import { createClient } from '@/lib/supabase-server';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export async function signInWithGoogle(redirectBaseUrl?: string) {
    const supabase = await createClient();

    // Use provided URL or fallback to dynamic detection
    const baseUrl = redirectBaseUrl || await getRedirectUrl();
    console.log('[Auth] RedirectTo:', baseUrl);

    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: `${baseUrl}/auth/callback`,
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
    // Fallback logic if no client URL provided
    const headersList = await headers();
    const host = headersList.get('x-forwarded-host') || headersList.get('host');
    const protocol = headersList.get('x-forwarded-proto') || 'https';

    if (host && !host.includes('localhost')) {
        return `${protocol}://${host}`;
    }

    return 'http://localhost:3000';
}

export async function signOut() {
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect('/login');
}
