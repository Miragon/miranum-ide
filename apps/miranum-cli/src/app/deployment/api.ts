import { Command, InvalidArgumentError } from "commander";
import { Deployment } from "./deployment";
import * as colors from "colors";
import { mapProcessConfigToDigiwfLib } from "../shared/fs";

/**
 * This command deploys an artifact to the target environment.
 * An artefact consists out of a type (string), a project (string), and a file
 * The file in itself consist out of a name, an extension, some content, a size, and a path
 *
 * @example
 * ``` bash
 * deploy-file -f file/path.type -t local --type bpmn
 * ```
 *
 * @options
 * ``` bash
 * # required
 * -f or --file         <file>      :   "specify the file in your project"
 * -t or --target       <target>    :   "specify the target environment"
 * --type               <type>      :   "specify the file type"
 * ```
 */
export function deployFile(): Command {
    return new Command()
        .command("deploy-file")
        .description("deploys an artifact to the target environment")
        .requiredOption("-f --file <file>", "specify the file in your project")
        .requiredOption("-t, --target <target>", "specify the target environment")
        .requiredOption("--type <type>", "specify the file type")
        .hook("preAction", (thisCommand) => {
            // validate inputs before action is called
            const type = thisCommand.opts().type;
            if (!(type === "bpmn" || type === "dmn" || type === "form" || type === "config")) {
                throw new InvalidArgumentError("type must be either bpmn, dmn, form or config");
            }
        })
        .action((options) => {
            mapProcessConfigToDigiwfLib().then(digiwfLib => {
                const deployment =  new Deployment(digiwfLib);
                deployment.deployArtifact(options.file, options.type, options.target)
                    .then( () => console.log("Deployment was successfully"))
                    .catch(err => console.log(colors.red.bold("FAILED") + ` with -> ${err}`));
            });
        });
}

/**
 * This command deploys all artifact to the target environment.
 * Therefore, it uses the same deploy method as the deployFileCommand.
 *
 * @example
 * ``` bash
 * deploy-all -d path/to/directory -t local
 * ```
 *
 * @options
 * ``` bash
 * # required
 * -d or --directory    <directory> :   "specify the directory of the source files"
 * -t or --target       <target>    :   "specify the target environment"
 * ```
 */
export function deployAllFiles(): Command {
    return new Command()
        .command("deploy")
        .description("deploys all artifacts to the target environment")
        .requiredOption("-d --directory <directory>", "specify the directory of the source files")
        .requiredOption("-t, --target <target>", "specify the target environment")
        .action((options) => {
            mapProcessConfigToDigiwfLib(options.directory).then(digiwfLib => {
                const deployment =  new Deployment(digiwfLib);
                deployment.deployAllArtifacts(options.directory, options.target)
                    .then( () => console.log(`Project ${digiwfLib.projectConfig?.name} was successfully deployed to environment ${options.target}`))
                    .catch(err => console.log(colors.red.bold("FAILED") + ` with -> ${err}`));
            });
        });
}
