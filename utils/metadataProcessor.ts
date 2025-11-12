
import { 
    ADOBE_CATEGORY_MAP, ADOBE_NAME_TO_CODE, ADOBE_ALIASES, ADOBE_CATEGORY_RULES,
    PEOPLE_BIAS_TERMS, GRAPHICS_BIAS_TERMS, KEYWORD_STOPWORDS, KEYWORD_MAX, KEYWORD_MIN_STRONG
} from '../constants';
import { MetadataResult } from '../types';

const normalizeCategoryName = (name: string): string => (name || "").trim().toLowerCase();

const getCategoryCodeFromName = (name: string): number => {
    const n = normalizeCategoryName(name);
    if (!n) return 0;
    if (ADOBE_NAME_TO_CODE[n]) return ADOBE_NAME_TO_CODE[n];
    if (ADOBE_ALIASES[n]) return ADOBE_ALIASES[n];
    if (n.endsWith('s') && ADOBE_ALIASES[n.slice(0, -1)]) {
        return ADOBE_ALIASES[n.slice(0, -1)];
    }
    return 0;
};

const tokenize = (...texts: (string | undefined)[]): Set<string> => {
    const blob = texts.filter(Boolean).join(" ")
        .replace(/[,./-]/g, " ")
        .toLowerCase();
    const tokens = blob.match(/[a-zA-Z][a-zA-Z ]+/g) || [];
    const base = new Set<string>();
    for (const t of tokens) {
        t.split(/\s+/).forEach(part => base.add(part.trim()));
        base.add(t.trim());
    }
    return base;
};

const scoreCategories = (tokens: Set<string>): Record<number, number> => {
    const scores: Record<number, number> = Object.keys(ADOBE_CATEGORY_MAP).reduce((acc, code) => ({ ...acc, [parseInt(code, 10)]: 0 }), {});
    for (const [code, vocab] of Object.entries(ADOBE_CATEGORY_RULES)) {
        const numCode = parseInt(code, 10);
        for (const term of vocab) {
            if (tokens.has(term)) {
                scores[numCode] += 3;
            }
            term.split(' ').forEach(w => {
                if (tokens.has(w)) {
                    scores[numCode] += 1;
                }
            });
        }
    }
    return scores;
};

const hasPeopleBias = (tokens: Set<string>): boolean => {
    for (const term of PEOPLE_BIAS_TERMS) {
        if (tokens.has(term)) return true;
    }
    return false;
};

const hasGraphicsBias = (tokens: Set<string>): boolean => {
    for (const term of GRAPHICS_BIAS_TERMS) {
        if (tokens.has(term)) return true;
    }
    return false;
};

const arbitrateBestCode = (aiCode: number, ruleCode: number, ruleScoreAi: number, ruleScoreBest: number): number => {
    if (!aiCode) return ruleCode;
    if (aiCode === ruleCode) return aiCode;
    if (ruleScoreBest - ruleScoreAi >= 5 && ruleCode) return ruleCode;
    return aiCode;
};

const cleanPhrase = (s: string): string => {
    return (s || '').replace(/\s+/g, ' ').trim().replace(/^["']|["',.;:-|]$/g, '');
};

const sentenceCase = (s: string): string => {
    const str = (s || '').trim();
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
};

const refineTitleKeywords = (title: string, keywords: string, description: string, categoryCode: number): { refinedTitle: string; refinedKeywords: string } => {
    let t = cleanPhrase(title);
    t = t.replace(/\b(stock photo|stock image|copy space|high quality|hd|4k)\b/gi, '');
    t = sentenceCase(t.replace(/\s{2,}/g, ' ').trim().substring(0, 200).toLowerCase());

    const rawParts = (keywords || '').split(/[,\n;]+/);
    const seen = new Set<string>();
    const filtered = rawParts
        .map(p => cleanPhrase(p.toLowerCase()))
        .filter(p => {
            if (p.length <= 1 || KEYWORD_STOPWORDS.has(p) || seen.has(p)) return false;
            seen.add(p);
            return true;
        });

    const tdTokens = `${title} ${description}`.toLowerCase().split(/[^a-zA-Z0-9+]+/).filter(w => w.length > 2);
    const tdPhrases = new Set(filtered);
    tdTokens.forEach(w => {
        if (!KEYWORD_STOPWORDS.has(w) && !seen.has(w)) tdPhrases.add(w);
    });

    let catTerms: string[] = [];
    if (categoryCode === 13) catTerms = ["people", "person", "human", "portrait"];
    else if (categoryCode === 8) catTerms = ["vector", "icon", "icons", "graphic", "ui"];
    else if (categoryCode === 19) catTerms = ["technology", "tech"];
    else if (categoryCode === 3) catTerms = ["business", "office"];
    else if (categoryCode === 7) catTerms = ["food"];

    catTerms.forEach(term => {
        if (!KEYWORD_STOPWORDS.has(term) && !seen.has(term)) tdPhrases.add(term);
    });
    
    const prioritized = [...filtered, ...Array.from(tdPhrases).filter(p => !filtered.includes(p))];

    let curated = prioritized.filter(p => {
        if (!p) return false;
        if (["stock photo", "copy space", "no people", "nobody", "text placeholder"].some(bad => p.includes(bad))) return false;
        return p.split(' ').length <= 3;
    });

    curated = curated.slice(0, KEYWORD_MAX);

    if (curated.length < KEYWORD_MIN_STRONG) {
        const extras: string[] = [];
        for (const p of curated) {
            if (p.endsWith('s')) {
                const base = p.slice(0, -1);
                if (base.length > 2 && !curated.includes(base) && !extras.includes(base)) extras.push(base);
            } else {
                const plural = p + 's';
                if (plural.length > 2 && !curated.includes(plural) && !extras.includes(plural)) extras.push(plural);
            }
            if (curated.length + extras.length >= KEYWORD_MIN_STRONG) break;
        }
        curated.push(...extras.slice(0, Math.max(0, KEYWORD_MIN_STRONG - curated.length)));
    }

    return { refinedTitle: t, refinedKeywords: curated.join(', ') };
};


export const processGeminiResponse = (text: string, filename: string): MetadataResult => {
    let title = '', keywords = '', categoryTxt = '', description = '';

    const extract = (label: string) => {
        const match = text.match(new RegExp(`^${label}\\s*:\\s*(.*)$`, 'im'));
        return match ? match[1].trim() : '';
    };

    title = extract("TITLE");
    keywords = extract("KEYWORDS");
    categoryTxt = extract("CATEGORY");
    description = extract("DESCRIPTION");
    
    if (!title && !keywords && !categoryTxt && !description) {
        const lines = text.trim().split('\n').map(l => l.trim());
        let current: 'title' | 'keywords' | 'category' | 'description' | null = null;
        for (const line of lines) {
            if (/^TITLE\s*:/i.test(line)) {
                title = line.split(/:\s*/, 2)[1] || '';
                current = 'title';
            } else if (/^KEYWORDS\s*:/i.test(line)) {
                keywords = line.split(/:\s*/, 2)[1] || '';
                current = 'keywords';
            } else if (/^CATEGORY\s*:/i.test(line)) {
                categoryTxt = line.split(/:\s*/, 2)[1] || '';
                current = 'category';
            } else if (/^DESCRIPTION\s*:/i.test(line)) {
                description = line.split(/:\s*/, 2)[1] || '';
                current = 'description';
            } else if (current) {
                if (current === 'keywords') keywords += ' ' + line;
                else if (current === 'description') description += ' ' + line;
            }
        }
    }

    title = (title || '').trim().substring(0, 200);
    keywords = (keywords || '').trim();
    description = (description || '').trim().substring(0, 500);

    const tokens = tokenize(title, keywords, description);

    let finalCode: number;
    if (hasPeopleBias(tokens)) {
        finalCode = 13;
    } else if (hasGraphicsBias(tokens)) {
        finalCode = 8;
    } else {
        const aiCode = getCategoryCodeFromName(categoryTxt);
        const scores = scoreCategories(tokens);
        const ruleCode = Object.keys(scores).length > 0 ? parseInt(Object.entries(scores).reduce((a, b) => a[1] > b[1] ? a : b)[0], 10) : 0;
        const ruleBestScore = scores[ruleCode] || 0;
        const aiRuleScore = scores[aiCode] || 0;
        finalCode = arbitrateBestCode(aiCode, ruleCode, aiRuleScore, ruleBestScore);
    }
    
    const { refinedTitle, refinedKeywords } = refineTitleKeywords(title, keywords, description, finalCode);

    return {
        title: refinedTitle,
        keywords: refinedKeywords,
        description: description,
        categoryCode: finalCode,
        categoryName: ADOBE_CATEGORY_MAP[finalCode] || (categoryTxt || 'Unknown')
    };
};
