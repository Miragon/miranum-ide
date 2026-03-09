/**
 * Base message abstractions for the VS Code extension ↔ webview communication protocol.
 *
 * Defines the two foundational message directions:
 * - {@link Query}   — extension host → webview (carries data to display or settings to apply)
 * - {@link Command} — webview → extension host (requests an action or reports a state change)
 *
 * Also contains cross-cutting concrete commands that are not specific to any one
 * modeler feature:
 * - {@link SyncDocumentCommand} — webview notifies the host to persist the current XML to disk
 * - {@link LogInfoCommand} / {@link LogErrorCommand} — webview forwards log entries to the host's output channel
 *
 * @see modeler.ts for the modeler-specific Query and Command implementations that
 * extend these base classes.
 */
interface MessageType {
    type: string;
}

export abstract class Query implements MessageType {
    public readonly type: string;

    protected constructor(type: string) {
        this.type = type;
    }
}

export abstract class Command implements MessageType {
    public readonly type: string;

    protected constructor(type: string) {
        this.type = type;
    }
}

export class SyncDocumentCommand extends Command {
    public readonly content: string;

    constructor(content: string) {
        super("SyncDocumentCommand");
        this.content = content;
    }
}

export class LogMessageCommand implements Command {
    public readonly type: string = "LogMessageCommand";

    public readonly message: string;

    constructor(log: string) {
        this.message = log;
    }
}

export class LogInfoCommand extends LogMessageCommand {
    public override readonly type: string = "LogInfoCommand";
}

export class LogErrorCommand extends LogMessageCommand {
    public override readonly type: string = "LogErrorCommand";
}
