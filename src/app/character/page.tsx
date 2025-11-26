'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ICharacterRepository } from '@/features/character/domain/repository/ICharacterRepository';
import { SupabaseCharacterRepository } from '@/features/character/infrastructure/SupabaseCharacterRepository';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

// Repository instance
const repository: ICharacterRepository = new SupabaseCharacterRepository();

export default function CharacterListPage() {
    const router = useRouter();
    const [characters, setCharacters] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchCharacters = async () => {
            try {
                const data = await repository.listAll();
                setCharacters(data);
            } catch (error) {
                console.error('Failed to fetch characters', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchCharacters();
    }, []);

    const handleCreateNew = async () => {
        // Create a new empty character and redirect to setup
        const newId = crypto.randomUUID();
        const newCharacter = {
            id: newId,
            name: 'New Character',
            logs: [],
            profile: {},
        };

        try {
            await repository.save(newCharacter);
            router.push(`/character/${newId}/setup`);
        } catch (error) {
            console.error('Failed to create character', error);
            alert('Failed to create character. Please try again.');
        }
    };

    if (isLoading) {
        return <div className="p-8 text-center">Loading...</div>;
    }

    return (
        <div className="container mx-auto py-8 px-4">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">Characters</h1>
                <Button onClick={handleCreateNew}>
                    <Plus className="mr-2 h-4 w-4" /> Create New
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {characters.map((char) => (
                    <Link key={char.id} href={`/character/${char.id}`} className="block group">
                        <Card className="h-full transition-colors group-hover:border-primary">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-3">
                                    {/* Avatar Placeholder */}
                                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-bold">
                                        {char.name.slice(0, 2)}
                                    </div>
                                    <span className="truncate">{char.name}</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground line-clamp-3">
                                    {char.profile?.bio || 'No biography.'}
                                </p>
                                <div className="mt-4 flex flex-wrap gap-1">
                                    {char.profile?.specialtyElements?.map((el: string) => (
                                        <span key={el} className="text-xs bg-secondary px-2 py-1 rounded-md">
                                            {el}
                                        </span>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                ))}

                {characters.length === 0 && (
                    <div className="col-span-full text-center py-12 text-muted-foreground">
                        No characters found. Create one to get started!
                    </div>
                )}
            </div>
        </div>
    );
}
