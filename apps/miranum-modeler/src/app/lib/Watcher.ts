import { RelativePattern, Uri, Webview, WebviewPanel, window, workspace } from "vscode";
import { MessageType, WorkspaceFolder } from "../types";
import { Reader } from "./Reader";
import { MiranumLogger } from "./MiranumLogger";

export class Watcher {
    private static instances: { [root: string]: Watcher } = {};

    private webviews: Map<string, WebviewPanel> = new Map();

    private unresponsive: { [id: string]: Webview } = {};

    private changes: Set<string> = new Set();

    private constructor(
        private readonly projectUri: Uri,
        private readonly workspaceFolders: WorkspaceFolder[],
    ) {
        const pattern = this.createGlobPattern();
        const watcher = workspace.createFileSystemWatcher(pattern);
        MiranumLogger.LOGGER.info(`[Miranum.Modeler.Watcher] Watcher was created
            - basePath: ${pattern.baseUri.path}
            - pattern: ${pattern.pattern}`,
        );

        watcher.onDidCreate((uri) => {
            this.notify(uri);
        });

        watcher.onDidChange((uri) => {
            this.notify(uri);
        });

        watcher.onDidDelete((uri) => {
            this.notify(uri);
        });
    }

    /**
     * Create a unique instance for each workspace or return the instance if it already exists.
     * @param projectUri The URI of the project/workspace
     * @param workspaceFolders
     */
    public static getWatcher(projectUri: Uri, workspaceFolders: WorkspaceFolder[]): Watcher {
        const root = projectUri.path;
        if (this.instances[root] === undefined) {
            this.instances[root] = new Watcher(projectUri, workspaceFolders);
        }
        return this.instances[root];
    }

    /**
     * Subscribe for notification.
     * @param id A unique identifier for given webview
     * @param webviewPanel The webview panel that contains the webview
     */
    public subscribe(id: string, webviewPanel: WebviewPanel): void {
        this.webviews.set(id, webviewPanel);
    }

    /**
     * Unsubscribe from notification.
     * @param id A unique identifier for a webview
     */
    public unsubscribe(id: string): void {
        this.webviews.delete(id);
        delete this.unresponsive[id];
    }

    /**
     * Update given webview if it was unresponsive when the changes occurred.
     * @param id A unique identifier for given webview
     * @param webviewPanel The webview panel that contains the webview
     */
    public async update(id: string, webviewPanel: WebviewPanel) {
        if (!this.unresponsive[id]) {
            // webview was already updated
            return;
        }

        const changedWorkspaceFolders: WorkspaceFolder[] = [];
        for (const dir of this.changes) {
            for (const workspaceFolder of this.workspaceFolders) {
                if (dir === workspaceFolder.path) {
                    changedWorkspaceFolders.push(workspaceFolder);
                }
            }
        }

        try {
            await this.postMessage(id, webviewPanel, changedWorkspaceFolders);
            delete this.unresponsive[id]; // message was posted
        } catch (error) {
            this.unresponsive[id] = webviewPanel.webview; // remember webview for reloading files as soon as the webview get visible again
        }

        if (Object.keys(this.unresponsive).length === 0) {
            this.changes = new Set();
        }
    }

    /**
     * Notify all subscribed webviews and save the unresponsive ones.
     * @param uri The uri of the changed file
     * @private
     */
    private async notify(uri: Uri) {
        try {
            const [dir] = this.getDirectoryAndExtension(uri);
            const changedWorkspaceFolders: WorkspaceFolder[] = [];
            for (const workspaceFolder of this.workspaceFolders) {
                if (dir === workspaceFolder.path) {
                    changedWorkspaceFolders.push(workspaceFolder);
                }
            }

            for (const [id, webviewPanel] of this.webviews) {
                try {
                    await this.postMessage(id, webviewPanel, changedWorkspaceFolders);
                    delete this.unresponsive[id]; // message was posted
                } catch (error) {
                    this.unresponsive[id] = webviewPanel.webview; // remember webview for reloading files as soon as the webview get visible again
                }

                if (Object.keys(this.unresponsive).length > 0) {
                    this.changes.add(dir);
                } else {
                    this.changes.delete(dir);
                }
            }

        } catch (error) {
            for (const [id, webviewPanel] of this.webviews) {
                this.unresponsive[id] = webviewPanel.webview;
            }
            const message = (error instanceof Error) ? error.message : "Could not notify webview";
            MiranumLogger.LOGGER.error(`[Miranum.Modeler.Watcher] ${message}`);
        }
    }

    /**
     * Create a {@link https://code.visualstudio.com/api/references/vscode-api#RelativePattern|RelativePattern} for the
     * {@link https://code.visualstudio.com/api/references/vscode-api#FileSystemWatcher|FileSystemWatcher} depending on
     * the specified {@link WorkspaceFolder}.
     * @private
     */
    private createGlobPattern(): RelativePattern {
        // todo:
        //  Changes in miranum.json should trigger a new evaluation of the watched paths
        //  Files at root level are not being watched!

        let projectPath = this.projectUri.path.split("/");
        let folders = "";
        let ext = "";
        let backSteps = 0;
        const extSet = new Set();  // prevent duplicates

        for (const [i, folder] of this.workspaceFolders.entries()) {
            if (folder.type === "bpmn" || folder.type === "dmn") {
                continue;
            }

            // todo:
            //  make it windows compatible
            //  remove trailing slashes or backslashes
            const path = folder.path.split("/");

            let localBackSteps = 0;
            for (const part of path) {
                if (part === "..") {
                    localBackSteps++;
                }
            }
            backSteps = (localBackSteps > backSteps) ? localBackSteps : backSteps;

            extSet.add(folder.extension.substring(folder.extension.indexOf(".") + 1));

            if (this.workspaceFolders.length - 1 !== i) {
                folders += path[path.length - 1] + ",";
            } else {
                folders += path[path.length - 1];
            }
        }

        projectPath = projectPath.slice(0, projectPath.length - backSteps);

        let i = 0;
        for (const value of extSet) {
            if (extSet.size - 1 !== i) {
                ext += value + ",";
            } else {
                ext += value;
            }
            i++;
        }

        const base = Uri.parse(projectPath.join("/"));
        const pattern = `**/{${folders}}/*.{${ext}}`;

        return new RelativePattern(base, pattern);
    }

    /**
     * Extract the folder and extension of given URI.
     * @param uri The URI of the file
     * @private
     */
    private getDirectoryAndExtension(uri: Uri): [dir: string, ext: string] {
        const path = uri.path;  // e.g. "/Users/peterheinemann/Projects/miranum/miranum-vs-code-modeler/examples/forms/control.form"
        const dirs = path.split("/");
        for (const folder of this.workspaceFolders) {
            const wsPath = folder.path.split("/");  //  todo: make it windows compatible
            if (wsPath[wsPath.length - 1] === dirs[dirs.length - 2]) {
                return [folder.path, folder.extension];
            }
        }
        throw new Error(`Could not find ${dirs[0]} in the tracked directories!`);
    }

    private async postMessage(id: string, webviewPanel: WebviewPanel, folders: WorkspaceFolder[]) {
        const reader = Reader.getFileSystemReader();
        if (await webviewPanel.webview.postMessage({
            type: `FileSystemWatcher.${MessageType.reloadFiles}`,
            text: JSON.stringify(await reader.getAllFiles(this.projectUri, folders)),
        })) {
            this.showMessage("Files reloaded successfully!");
            MiranumLogger.LOGGER.info(`[Miranum.Modeler.Watcher] Reloaded webview ${webviewPanel.title} successfully`);

        } else {
            if (webviewPanel.visible) {
                this.showErrorMessage(id, webviewPanel);
            }
            MiranumLogger.LOGGER.error(`[Miranum.Modeler.Watcher] Could not post message to webview ${webviewPanel.title}` +
                `(ViewState: ${webviewPanel.visible}`);
        }
    }

    private showMessage(message: string): void {
        window.showInformationMessage(
            message,
        );
    }

    private showErrorMessage(id: string, webviewPanel: WebviewPanel): void {
        window.showInformationMessage(
            `Failed to reload modeler! Webview: ${id}`,
            ...["Try again"],
        ).then((input) => {
            if (input === "Try again") {
                this.update(id, webviewPanel);
            }
        });
    }
}