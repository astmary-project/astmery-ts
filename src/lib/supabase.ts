import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const createClient = () => createBrowserClient(supabaseUrl, supabaseAnonKey);

// Deprecated: Direct export for legacy support (if any), but better to use createClient() hook/function
export const supabase = createClient();
