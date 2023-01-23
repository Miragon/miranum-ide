import { Command } from "commander";
import { ProjectGenerator } from "./generate";
import { MiranumCore } from "@miranum-ide/miranum-core";
import { mapProcessConfigToDigiwfLib } from "../shared/fs";

export function generateProject(): Command {
    return new Command()
        .command("generate")
        .description("generates a project foundation")
        .requiredOption("-n, --name <name>", "specify the project name")
        .option("-p, --path <filepath>", "specify the targeted path")
        .action((options) => {
            const generate = new ProjectGenerator(new MiranumCore());
            generate.generateProject(options.name, `${options.path}/${options.name}`)
                .then(() => console.log(`Successfully generated project ${options.name}`))
                .catch(err => {
                    console.log(`Project ${options.name} could not be created`);
                    console.log(err);
                });
        });
}

export function generateFile(): Command {
    return new Command()
        .command("generate-file")
        .description("generates a process artifact")
        .requiredOption("-t --type <type>", "specify the file type that is to be generated")
        .requiredOption("-n, --name <name>", "specify the name")
        .requiredOption("-p, --path <filepath>", "specify the targeted path")
        .action((options) => {
            mapProcessConfigToDigiwfLib(options.path).then(digiwfLib => {
                const generate = new ProjectGenerator(digiwfLib);
                generate.generateFile(options.name, options.type, options.path)
                    .then(() => console.log(`Successfully created file ${options.name}`))
                    .catch(err => {
                        console.log(`File ${options.name} could not be created`);
                        console.log(err);
                    });
            })
        });
}
