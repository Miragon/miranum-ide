import { inject, singleton } from "tsyringe";

import { SplitFileInPort } from "../ports/in";
import {
    CreateFileOutPort,
    DisplayMessageOutPort,
    DocumentOutPort,
    LogMessageOutPort,
} from "../ports/out";

@singleton()
export class SplitJsonFormUseCase implements SplitFileInPort {
    constructor(
        @inject("DocumentOutPort")
        private readonly documentOutPort: DocumentOutPort,
        @inject("CreateFileOutPort")
        private readonly createFileOutPort: CreateFileOutPort,
        @inject("DisplayMessageOutPort")
        protected readonly displayMessageOutPort: DisplayMessageOutPort,
        @inject("LogMessageOutPort")
        private readonly logMessageOutPort: LogMessageOutPort,
    ) {}

    async split(): Promise<boolean> {
        const jsonFormPath = this.documentOutPort.getFilePath();

        const dir = jsonFormPath.split("/").slice(0, -1).join("/");
        let fileName = jsonFormPath.split("/").pop()?.split(".")[0];
        if (!fileName) {
            fileName = new Date(Date.now()).toJSON();
        }

        try {
            const jsonFormContent = JSON.parse(this.documentOutPort.getContent());
            const schema = JSON.stringify(jsonFormContent.schema, null, 4);
            const uischema = JSON.stringify(jsonFormContent.uischema, null, 4);

            await Promise.all([
                this.createFileOutPort.write(schema, `${dir}/${fileName}.schema.json`),
                this.createFileOutPort.write(
                    uischema,
                    `${dir}/${fileName}.uischema.json`,
                ),
            ]);

            return true;
        } catch (error) {
            this.handleError(error as Error);
            return false;
        }
    }

    private handleError(error: Error) {
        this.logMessageOutPort.error(error as Error);
        this.displayMessageOutPort.error(
            `A problem occurred while trying to split the JsonForm file. ${
                (error as Error).message ?? error
            }`,
        );
    }
}
