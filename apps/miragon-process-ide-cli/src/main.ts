import { Command } from "commander";
import { deployFile } from "@miragon-process-ide/digiwf-lib";

function deploymentCommand(): Command {
    return new Command()
        .command("deployment <file> <type> <project> [target]")
        .description("deploys an artifact to the target environment")
        .action((file, type, project, target) => {
            const artifact = {
                type: type,
                path: file,
                fileName: file,
                project: project
            }
            const deployment = {
                artifact: artifact,
                target: target
            }
            deployFile(deployment);
        });
}


const program = new Command();

program
    .name("Miragon Process IDE cli")
    .description("tbd.")
    .version("0.0.1");
program.addCommand(deploymentCommand());
program.parse();
