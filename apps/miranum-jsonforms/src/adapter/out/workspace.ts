import { Uri, workspace } from "vscode";
import { singleton } from "tsyringe";
import {
    CreateFileOutPort,
    FormPreviewSettingsOutPort,
} from "../../application/ports/out";

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

@singleton()
export class VsCodeFileSystemAdapter implements CreateFileOutPort {
    private readonly fs = workspace.fs;

    async write(content: string, filePath: string) {
        const uri = Uri.file(filePath);
        return this.fs.writeFile(uri, Buffer.from(content, "utf8"));
    }
}
