import { Command, InvalidArgumentError } from "commander";
import { DigiwfLib } from "@miragon-process-ide/digiwf-lib";

const digiwfLib = new DigiwfLib();

export function deployFileCommand(): Command {
    return new Command()
        .command("deploy-file")
        .description("deploys an artifact to the target environment")
        .requiredOption("-f --file <file>", "specify the file (full path)")
        .requiredOption("-t, --target <target>", "specify the target environment")
        .requiredOption("--type <type>", "specify the file type")
        .option("-p, --project <project>", "specify the project")
        .hook("preAction", (thisCommand) => {
            // validate inputs before action is called
            const type = thisCommand.opts()["type"];
            if (!(type === "bpmn" || type === "dmn" || type === "form" || type === "config")) {
                throw new InvalidArgumentError("type must be either bpmn, dmn, form or config");
            }
        })
        .action((options) => {
            digiwfLib.deployArtifact(options.file, options.type, options.project, options.target)
                .then(artifact => console.log(artifact))
                .catch(err => console.error(err));
        });
}

export function deployAllFiles(): Command {
    return new Command()
        .command("deploy-all")
        .description("deploys all artifacts to the target environment")
        .requiredOption("-d --directory <directory>", "specify the directory of the source files")
        .requiredOption("-t, --target <target>", "specify the target environment")
        .option("-p, --project <project>", "specify the project")
        .action((options) => {
            digiwfLib.deployAllArtifacts(options.directory, options.project, options.target)
                .then(artifacts => console.log(artifacts))
                .catch(err => console.error(err));
        });
}
