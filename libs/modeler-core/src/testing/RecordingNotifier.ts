import { NotifierPort } from "../shared/domain/hostPorts";

export type LogLevel = "debug" | "info" | "warning" | "error";

export interface LogEntry {
    readonly level: LogLevel;
    readonly message: string;
}

export class RecordingNotifier implements NotifierPort {
    readonly infos: string[] = [];
    readonly errors: string[] = [];
    readonly logs: LogEntry[] = [];
    readonly openedDocuments: string[] = [];
    readonly progressTitles: string[] = [];
    loggingConsoleOpened = false;

    logged(level: LogLevel): string[] {
        return this.logs.filter((entry) => entry.level === level).map((entry) => entry.message);
    }

    logDebug(message: string): void {
        this.logs.push({ level: "debug", message });
    }

    logInfo(message: string): void {
        this.logs.push({ level: "info", message });
    }

    logWarning(message: string): void {
        this.logs.push({ level: "warning", message });
    }

    logError(error: string | Error): void {
        this.logs.push({
            level: "error",
            message: typeof error === "string" ? error : error.message,
        });
    }

    showInfo(message: string): void {
        this.infos.push(message);
    }

    showError(message: string): void {
        this.errors.push(message);
    }

    notifyError(context: string, error: Error): void {
        this.logError(error);
        this.showError(`${context}\n${error.message}`);
    }

    openLoggingConsole(): void {
        this.loggingConsoleOpened = true;
    }

    withProgress<T>(title: string, task: () => Promise<T>): Promise<T> {
        this.progressTitles.push(title);
        return task();
    }

    async openDocument(absolutePath: string): Promise<void> {
        this.openedDocuments.push(absolutePath);
    }
}
