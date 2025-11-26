export const STAT_LABELS: Record<string, string> = {
    'Grade': 'グレード',
    'Science': '科学技術力',
    'MagicKnowledge': '魔術熟知',
    'Combat': '戦闘能力',
    'Magic': '魔力',
    'Spirit': '精神',
    'Body': '肉体',
    'HP': '最大HP',
    'MP': '最大MP',
    'Defense': '防護',
    'MagicDefense': '魔術防御',
    'ActionSpeed': '行動速度',
    'InsightCheck': '看破判定',
    'RecoveryAmount': '回復量',
    'KnowledgeCheck': '知識判定',
    'GatheringCount': '採集回数',
    'SpellCheck': '魔術行使',
};

export const STANDARD_STAT_ORDER = [
    'Grade',
    'ActionSpeed',
    'Science',
    'MagicKnowledge',
    'Combat',
    'Magic',
    'Spirit',
    'Body',
    'HP',
    'MP',
    'Defense',
    'MagicDefense'
];

export const ABILITY_STATS = [
    'Body',
    'Spirit',
    'Combat',
    'Science',
    'Magic',
    'MagicKnowledge',
];

export const JAPANESE_TO_ENGLISH_STATS: Record<string, string> = Object.entries(STAT_LABELS).reduce((acc, [key, value]) => {
    acc[value] = key;
    return acc;
}, {} as Record<string, string>);
