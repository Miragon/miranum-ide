import { Command, InvalidArgumentError } from "commander";
import { Deployment } from "./deployment";
import * as colors from "colors";
import { DigiwfLib } from "@miragon-process-ide/digiwf-lib";

export class DeploymentCommand {
    private deployment: Deployment;

    constructor(digiwfLib: DigiwfLib) {
        this.deployment = new Deployment(digiwfLib);
    }

    public deployFileCommand(): Command {
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
                this.deployment.deployArtifact(options.file, options.type, options.project, options.target)
                    .then( () => console.log("Deployment was successfully"))
                    .catch(err => console.log(colors.red.bold("FAILED") + ` with -> ${err}`));
            });
    }

    public deployAllFiles(): Command {
        return new Command()
            .command("deploy-all")
            .description("deploys all artifacts to the target environment")
            .requiredOption("-d --directory <directory>", "specify the directory of the source files")
            .requiredOption("-t, --target <target>", "specify the target environment")
            .option("-p, --project <project>", "specify the project")
            .action((options) => {
                this.deployment.deployAllArtifacts(options.directory, options.project, options.target)
                    .then( () => console.log(`Project ${options.project} was successfully deployed to environment ${options.target}`))
                    .catch(err => console.log(colors.red.bold("FAILED") + ` with -> ${err}`));
            });
    }

}
