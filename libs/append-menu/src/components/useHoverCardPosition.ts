import type { RefObject } from "preact";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";

import { hoverCardPosition, type HoverCardPosition } from "../positioning";

/**
 * Places a hover card beside `anchorRef`, level with the item `findPreviewed`
 * returns from inside `scrollRef`, or yields null when nothing is previewed.
 */
export function useHoverCardPosition(
    anchorRef: RefObject<HTMLElement>,
    scrollRef: RefObject<HTMLElement>,
    findPreviewed: (scrollContainer: HTMLElement) => Element | null | undefined,
): HoverCardPosition | null {
    const [position, setPosition] = useState<HoverCardPosition | null>(null);
    const findPreviewedRef = useRef(findPreviewed);
    findPreviewedRef.current = findPreviewed;

    const measure = useCallback(() => {
        const anchor = anchorRef.current;
        const scrollContainer = scrollRef.current;
        const previewed = scrollContainer ? findPreviewedRef.current(scrollContainer) : null;
        const measured =
            anchor && previewed
                ? hoverCardPosition(
                      {
                          panelLeft: anchor.getBoundingClientRect().left,
                          cardTop: previewed.getBoundingClientRect().top,
                      },
                      window.innerHeight,
                  )
                : null;
        setPosition((current) => (isSamePosition(current, measured) ? current : measured));
    }, [anchorRef, scrollRef]);

    // Measured after every commit because the overlay moves the whole panel when it clamps
    // it to the canvas, which the columns cannot observe through their own props.
    useLayoutEffect(measure);

    useEffect(() => {
        const scrollContainer = scrollRef.current;
        scrollContainer?.addEventListener("scroll", measure);
        return () => scrollContainer?.removeEventListener("scroll", measure);
    }, [measure, scrollRef]);

    return position;
}

function isSamePosition(a: HoverCardPosition | null, b: HoverCardPosition | null): boolean {
    return a?.top === b?.top && a?.left === b?.left && a?.maxHeight === b?.maxHeight;
}
