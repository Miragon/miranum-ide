import { afterEach, describe, expect, it } from "vitest";

import defaultCss from "./styles/default.css?raw";
import modeCss from "./styles/mode.css?raw";

const injectedNodes: HTMLElement[] = [];

function injectStylesheets(...sheets: string[]): void {
    for (const sheet of sheets) {
        const style = document.createElement("style");
        style.textContent = sheet;
        document.head.append(style);
        injectedNodes.push(style);
    }
}

function mountDiagramShellPanelHost(): HTMLElement {
    const shell = document.createElement("div");
    shell.className = "content with-diagram";
    const panelHost = document.createElement("div");
    panelHost.className = "properties-panel-parent panel-host";
    shell.append(panelHost);
    document.body.append(shell);
    injectedNodes.push(shell);
    return panelHost;
}

afterEach(() => {
    injectedNodes.forEach((node) => node.remove());
    injectedNodes.length = 0;
});

describe("panel host inside the diagram shell", () => {
    it.each([
        ["default.css before mode.css", [defaultCss, modeCss]],
        ["mode.css before default.css", [modeCss, defaultCss]],
    ])("stays a visible flex column with %s", (_order, sheets) => {
        injectStylesheets(...sheets);
        const panelHost = mountDiagramShellPanelHost();

        const computedStyle = getComputedStyle(panelHost);
        expect(computedStyle.display).toBe("flex");
        expect(computedStyle.overflow).toBe("hidden");
    });
});
