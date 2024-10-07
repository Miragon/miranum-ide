import { Command } from "commander";

interface FileHelper {
    nameExt: string;
    path: string;
    type: string;
}

export const pathToProject = "resources/my-process-automation-project";

export const filesToDeploy: FileHelper[] = [
    {
        nameExt: "my-process.bpmn",
        path: "resources/my-process-automation-project/my-process.bpmn",
        type: "bpmn",
    },
    {
        nameExt: "dmn-table.dmn",
        path: "resources/my-process-automation-project/dmn-table.dmn",
        type: "dmn",
    },
    {
        nameExt: "StartFormular.form",
        path: "resources/my-process-automation-project/forms/StartFormular.form",
        type: "form",
    },
    {
        nameExt: "KontrollFormular.json",
        path: "resources/my-process-automation-project/my-other-forms/KontrollFormular.json",
        type: "form",
    },
    {
        nameExt: "dev-process.config.json",
        path: "resources/my-process-automation-project/configs/dev-process.config.json",
        type: "config",
    },
];

export function shouldNotWork(
    program: Command,
    command: string,
    argv: readonly string[],
    error: string,
) {
    program
        .exitOverride()
        .command(command)
        .action(() => {});
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    expect(() => {
        program.parse(argv);
    }).toThrow(error);
}

export async function sleep(time: number) {
    await new Promise((r) => setTimeout(r, time));
}
