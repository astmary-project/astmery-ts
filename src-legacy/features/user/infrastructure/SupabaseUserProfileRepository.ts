import { supabase } from '@/lib/supabase';
import { UserProfile } from '../domain/UserProfile';
import { IUserProfileRepository } from '../domain/repository/IUserProfileRepository';

export class SupabaseUserProfileRepository implements IUserProfileRepository {
    async getProfile(userId: string): Promise<UserProfile | null> {
        const { data, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null; // Not found
            console.error('Failed to fetch profile', error);
            return null;
        }

        return {
            userId: data.user_id,
            displayName: data.display_name,
            role: data.role as 'user' | 'admin',
            updatedAt: data.updated_at,
        };
    }

    async saveProfile(profile: UserProfile): Promise<void> {
        const { error } = await supabase
            .from('user_profiles')
            .upsert({
                user_id: profile.userId,
                display_name: profile.displayName,
                role: profile.role, // Save role (though usually not updated here)
                updated_at: new Date().toISOString(),
            });

        if (error) {
            console.error('Failed to save profile', error);
            throw error;
        }
    }
}
