export type ElementTemplate = Record<string, unknown>;

/** The templates parsed from one source: a template directory or the marketplace cache. */
export interface ElementTemplateSource {
    readonly fileCount: number;
    readonly templates: readonly ElementTemplate[];
}

export const EMPTY_TEMPLATE_SOURCE: ElementTemplateSource = { fileCount: 0, templates: [] };

/** A template file holds either a single template or an array of them. */
export function templatesOfFile(parsedFile: unknown): ElementTemplate[] {
    return [parsedFile].flat() as ElementTemplate[];
}

/** Templates of all sources sorted by name; equal names keep their source order. */
export function mergeElementTemplates(
    sources: readonly ElementTemplateSource[],
): ElementTemplate[] {
    return sources
        .flatMap((source) => source.templates)
        .sort((a, b) => String(a.name ?? "").localeCompare(String(b.name ?? "")));
}
