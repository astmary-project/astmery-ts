import { createClient } from '@/lib/supabase-server';
import { CharacterDetailPageClient } from './CharacterDetailPageClient';

export default async function CharacterDetailPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    return <CharacterDetailPageClient currentUserId={user?.id} />;
}
