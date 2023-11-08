import "reflect-metadata";
import { ReaderOutPort } from "./portsOut";
import { ReadJsonFormQuery } from "./portsIn";
import { ReadJsonFormUseCase } from "./usecases";

describe("Read Json Schema and UI Schema", () => {
    const directory = new Map([
        ["my/base/path/to/s3.schema.json", "JSON Schema was read!"],
        ["my/base/path/to/s3.uischema.json", "UI Schema was read!"],
    ]);
    const reader: ReaderOutPort = {
        readFile(fileName: string): Promise<string> {
            return Promise.resolve(directory.get(fileName) ?? "");
        },
    };

    it("should work", async () => {
        const readJsonFormUseCase = new ReadJsonFormUseCase(reader);
        const query = new ReadJsonFormQuery("my-form.s3.config.json", "my/base/path/to");

        const files = readJsonFormUseCase.readJsonForm(query);
        const schema = await files.get("schema");
        const uiSchema = await files.get("uischema");

        expect(schema).toBe("JSON Schema was read!");
        expect(uiSchema).toBe("UI Schema was read!");
    });
});
