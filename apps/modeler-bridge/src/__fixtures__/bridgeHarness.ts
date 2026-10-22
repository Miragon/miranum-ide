/** Drains pending microtasks and one macrotask turn, so "nothing happened" can be asserted. */
export async function settle(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 0));
}

export async function waitForFrame(
    frames: any[],
    predicate: (frame: any) => boolean,
    timeoutMs = 2000,
): Promise<any> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        const match = frames.find(predicate);
        if (match) return match;
        await new Promise((resolve) => setTimeout(resolve, 10));
    }
    throw new Error("waitForFrame timed out");
}

/** The `session/register` params the host sends when it opens a `.bpmn` editor. */
export function registerParams(
    editorId: string,
    workspaceRoot: string,
    fsPath: string,
    content: string,
) {
    return {
        editorId,
        uriString: editorId,
        path: editorId.replace(/^file:\/\//, ""),
        fsPath,
        scheme: "file",
        workspaceRoot,
        content,
        settings: {},
    };
}

export function hostNotification(method: string, params: unknown): string {
    return JSON.stringify({ method, params });
}

export function hostReply(id: number, result: unknown): string {
    return JSON.stringify({ id, result });
}

export function hostErrorReply(id: number, error: string): string {
    return JSON.stringify({ id, error });
}
