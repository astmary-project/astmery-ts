import { useMemo, useState } from 'react';
import { CharacterData } from '../domain/repository/ICharacterRepository';

export const useCharacterFilter = (characters: CharacterData[]) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTag, setSelectedTag] = useState<string>('all');
    const [selectedOwner, setSelectedOwner] = useState<string>('all');

    // Extract unique tags and owners
    const { allTags, allOwners } = useMemo(() => {
        const tags = new Set<string>();
        const owners = new Set<string>();

        characters.forEach(c => {
            // Extract tags from profile
            const charTags = c.profile?.tags || [];
            charTags.forEach(tag => tags.add(tag));

            if (c.ownerName) {
                owners.add(c.ownerName);
            }
        });

        return {
            allTags: Array.from(tags).sort(),
            allOwners: Array.from(owners).sort()
        };
    }, [characters]);

    // Filter logic
    const filteredCharacters = useMemo(() => {
        return characters.filter(char => {
            const matchesSearch = char.name.toLowerCase().includes(searchTerm.toLowerCase());

            const charTags = char.profile?.tags || [];
            const matchesTag = selectedTag === 'all' || charTags.includes(selectedTag);

            const matchesOwner = selectedOwner === 'all' || char.ownerName === selectedOwner;

            return matchesSearch && matchesTag && matchesOwner;
        });
    }, [characters, searchTerm, selectedTag, selectedOwner]);

    return {
        searchTerm,
        setSearchTerm,
        selectedTag,
        setSelectedTag,
        selectedOwner,
        setSelectedOwner,
        allTags,
        allOwners,
        filteredCharacters
    };
};
