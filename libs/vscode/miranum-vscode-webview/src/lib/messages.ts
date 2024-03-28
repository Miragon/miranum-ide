interface MessageType {
    type: string;
}

export type Query = MessageType;
export type Command = MessageType;

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
