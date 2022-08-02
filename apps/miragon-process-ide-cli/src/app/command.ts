import { Command } from "commander";
import { deployAllArtifacts, deployArtifact } from "@miragon-process-ide/digiwf-lib";

export function deployFileCommand(): Command {
    return new Command()
        .command("deploy-file")
        .description("deploys an artifact to the target environment")
        .requiredOption("-f --file <file>", "specify the file (full path)")
        .requiredOption("-t, --target <target>", "specify the target environment")
        .requiredOption("--type <type>", "specify the file type")
        .option("-p, --project <project>", "specify the project")
        .action((options) => {
            deployArtifact(options.file, options.type, options.project, options.target);
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
            deployAllArtifacts(options.directory, options.project, options.target);
        });
}
