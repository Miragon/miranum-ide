import { workspace } from "vscode";
import { singleton } from "tsyringe";
import { FormPreviewSettingsOutPort } from "../../application/ports/out";

@singleton()
export class VsCodeFormPreviewSettingsAdapter implements FormPreviewSettingsOutPort {
    getRenderer(): string {
        const setting = workspace
            .getConfiguration("miranumIDE.jsonforms")
            .get<string>("renderer");

        if (!setting) {
            return "vuetify";
        }

        return setting;
    }
}
