import {
    Command,
    DeployCommand,
    DeploymentConfigPayload,
    DeploymentFormDefaults,
    DeploymentResultQuery,
    Query,
    RequestAdditionalFilesCommand,
    VsCodeApi,
} from "@bpmn-modeler/shared";

/**
 * Manages the deployment form DOM state: populating fields from extension-host
 * defaults, collecting the user-entered config, and rendering results.
 *
 * `DeploymentForm` is intentionally framework-free — it manipulates the DOM
 * directly and communicates with the VS Code extension host via the
 * `postMessage` API wrapped by {@link VsCodeApi}.
 */
export class DeploymentForm {
    private readonly deploymentNameInput: HTMLInputElement;

    private readonly tenantIdInput: HTMLInputElement;

    private readonly endpointInput: HTMLInputElement;

    private readonly engineSelect: HTMLSelectElement;

    private readonly mainFilePathInput: HTMLInputElement;

    private readonly additionalFilesBtn: HTMLButtonElement;

    private readonly fileList: HTMLUListElement;

    private readonly deployBtn: HTMLButtonElement;

    private readonly statusBanner: HTMLDivElement;

    /** Absolute paths of additional files selected via QuickPick. */
    private additionalFilePaths: string[] = [];

    /**
     * Wires up all DOM element references and attaches event listeners.
     *
     * @param vscode The VS Code API instance used to post messages.
     * @throws {Error} If any expected DOM element is missing.
     */
    constructor(private readonly vscode: VsCodeApi<unknown, Command | Query>) {
        this.deploymentNameInput =
            this.requireElement<HTMLInputElement>("#deployment-name");
        this.tenantIdInput = this.requireElement<HTMLInputElement>("#tenant-id");
        this.endpointInput = this.requireElement<HTMLInputElement>("#endpoint");
        this.engineSelect = this.requireElement<HTMLSelectElement>("#engine");
        this.mainFilePathInput =
            this.requireElement<HTMLInputElement>("#main-file-path");
        this.additionalFilesBtn =
            this.requireElement<HTMLButtonElement>("#add-files-btn");
        this.fileList = this.requireElement<HTMLUListElement>("#file-list");
        this.deployBtn = this.requireElement<HTMLButtonElement>("#deploy-btn");
        this.statusBanner = this.requireElement<HTMLDivElement>("#status-banner");

        this.bindEvents();
    }

    /**
     * Populates the form fields from the extension host's defaults.
     *
     * @param defaults Pre-populated defaults provided by `DeploymentService.getFormDefaults()`.
     */
    populate(defaults: DeploymentFormDefaults): void {
        this.deploymentNameInput.value = defaults.deploymentName;
        this.tenantIdInput.value = defaults.tenantId;
        this.endpointInput.value = defaults.endpoint;
        this.engineSelect.value = defaults.engine;
        // mainFilePath is read-only — managed by the extension host.
        this.mainFilePathInput.value = defaults.deploymentName
            ? `(current file: ${defaults.deploymentName}.bpmn)`
            : "";
    }

    /**
     * Reads the current form values and builds a {@link DeploymentConfigPayload}.
     *
     * @returns A payload ready to attach to a {@link DeployCommand}.
     * @throws {Error} If `deploymentName` or `endpoint` are empty.
     */
    getConfigPayload(): DeploymentConfigPayload {
        const deploymentName = this.deploymentNameInput.value.trim();
        const endpoint = this.endpointInput.value.trim();

        if (!deploymentName) {
            throw new Error("Deployment name is required.");
        }
        if (!endpoint) {
            throw new Error("REST endpoint is required.");
        }

        return {
            deploymentName,
            tenantId: this.tenantIdInput.value.trim(),
            endpoint,
            engine: this.engineSelect.value as "c7" | "c8",
            mainFilePath: "", // Populated by the extension host from the active editor
            additionalFilePaths: [...this.additionalFilePaths],
        };
    }

    /**
     * Appends newly selected additional file paths to the list and re-renders.
     *
     * @param paths Absolute paths returned by the extension host after QuickPick selection.
     */
    setAdditionalFiles(paths: string[]): void {
        // Merge without duplicates.
        for (const p of paths) {
            if (!this.additionalFilePaths.includes(p)) {
                this.additionalFilePaths.push(p);
            }
        }
        this.renderFileList();
    }

    /** Disables the Deploy button and shows a spinner in the status banner. */
    showProgress(): void {
        this.deployBtn.disabled = true;
        this.statusBanner.className = "status-banner progress";
        this.statusBanner.textContent = "Deploying\u2026";
        this.statusBanner.style.display = "block";
    }

    /**
     * Shows the deployment result in the status banner and re-enables the Deploy button.
     *
     * @param result The result query received from the extension host.
     */
    showResult(result: DeploymentResultQuery): void {
        this.deployBtn.disabled = false;
        this.statusBanner.className = result.success
            ? "status-banner success"
            : "status-banner error";
        this.statusBanner.textContent = result.message;
        this.statusBanner.style.display = "block";
    }

    /** Re-enables the Deploy button and hides the status banner. */
    reset(): void {
        this.deployBtn.disabled = false;
        this.statusBanner.style.display = "none";
        this.statusBanner.textContent = "";
    }

    // --- Private helpers ---

    /**
     * Attaches click handlers to the Deploy and Add-Files buttons.
     */
    private bindEvents(): void {
        this.additionalFilesBtn.addEventListener("click", () => {
            this.vscode.postMessage(new RequestAdditionalFilesCommand());
        });

        this.deployBtn.addEventListener("click", () => {
            try {
                const payload = this.getConfigPayload();
                this.showProgress();
                this.vscode.postMessage(new DeployCommand(payload));
            } catch (err) {
                this.statusBanner.className = "status-banner error";
                this.statusBanner.textContent =
                    err instanceof Error ? err.message : String(err);
                this.statusBanner.style.display = "block";
            }
        });
    }

    /**
     * Re-renders the additional files list with remove buttons for each entry.
     */
    private renderFileList(): void {
        this.fileList.innerHTML = "";
        for (const filePath of this.additionalFilePaths) {
            const li = document.createElement("li");
            li.className = "file-item";

            const nameSpan = document.createElement("span");
            nameSpan.textContent = filePath.split("/").pop() ?? filePath;
            nameSpan.title = filePath;

            const removeBtn = document.createElement("button");
            removeBtn.textContent = "\u00d7";
            removeBtn.className = "remove-btn";
            removeBtn.addEventListener("click", () => {
                this.additionalFilePaths = this.additionalFilePaths.filter(
                    (p) => p !== filePath,
                );
                this.renderFileList();
            });

            li.appendChild(nameSpan);
            li.appendChild(removeBtn);
            this.fileList.appendChild(li);
        }
    }

    /**
     * Returns the DOM element matching `selector` or throws if not found.
     *
     * @param selector CSS selector string.
     * @returns The matching element.
     * @throws {Error} If no element matches the selector.
     */
    private requireElement<T extends Element>(selector: string): T {
        const el = document.querySelector<T>(selector);
        if (!el) {
            throw new Error(`Required DOM element not found: ${selector}`);
        }
        return el;
    }
}
