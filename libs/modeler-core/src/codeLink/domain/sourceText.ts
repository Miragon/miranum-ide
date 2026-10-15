/**
 * A Spring/CDI bean-naming annotation up to the opening quote of its id, e.g.
 * `@Service("` or `@Component(value = '`.
 */
export const BEAN_ANNOTATION_PREFIX = String.raw`@(?:Component|Service|Repository|Named|Bean)\s*\(\s*(?:value\s*=\s*)?["']`;

export type TextRange = readonly [start: number, end: number];

/**
 * The XML comment and CDATA sections of `content`. A declaration inside one is
 * commented out, not real. Enumerated rather than stripped so offsets stay valid.
 */
export function commentAndCdataRanges(content: string): TextRange[] {
    const ranges: TextRange[] = [];
    for (const section of [/<!--[\s\S]*?-->/g, /<!\[CDATA\[[\s\S]*?\]\]>/g]) {
        for (const match of content.matchAll(section)) {
            ranges.push([match.index, match.index + match[0].length]);
        }
    }
    return ranges;
}

export function isInsideRanges(ranges: readonly TextRange[], offset: number): boolean {
    return ranges.some(([start, end]) => offset >= start && offset < end);
}
