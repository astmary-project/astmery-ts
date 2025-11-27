export const STAT_LABELS: Record<string, string> = {
    'Grade': 'グレード',
    'Science': '科学技術力',
    'SpellKnowledge': '魔術熟知',
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
    'SpellCheck': '魔術行使判定',
};

export const STANDARD_STAT_ORDER = [
    'Grade',
    'ActionSpeed',
    'Science',
    'SpellKnowledge',
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
    'SpellKnowledge',
];

export const JAPANESE_TO_ENGLISH_STATS: Record<string, string> = Object.entries(STAT_LABELS).reduce((acc, [key, value]) => {
    acc[value] = key;
    return acc;
}, {} as Record<string, string>);

export const STANDARD_CHECK_FORMULAS: Record<string, string> = {
    '命中判定': '2d6 + {Combat} + {HitCheck}', // 戦闘 + 命中判定(補正)
    '魔術行使判定': '2d6 + {SpellKnowledge} + {SpellCheck}', // 魔術熟知 + 魔術行使判定(補正)
    '回避判定': '2d6 + {Combat} + {AvoidanceCheck}', // 行動速度 + 避けられる判定(補正)
    '精神抵抗判定': '2d6 + {Spirit} + {SpiritResistanceCheck}', // 精神 + 精神抵抗判定(補正)
    '魔術抵抗判定': '2d6 + {Spirit} + {SpellResistanceCheck}', // 精神 + 魔術抵抗判定(補正)
    '生体知識判定': '2d6 + {SpellKnowledge} + {CreatureKnowledgeCheck}', // 魔術熟知 + 生体知識判定(補正)
    '科学知識判定': '2d6 + {Science} + {ScienceKnowledgeCheck}', // 科学 + 科学知識判定(補正)
    '先制判定': '2d6 + {Combat} + {InitiativeCheck}', // 戦闘 + 先制判定(補正)
    '魔法行使判定': '2d6 + {Grade} + {Spirit} + {MagicCheck}', // グレード + 精神 + 魔法行使判定(補正)

};
