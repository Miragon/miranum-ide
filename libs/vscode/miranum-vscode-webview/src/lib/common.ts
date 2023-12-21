// Commands
export class LogMessageCommand {
    public readonly message: string;

    constructor(log: string) {
        this.message = log;
    }
}

export class LogInfoCommand extends LogMessageCommand {}

export class LogErrorCommand extends LogMessageCommand {}
