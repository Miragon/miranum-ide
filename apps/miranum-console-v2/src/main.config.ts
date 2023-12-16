import { container, Lifecycle } from "tsyringe";
import {FilterWorkspacesUseCase} from "./application/usecases";
import {WorkspaceAdapter} from "./adapter/out";

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
        "FilterWorkspaceInPort",
        { useClass: FilterWorkspacesUseCase },
        { lifecycle: Lifecycle.Singleton },
    );
}

async function registerOutAdapter() {
    container.register(
        "WorkspaceOutPort",
        { useClass: WorkspaceAdapter },
        { lifecycle: Lifecycle.Singleton },
    );
}
