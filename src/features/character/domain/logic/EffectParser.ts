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

        // Split by comma or space, but respect parentheses and braces.
        // We use a regex to match tokens instead of splitting.
        // Matches:
        // 1. {...} (content inside braces, assuming no nested braces for now)
        // 2. (...) (content inside parens)
        // 3. Any char that is NOT a separator (comma, Japanese comma, space)
        const regex = /(?:\{[^{}]*\}|\([^()]*\)|[^,、\s])+/g;
        const parts = effect.match(regex) || [];
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

            // 2. GrantResource:Name{max:10,min:0,init:10} OR GrantResource:Name=Max
            // e.g. GrantResource:弾薬{max:10,init:10}
            // e.g. GrantResource:弾薬=10 (Legacy support: Max=10, Init=10, Min=0)
            const grantResourceMatch = part.match(/^GrantResource:(.+?)(?:=(.+)|{(.+)})?$/i);
            if (grantResourceMatch) {
                const name = grantResourceMatch[1];
                const simpleValue = grantResourceMatch[2];
                const complexValue = grantResourceMatch[3];

                let max = 0;
                let min = 0;
                let initial = 0;

                if (complexValue) {
                    // Parse key:value pairs inside {}
                    // e.g. max:10,min:0,init:10
                    const props = complexValue.split(',').reduce((acc, pair) => {
                        const [k, v] = pair.split(/[:=]/).map(s => s.trim().toLowerCase());
                        if (k && v) acc[k] = parseInt(v) || 0;
                        return acc;
                    }, {} as Record<string, number>);

                    max = props['max'] || 0;
                    min = props['min'] || 0;
                    initial = props['init'] !== undefined ? props['init'] : max; // Default init to max if not specified
                } else if (simpleValue) {
                    // Legacy: =10
                    max = parseInt(simpleValue) || 0;
                    initial = max;
                }

                grantedResources.push({
                    id: crypto.randomUUID(), // Generate ID for new resource
                    name: name,
                    max: max,
                    min: min,
                    initial: initial,
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
                    // We no longer manually replace Japanese keys here.
                    // The formula should use {Variable} syntax, and CharacterCalculator.evaluateFormula will handle it.
                    // However, for backward compatibility or ease of use, we might want to support legacy "Attack" without {}?
                    // But the user agreed to standardize on {}.
                    // So we just pass the formula as is.
                    dynamicModifiers[statKey] = formula;
                }
            }
        }
        return { statModifiers, dynamicModifiers, grantedStats, grantedResources };
    }
}
