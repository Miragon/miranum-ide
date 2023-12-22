import { container, Lifecycle } from "tsyringe";

import {
    CreateMiranumWorkspaceUseCase,
    CreateWebviewUseCase,
    GetMiranumWorkspacesUseCase,
    OpenMiranumWorkspaceUseCase,
    SendPathForNewWorkspaceUseCase,
} from "./application/usecases";
import {
    FilePickerAdapter,
    WebviewAdapter,
    WorkspaceAdapter,
} from "./adapter/out/vscode";
import { MiranumCliAdapter } from "./adapter/out/miranum-cli";

export async function config(): Promise<boolean> {
    try {
        await Promise.all([
            registerPrimitiveValues(),
            registerOutAdapter(),
            registerUseCases(),
        ]);
        return true;
    } catch (error) {
        console.error(error);
        return false;
    }
}

async function registerPrimitiveValues() {
    container.register("MaxLatestWorkspaces", { useValue: 10 });
    container.register("WebviewPath", { useValue: "miranum-console-v2-webview" });
}

async function registerOutAdapter() {
    container.register(
        "WorkspaceOutPort",
        { useClass: WorkspaceAdapter },
        { lifecycle: Lifecycle.Singleton },
    );
    container.register(
        "WebviewOutPort",
        { useClass: WebviewAdapter },
        { lifecycle: Lifecycle.Singleton },
    );
    container.register(
        "FilePickerOutPort",
        { useClass: FilePickerAdapter },
        { lifecycle: Lifecycle.Singleton },
    );
    container.register(
        "MiranumCliOutPort",
        { useClass: MiranumCliAdapter },
        { lifecycle: Lifecycle.Singleton },
    );
}

async function registerUseCases() {
    container.register(
        "GetMiranumWorkspaceInPort",
        { useClass: GetMiranumWorkspacesUseCase },
        { lifecycle: Lifecycle.Singleton },
    );
    container.register(
        "CreateWebviewInPort",
        { useClass: CreateWebviewUseCase },
        { lifecycle: Lifecycle.Singleton },
    );
    container.register(
        "SendPathForNewWorkspaceInPort",
        { useClass: SendPathForNewWorkspaceUseCase },
        { lifecycle: Lifecycle.Singleton },
    );
    container.register(
        "OpenMiranumWorkspaceInPort",
        { useClass: OpenMiranumWorkspaceUseCase },
        { lifecycle: Lifecycle.Singleton },
    );
    container.register(
        "CreateMiranumWorkspaceInPort",
        { useClass: CreateMiranumWorkspaceUseCase },
        { lifecycle: Lifecycle.Singleton },
    );
}
