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
            // Extract tags from logs
            c.logs.forEach((log) => {
                if (log.type === 'ADD_TAG') tags.add(log.tagId!);
                if (log.type === 'REMOVE_TAG') tags.delete(log.tagId!);
            });

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

            const charTags = new Set<string>();
            char.logs.forEach((log) => {
                if (log.type === 'ADD_TAG') charTags.add(log.tagId!);
                if (log.type === 'REMOVE_TAG') charTags.delete(log.tagId!);
            });
            const matchesTag = selectedTag === 'all' || charTags.has(selectedTag);

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
