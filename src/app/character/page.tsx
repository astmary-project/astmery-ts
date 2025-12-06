'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCharacterFilter } from '@/features/character/hooks/useCharacterFilter';
import { useCharacterRepository } from '@/features/character/hooks/useCharacterReposittories';
import { supabase } from '@/lib/supabase';
import { Plus, Search, User } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

// Repository instance


export default function CharacterListPage() {
    const router = useRouter();
    const [characters, setCharacters] = useState<import('@/features/character/domain/repository/ICharacterRepository').CharacterData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const repository = useCharacterRepository();

    useEffect(() => {
        const fetchCharacters = async () => {
            try {
                const result = await repository.listAll();
                if (result.isSuccess) {
                    setCharacters(result.value);
                } else {
                    console.error('Failed to fetch characters', result.error);
                }
            } catch (error) {
                console.error('Unexpected error fetching characters', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchCharacters();
    }, []);

    const handleCreateNew = async () => {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();

        // Create a new empty character and redirect to setup
        const newId = crypto.randomUUID();
        const newCharacter = {
            id: newId,
            name: '新規キャラクター',
            logs: [],
            profile: {},
            userId: user?.id // Set userId if logged in
        };

        try {
            const result = await repository.save(newCharacter);
            if (result.isSuccess) {
                router.push(`/character/${newId}/setup`);
            } else {
                console.error('Failed to create character', result.error);
                alert('キャラクターの作成に失敗しました。');
            }
        } catch (error) {
            console.error('Unexpected error creating character', error);
            alert('キャラクターの作成中に予期せぬエラーが発生しました。');
        }
    };

    // Filter Logic (Hook)
    const {
        searchTerm,
        setSearchTerm,
        selectedTag,
        setSelectedTag,
        selectedOwner,
        setSelectedOwner,
        allTags,
        allOwners,
        filteredCharacters
    } = useCharacterFilter(characters);

    if (isLoading) {
        return <div className="p-8 text-center">読み込み中...</div>;
    }

    return (
        <div className="container mx-auto py-8 px-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <h1 className="text-3xl font-bold">キャラクター一覧</h1>
                <Button onClick={handleCreateNew}>
                    <Plus className="mr-2 h-4 w-4" /> 新規作成
                </Button>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="名前で検索..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8"
                    />
                </div>

                <Select value={selectedTag} onValueChange={setSelectedTag}>
                    <SelectTrigger>
                        <SelectValue placeholder="タグで絞り込み" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">全てのタグ</SelectItem>
                        {allTags.map(tag => (
                            <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select value={selectedOwner} onValueChange={setSelectedOwner}>
                    <SelectTrigger>
                        <SelectValue placeholder="所有者で絞り込み" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">全ての所有者</SelectItem>
                        {allOwners.map(owner => (
                            <SelectItem key={owner as string} value={owner as string}>{owner}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCharacters.map((char) => {
                    // Calculate tags for display
                    const displayTags = char.profile?.tags || [];

                    return (
                        <Link key={char.id} href={`/character/${char.id}`} className="block group">
                            <Card className="h-full transition-colors group-hover:border-primary flex flex-col">
                                <CardHeader className="pb-3">
                                    <div className="flex justify-between items-start gap-2">
                                        <CardTitle className="flex items-center gap-3 text-lg">
                                            {/* Avatar Placeholder */}
                                            <Avatar>
                                                <AvatarImage src={char.profile?.avatarUrl} alt={char.name} />
                                                <AvatarFallback>{char.name.slice(0, 2)}</AvatarFallback>
                                            </Avatar>
                                            <span className="truncate">{char.name}</span>
                                        </CardTitle>
                                    </div>
                                    {char.ownerName && (
                                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1 ml-14">
                                            <User className="w-3 h-3" />
                                            <span>{char.ownerName}</span>
                                        </div>
                                    )}
                                </CardHeader>
                                <CardContent className="flex-1 flex flex-col">
                                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">
                                        {char.profile?.bio || 'プロフィール未設定'}
                                    </p>

                                    <div className="space-y-2">
                                        {/* Specialty Elements */}
                                        {char.profile?.specialtyElements && char.profile.specialtyElements.length > 0 && (
                                            <div className="flex flex-wrap gap-1">
                                                {char.profile.specialtyElements.map((el: string) => (
                                                    <Badge key={el} variant="secondary" className="text-[10px] px-1 py-0 h-5">
                                                        {el}
                                                    </Badge>
                                                ))}
                                            </div>
                                        )}

                                        {/* Tags */}
                                        {displayTags.length > 0 && (
                                            <div className="flex flex-wrap gap-1 pt-2 border-t">
                                                {displayTags.map((tag) => (
                                                    <Badge key={tag} variant="outline" className="text-[10px] px-1 py-0 h-5">
                                                        {tag}
                                                    </Badge>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    );
                })}

                {filteredCharacters.length === 0 && (
                    <div className="col-span-full text-center py-12 text-muted-foreground">
                        条件に一致するキャラクターが見つかりません。
                    </div>
                )}
            </div>
        </div>
    );
}
