import Modeler from "camunda-bpmn-js/lib/base/Modeler";
import BpmnModeler7 from "camunda-bpmn-js/lib/camunda-platform/Modeler";
import BpmnModeler8 from "camunda-bpmn-js/lib/camunda-cloud/Modeler";
import { ImportXMLError, ImportXMLResult, SaveXMLResult } from "bpmn-js/lib/BaseViewer";
import TokenSimulationModule from "bpmn-js-token-simulation";
import ElementTemplateChooserModule from "@bpmn-io/element-template-chooser";
import { CreateAppendElementTemplatesModule } from "bpmn-js-create-append-anything";
import {
    BpmnModelerSetting,
    NoModelerError,
} from "@miranum-ide/miranum-vscode-webview";

const DEFAULT_SETTINGS: BpmnModelerSetting = {
    alignToOrigin: false,
    darkTheme: false,
};

const MODELER_OPTIONS = {
    container: "#js-canvas",
    propertiesPanel: {
        parent: "#js-properties-panel",
    },
    alignToOrigin: {
        alignOnSave: false,
        offset: 150,
        tolerance: 50,
    },
};

/**
 * Encapsulates the bpmn-js modeler instance and all operations on it.
 *
 * A single instance is created at application startup and shared via the
 * module-level export in {@link index.ts}.  All methods throw
 * {@link NoModelerError} if called before {@link create}.
 */
export class BpmnModeler {
    private modeler: Modeler | undefined = undefined;
    private settings: BpmnModelerSetting = { ...DEFAULT_SETTINGS };

    /**
     * Creates and mounts a new bpmn-js modeler for the given execution engine.
     *
     * @param engine Camunda engine version — `"c7"` for Camunda Platform 7,
     *   `"c8"` for Camunda Cloud 8.
     * @throws {UnsupportedEngineError} If the engine string is not recognised.
     */
    create(engine: "c7" | "c8"): void {
        const commonModules = [TokenSimulationModule, ElementTemplateChooserModule];

        switch (engine) {
            case "c7": {
                this.modeler = new BpmnModeler7({
                    ...MODELER_OPTIONS,
                    additionalModules: [
                        ...commonModules,
                        CreateAppendElementTemplatesModule,
                    ],
                });
                break;
            }
            case "c8": {
                this.modeler = new BpmnModeler8({
                    ...MODELER_OPTIONS,
                    additionalModules: [...commonModules],
                });
                break;
            }
            default: {
                throw new UnsupportedEngineError(engine);
            }
        }
    }

    /**
     * Subscribes to the `elementTemplates.errors` event.
     *
     * @param cb Callback invoked with the array of template errors.
     * @throws {NoModelerError} If the modeler has not been created yet.
     */
    onElementTemplatesErrors(cb: (errors: any) => void): void {
        this.getModeler().on("elementTemplates.errors", (event: any) => {
            const { errors } = event;
            cb(errors);
        });
    }

    /**
     * Subscribes to the `commandStack.changed` event on the modeler's event bus.
     *
     * @param cb Callback invoked whenever the command stack changes.
     * @throws {NoModelerError} If the modeler has not been created yet.
     */
    onCommandStackChanged(cb: () => void): void {
        this.getModeler().get<any>("eventBus").on("commandStack.changed", cb);
    }

    /**
     * Creates a new, empty BPMN diagram in the modeler.
     *
     * @returns {@link ImportXMLResult} with any warnings produced during import.
     * @throws {NoModelerError} If the modeler has not been created yet.
     */
    async newDiagram(): Promise<ImportXMLResult> {
        return this.getModeler().createDiagram();
    }

    /**
     * Loads the given BPMN XML into the modeler, replacing any current diagram.
     *
     * @param bpmn Raw BPMN 2.0 XML string.
     * @returns {@link ImportXMLResult} with any warnings produced during import.
     * @throws {NoModelerError} If the modeler has not been created yet.
     * @throws {Error} If the XML cannot be parsed.
     */
    async loadDiagram(bpmn: string): Promise<ImportXMLResult> {
        try {
            return await this.getModeler().importXML(bpmn);
        } catch (error: unknown) {
            if ((error as ImportXMLError).warnings) {
                const importError = error as ImportXMLError;
                throw new Error(`${importError.message} ${importError.warnings}`);
            }
            throw error;
        }
    }

    /**
     * Serialises the current diagram to a BPMN 2.0 XML string.
     *
     * @returns Formatted XML string.
     * @throws {NoModelerError} If the modeler has not been created yet.
     * @throws {Error} If the diagram cannot be serialised.
     */
    async exportDiagram(): Promise<string> {
        const result: SaveXMLResult = await this.getModeler().saveXML({ format: true });
        if (result.xml) {
            return result.xml;
        } else if (result.error) {
            throw result.error;
        }
        throw new Error("Failed to save changes made to the diagram!");
    }

    /**
     * Exports the current diagram as an SVG string.
     *
     * @returns SVG markup string.
     * @throws {NoModelerError} If the modeler has not been created yet.
     */
    async getDiagramSvg(): Promise<string> {
        const result = await this.getModeler().saveSVG();
        return result.svg;
    }

    /**
     * Pushes a new set of element templates to the modeler's template loader.
     *
     * @param templates Array of element template objects, or `undefined` (no-op).
     * @throws {NoModelerError} If the modeler has not been created yet.
     */
    setElementTemplates(templates: JSON[] | undefined): void {
        if (!templates) {
            return;
        }
        this.getModeler().get<any>("elementTemplatesLoader").setTemplates(templates);
    }

    /**
     * Applies a partial settings update and refreshes the active theme if needed.
     *
     * @param settings Partial settings object to merge, or `undefined` (no-op).
     * @throws {NoModelerError} If the modeler has not been created yet.
     */
    setSettings(settings: Partial<BpmnModelerSetting> | undefined): void {
        if (!settings) {
            return;
        }
        // Ensure the modeler exists before applying any settings.
        this.getModeler();
        this.settings = { ...this.settings, ...settings };
        this.setTheme();
    }

    /**
     * Triggers the align-to-origin plugin if the setting is enabled.
     *
     * @throws {NoModelerError} If the modeler has not been created yet.
     */
    alignElementsToOrigin(): void {
        if (this.settings.alignToOrigin) {
            this.getModeler().get<any>("alignToOrigin").align();
        }
    }

    // ─── Private helpers ──────────────────────────────────────────────────────

    /**
     * Switches the active theme CSS link between light and dark based on
     * {@link settings.darkTheme}.  Compares the current href to avoid
     * unnecessary DOM mutations.
     */
    private setTheme(): void {
        const theme = document.querySelector<HTMLLinkElement>("#theme-link");
        if (!theme) {
            console.error("Theme link element not found.");
            return;
        }

        const href = theme.href;
        const css = href.split("/").pop();

        if (this.settings.darkTheme && css === "lightTheme.css") {
            theme.href = href.replace(/lightTheme\.css$/, "darkTheme.css");
        } else if (!this.settings.darkTheme && css === "darkTheme.css") {
            theme.href = href.replace(/darkTheme\.css$/, "lightTheme.css");
        }
    }

    /**
     * Returns the modeler instance, throwing if it has not been created yet.
     *
     * @throws {NoModelerError} If {@link create} has not been called.
     */
    private getModeler(): Modeler {
        if (!this.modeler) {
            throw new NoModelerError();
        }
        return this.modeler;
    }
}

/** Thrown by {@link BpmnModeler.create} when an unknown engine string is passed. */
export class UnsupportedEngineError extends Error {
    /** @param engine The unrecognised engine string. */
    constructor(engine: string) {
        super(`Unsupported engine: ${engine}`);
    }
}
