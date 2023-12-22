interface MessageType {
    type: string;
}

// Queries
export type Query = MessageType;

export class ImagePath {
    public readonly id: string;

    public readonly path: string;

    constructor(id: string, path: string) {
        this.id = id;
        this.path = path;
    }
}

export class ImagePathQuery implements Query {
    public readonly type: string = "ImagePathQuery";

    public readonly images: ImagePath[];

    constructor(images: ImagePath[]) {
        this.images = images;
    }
}

// Commands
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

export class GetImagePathCommand implements Command {
    public readonly type: string = "GetImagePathCommand";
}
