import { SupabaseCharacterRepository } from '@/features/character/infrastructure/SupabaseCharacterRepository';
import { supabase } from '@/lib/supabase';
import { useMemo } from 'react';

export const useCharacterRepository = () => {
    // ここで一元管理！
    // 将来リポジトリの実装を差し替えたくなっても、ここだけ変えれば全画面に適用される
    return useMemo(() => new SupabaseCharacterRepository(supabase), []);
};