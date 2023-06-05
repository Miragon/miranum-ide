import { Disposable, Uri, ViewColumn, WebviewPanel, window } from "vscode";
import { VscMessage } from "@miranum-ide/vscode/miranum-vscode-webview";
import { ConsoleData } from "@miranum-ide/vscode/shared/miranum-console";

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

    public onDidReceiveMessage(cb: (event: any) => Promise<void>): void {
        this.panel.webview.onDidReceiveMessage(
            async (event) => {
                await cb(event);
            },
            null,
            this.disposables,
        );
    }

    public onDidChangeViewState(cb: () => void): void {
        if (this.panel.visible) {
            cb();
        }
    }

    public postMessage(message: VscMessage<ConsoleData>) {
        this.panel.webview.postMessage(message);
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
            <script type="text/javascript">
              const globalViewType = '${ConsolePanel.viewType}'
            </script>
            <script type="text/javascript" src="${scriptUri}"></script>
        </body>
        </html>`;
    }
}
