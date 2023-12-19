import { container, Lifecycle } from "tsyringe";

import {
    CreateWebviewUseCase,
    GetMiranumWorkspacesUseCase,
    SendPathForNewProjectUseCase,
    OpenWorkspaceUseCase,
} from "./application/usecases";
import { FilePickerAdapter, WebviewAdapter, WorkspaceAdapter } from "./adapter/out";

export async function config(): Promise<boolean> {
    try {
        await Promise.all([registerUseCases(), registerOutAdapter()]);
        return true;
    } catch (error) {
        console.error(error);
        return false;
    }
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
        "SendPathForNewProjectInPort",
        { useClass: SendPathForNewProjectUseCase },
        { lifecycle: Lifecycle.Singleton },
    );
    container.register(
        "OpenWorkspaceInPort",
        { useClass: OpenWorkspaceUseCase },
        { lifecycle: Lifecycle.Singleton },
    );
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
}
