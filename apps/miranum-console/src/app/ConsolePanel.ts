import { Disposable, Uri, ViewColumn, WebviewPanel, window } from "vscode";
import { saveFile } from "./shared/fs-helpers";
import { showErrorMessage, showInfoMessage } from "./shared/message";
import { Artifact, MiranumCore } from "@miranum-ide/miranum-core";
import { Cache, MessageEvent } from "./types";

export class ConsolePanel {
    public static currentPanel: ConsolePanel | undefined;

    public static readonly viewType: string = "miranum-console";

    private readonly panel: WebviewPanel;

    private readonly extensionUri: Uri;

    private disposables: Disposable[] = [];

    private constructor(panel: WebviewPanel, extensionUri: Uri) {
        this.panel = panel;
        this.extensionUri = extensionUri;

        // Set the webview's initial html content
        this.panel.webview.html = this.getHtml();

        // Listen for when the panel is disposed
        // This happens when the user closes the panel or when the panel is closed programmatically
        this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
    }

    public get visible(): boolean {
        return this.panel.visible;
    }

    public static createOrShow(extensionUri: Uri) {
        const column = window.activeTextEditor
            ? window.activeTextEditor.viewColumn
            : undefined;

        // If we already have a panel, show it.
        if (ConsolePanel.currentPanel) {
            ConsolePanel.currentPanel.panel.reveal(column);
            return ConsolePanel.currentPanel;
        }

        // Otherwise, create a new panel.
        const panel = window.createWebviewPanel(
            ConsolePanel.viewType,
            "Miranum Console",
            column || ViewColumn.One,
            { enableScripts: true },
        );

        ConsolePanel.currentPanel = new ConsolePanel(panel, extensionUri);
        return ConsolePanel.currentPanel;
    }

    public dispose() {
        ConsolePanel.currentPanel = undefined;

        // Clean up our resources
        this.panel.dispose();

        while (this.disposables.length) {
            const x = this.disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    public onDidReceiveMessage(
        cache: Cache,
        miranumCore: MiranumCore,
        cb: (event: any) => Promise<void>,
    ): void {
        this.panel.webview.onDidReceiveMessage(
            async (event) => {
                await cb(event);
            },
            null,
            this.disposables,
        );
    }

    public onDidChangeViewState(
        cache: Cache,
        miranumCore: MiranumCore,
        cb: () => void,
    ): void {
        if (this.panel.visible) {
            this.postMessage({
                type: "show",
                command: "generateFile",
                data: {
                    name: cache.name,
                    type: cache.type,
                    path: cache.path,
                    miranumJson: miranumCore.projectConfig,
                },
            });
        }
    }

    public postMessage(event: MessageEvent) {
        this.panel.webview.postMessage(event);
    }

    private getHtml(): string {
        const pathToWebview = Uri.joinPath(this.extensionUri, "miranum-console-webview");
        const scriptUri = this.panel.webview.asWebviewUri(
            Uri.joinPath(pathToWebview, "index.js"),
        );

        // TODO enable csp
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Miranum Console</title>
        </head>
        <body>
            <div id="root"></div>
            <script type="text/javascript" src="${scriptUri}"></script>
        </body>
        </html>`;
    }

    private async generate(artifact: Artifact, path: string): Promise<void> {
        try {
            if (!artifact.file.pathInProject) {
                throw Error(`Could not create file ${artifact.file.name}`);
            }
            const file = `${path}/${artifact.file.pathInProject}`.replace("//", "/");
            await saveFile(file, artifact.file.content);
            showInfoMessage(`SAVED ${artifact.file.name}.${artifact.file.extension}`);
        } catch (err) {
            showErrorMessage(
                `FAILED creating file ${artifact.file.name} with -> ${err}`,
            );
            return Promise.reject(err);
        }
    }
}
