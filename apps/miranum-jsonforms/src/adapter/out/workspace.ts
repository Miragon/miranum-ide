import { Uri, workspace } from "vscode";
import {
    CreateFileOutPort,
    FormPreviewSettingsOutPort,
} from "../../application/ports/out";

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

export class VsCodeFileSystemAdapter implements CreateFileOutPort {
    private readonly fs = workspace.fs;

    async write(content: string, filePath: string) {
        const uri = Uri.file(filePath);
        return this.fs.writeFile(uri, Buffer.from(content, "utf8"));
    }
}
