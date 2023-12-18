import { container, Lifecycle } from "tsyringe";

import { GetMiranumWorkspacesUseCase } from "./application/usecases";
import { WebviewAdapter, WorkspaceAdapter } from "./adapter/out";

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
        { useClass: GetMiranumWorkspacesUseCase },
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
}
