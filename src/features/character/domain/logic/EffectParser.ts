import { Resource } from '../CharacterLog';
import { JAPANESE_TO_ENGLISH_STATS } from '../constants';

export interface ParsedEffect {
    statModifiers: Record<string, number>;
    dynamicModifiers: Record<string, string>;
    grantedStats: { key: string; label: string; value: number; isMain?: boolean }[];
    grantedResources: Resource[];
}

export class EffectParser {
    static parse(effect: string): ParsedEffect {
        const statModifiers: Record<string, number> = {};
        const dynamicModifiers: Record<string, string> = {};
        const grantedStats: { key: string; label: string; value: number; isMain?: boolean }[] = [];
        const grantedResources: Resource[] = [];

        // Split by comma or space, but respect parentheses?
        // Simple split might break "GrantStat:foo(bar)=1" if we split by space and there are spaces inside?
        // Let's stick to simple split for now, assuming no spaces in labels or using specific delimiters.
        const parts = effect.split(/[,、\s]+/);
        for (const part of parts) {
            if (!part.trim()) continue;

            // 1. GrantStat:Key(Label)=Value OR GrantStat:Label=Value
            // e.g. GrantStat:karma(カルマ)=0  -> Key: karma, Label: カルマ
            // e.g. GrantStat:カルマ=0        -> Key: カルマ, Label: カルマ
            const grantStatMatch = part.match(/^GrantStat:(.+?)(?:\((.+?)\))?=(\d+)$/i);
            if (grantStatMatch) {
                const rawKey = grantStatMatch[1];
                const rawLabel = grantStatMatch[2];
                const val = parseInt(grantStatMatch[3]);

                grantedStats.push({
                    key: rawKey,
                    label: rawLabel || rawKey,
                    value: val,
                    isMain: true
                });
                continue;
            }

            // 2. GrantResource:Name=Max
            // e.g. GrantResource:弾薬=10
            const grantResourceMatch = part.match(/^GrantResource:(.+?)=(\d+)$/i);
            if (grantResourceMatch) {
                const name = grantResourceMatch[1];
                const max = parseInt(grantResourceMatch[2]);
                grantedResources.push({
                    id: crypto.randomUUID(), // Generate ID for new resource
                    name: name,
                    max: max,
                    initial: max
                });
                continue;
            }

            // 3. Static: Stat+N or Stat-N
            const staticMatch = part.match(/^(.+?)([+\-])(\d+)$/);
            if (staticMatch) {
                const rawStat = staticMatch[1].trim();
                const op = staticMatch[2];
                const val = parseInt(staticMatch[3]);
                const statKey = JAPANESE_TO_ENGLISH_STATS[rawStat] || rawStat;
                if (statKey) {
                    statModifiers[statKey] = op === '-' ? -val : val;
                }
                continue;
            }

            // 4. Dynamic: Stat:Formula (e.g. 攻撃:筋力/2)
            const dynamicMatch = part.match(/^(.+?)[:：](.+)$/);
            if (dynamicMatch) {
                const rawStat = dynamicMatch[1].trim();
                const formula = dynamicMatch[2].trim();
                const statKey = JAPANESE_TO_ENGLISH_STATS[rawStat] || rawStat;
                if (statKey) {
                    let processedFormula = formula;
                    for (const [jp, en] of Object.entries(JAPANESE_TO_ENGLISH_STATS)) {
                        processedFormula = processedFormula.replaceAll(jp, en);
                    }
                    dynamicModifiers[statKey] = processedFormula;
                }
            }
        }
        return { statModifiers, dynamicModifiers, grantedStats, grantedResources };
    }
}
