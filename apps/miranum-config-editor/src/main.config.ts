import { container, Lifecycle } from "tsyringe";

import {
    InitWebviewUseCase,
    SyncDocumentUseCase,
    SyncWebviewUseCase,
} from "./application/usecases";
import { DocumentAdapter, WebviewAdapter } from "./adapter/adapterOut";

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
        "InitWebviewInPort",
        { useClass: InitWebviewUseCase },
        { lifecycle: Lifecycle.Singleton },
    );
    container.register(
        "SyncWebviewInPort",
        { useClass: SyncWebviewUseCase },
        { lifecycle: Lifecycle.Singleton },
    );
    container.register(
        "SyncDocumentInPort",
        { useClass: SyncDocumentUseCase },
        { lifecycle: Lifecycle.Singleton },
    );
}

async function registerOutAdapter() {
    container.register(
        "WebviewOutPort",
        { useClass: WebviewAdapter },
        { lifecycle: Lifecycle.Singleton },
    );
    container.register(
        "DocumentOutPort",
        { useClass: DocumentAdapter },
        { lifecycle: Lifecycle.Singleton },
    );
}
