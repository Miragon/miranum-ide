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
