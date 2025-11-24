'use client';

import { CharacterSheet } from '@/features/character/components/CharacterSheet';
import { CharacterCalculator } from '@/features/character/domain/CharacterCalculator';
import { CharacterLogEntry } from '@/features/character/domain/CharacterLog';
import React, { useMemo } from 'react';

export default function DemoPage() {
    // Sample Data based on Mel
    const initialLogs: CharacterLogEntry[] = [
        // Base Stats
        { id: '1', type: 'GROWTH', timestamp: 1, statKey: 'Grade', value: 5 },
        { id: '2', type: 'GROWTH', timestamp: 1, statKey: 'Science', value: 6 }, // 5+1
        { id: '3', type: 'GROWTH', timestamp: 1, statKey: 'MagicKnowledge', value: 6 }, // 5+1
        { id: '4', type: 'GROWTH', timestamp: 1, statKey: 'Combat', value: 3 },
        { id: '5', type: 'GROWTH', timestamp: 1, statKey: 'Magic', value: 5 },
        { id: '6', type: 'GROWTH', timestamp: 1, statKey: 'Spirit', value: 4 },
        { id: '7', type: 'GROWTH', timestamp: 1, statKey: 'Body', value: 3 },

        // Element Bonus
        { id: '8', type: 'GROWTH', timestamp: 1, statKey: 'Insight', value: 3, description: 'Element Bonus (Light)' },

        // Custom Label Registration
        { id: '9', type: 'REGISTER_STAT_LABEL', timestamp: 1, statKey: 'Cooking', stringValue: '料理', description: 'Register custom label' },
        { id: '9a', type: 'GROWTH', timestamp: 1, statKey: 'Cooking', value: 5, description: 'Learned Cooking' },

        // Skills - Active
        {
            id: '10',
            type: 'LEARN_SKILL',
            timestamp: 2,
            skill: {
                id: 'cooling',
                name: '炉心冷却',
                type: 'Active',
                description: 'タイミング：主行動\nCT：3\n対象：自身 射程：- 形状：-\n制限：リアクターゲージが1以上\n効果：自身のMPを精神点回復させ、リアクターゲージを1減少し、次の主行動まで被ダメージを-2点する(0未満にはならない)。'
            }
        },
        {
            id: '11',
            type: 'LEARN_SKILL',
            timestamp: 2,
            skill: {
                id: 'breath',
                name: 'エレメントブレス',
                type: 'Active',
                description: 'タイミング：主行動\nCT：15-リアクターゲージ\n対象：範囲(扇、半径6メートル、角度120度) 射程：至近 形状：ブレス\n消費MP：自身のグレード+2点\n能動判定：魔術行使 受動判定：肉体\n効果：行動予定宣言時に得意属性を1つ選択し、対象にd6+魔力+グレード点のその属性の魔術ダメージを与え、自身のリアクターゲージを2増やす(5を超えない)。\nさらに、リアクターゲージが1以下の時は対象を選択できるようになる。\nまた、リアクターゲージが4以上の時はダメージダイスを2倍にして算出する。'
            }
        },

        // Skills - Passive
        {
            id: '12',
            type: 'LEARN_SKILL',
            timestamp: 2,
            skill: {
                id: 'dragon_species',
                name: '龍種 (特徴)',
                type: 'Passive',
                description: '純粋な龍種としての特徴を表すスキル。\n龍、神性に対する特攻効果を受ける。'
            }
        },
        {
            id: '13',
            type: 'LEARN_SKILL',
            timestamp: 2,
            skill: {
                id: 'magic_talent',
                name: '魔術の才能 (才能)',
                type: 'Passive',
                description: '魔杖が装備できるようになる。\n魔術に関するスキルが取得できるようになる。\n魔術行使+1',
                statModifiers: { 'MagicKnowledge': 1 } // Example of stat modifier
            }
        },
        {
            id: '14',
            type: 'LEARN_SKILL',
            timestamp: 2,
            skill: {
                id: 'aurora_dragon',
                name: '極光の天空龍',
                type: 'Passive',
                description: '土、闇属性被ダメージ+5\n得意属性被ダメージ-5、与ダメージを+3\n最大MP+15、魔術熟知+1、科学技術力+1',
                statModifiers: { 'MP': 15, 'MagicKnowledge': 1, 'Science': 1 }
            }
        },
        {
            id: '15',
            type: 'LEARN_SKILL',
            timestamp: 2,
            skill: {
                id: 'core_overheat',
                name: '炉心過熱 (デメリット)',
                type: 'Passive',
                description: 'リアクターゲージが5の間、自身の主行動が終了するたびに自身の魔力点の確定ダメージを受ける。\nまた、その間自身の行動は1d6の結果に従い以下のように行動予定宣言が固定される。\n1,2：最も近いキャラクターに通常攻撃\n3,4：最もHPの高い敵を巻き込むようにエレメントブレス(属性はランダムに決定する)\n5,6：炉心冷却'
            }
        },

        // Skills - Spell
        {
            id: '16',
            type: 'LEARN_SKILL',
            timestamp: 2,
            skill: {
                id: 'blast',
                name: 'ブラスト Gr.1',
                type: 'Spell',
                description: 'タイミング：主行動\nCT：12-リアクターゲージ\n対象：単体 射程：至近 形状：-\n消費MP：3\n能動判定：魔術行使 受動判定：魔術抵抗\n効果：d6+魔力+魔術グレードの魔術ダメージを与える。\nこのダメージは相手の魔術防御による軽減を受けない。\nこのスキルは使用時、命中の成否にかかわらず自身のリアクターゲージを1増加させる (5を超えない)。\nまた、リアクターゲージが0の場合、能動判定を2回振り、高い方の出目を達成値として採用してよい。\nさらに、リアクターゲージが4以上の場合、この攻撃の対象を範囲(円：半径3メートル)に変更する。'
            }
        },
        {
            id: '17',
            type: 'LEARN_SKILL',
            timestamp: 2,
            skill: {
                id: 'arc_shot',
                name: 'アークショット Gr.1',
                type: 'Spell',
                description: 'タイミング：主行動\nCT：11-リアクターゲージ\n対象：単体 射程：20m 形状：射撃\n消費MP：1\n能動判定：魔術行使 受動判定：魔術抵抗\n効果：対象にd6＋魔力＋魔術グレード点の光属性魔術ダメージを与える。\n使用時、自身のリアクターゲージを1増加させる(5を超えない)。\nまた、リアクターゲージが2以下の場合、この攻撃によって誤射は起こらない。\nさらに、リアクターゲージが3以上の場合、この攻撃による与ダメ―ジに対する魔術防御は最終値の半分(切り上げ)で計算される。'
            }
        },

        // Equipment
        {
            id: '20',
            type: 'EQUIP',
            timestamp: 3,
            item: {
                id: 'luminart',
                name: 'モデル・ルミナート',
                type: 'Focus',
                description: '消費MP-2、魔術行使+1...',
                statModifiers: { 'MagicKnowledge': 1 }
            }
        },
        {
            id: '21',
            type: 'EQUIP',
            timestamp: 3,
            item: {
                id: 'reactor',
                name: '天龍炉心〈アルヴェナ〉',
                type: 'Accessory',
                description: 'リアクターゲージを追加する...',
            }
        },
    ];

    const [logs, setLogs] = React.useState<CharacterLogEntry[]>(initialLogs);

    const handleAddLog = (newLog: Omit<CharacterLogEntry, 'id' | 'timestamp'>) => {
        const log: CharacterLogEntry = {
            ...newLog,
            id: crypto.randomUUID(),
            timestamp: Date.now(),
        };
        setLogs(prev => [...prev, log]);
    };

    const character = {
        name: 'メル＝アルヴェナ＝ルミナ',
        bio: '古よりアルマ=プロビデンスを眺めて来た蒼天を舞う智慧の龍。\n神たる龍であるにも関わらず、神智ではなく人智に価値を見出した。',
        specialtyElements: ['火', '水', '風', 'エーテル', '光(看破+3)'],
    };

    const state = useMemo(() => {
        return CharacterCalculator.calculateState(logs);
    }, [logs]);

    return (
        <div className="min-h-screen bg-background py-8">
            <CharacterSheet
                character={character}
                state={state}
                logs={logs}
                onAddLog={handleAddLog}
            />
        </div>
    );
}
