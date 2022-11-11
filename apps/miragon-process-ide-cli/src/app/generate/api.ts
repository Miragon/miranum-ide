import { Command } from "commander";
import { ProjectGenerator } from "./generate";

const generate = new ProjectGenerator();

export function generateProject(): Command {
    return new Command()
        .command("generate-project")
        .description("generates a project foundation")
        .requiredOption("-n, --name <name>", "specify the project name")
        .option("-p, --path <filepath>", "specify the targeted path")
        .action((options) => {
            generate.generateProject(options.name, options.path)
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
        .description("generates a process model")
        .requiredOption("-t --type <type>", "specify the file type that is to be generated")
        .requiredOption("-n, --name <name>", "specify the name")
        .requiredOption("-p, --path <filepath>", "specify the targeted path")
        .option("--template <filepath>", "specify a custom template that is to be used")
        .option("-d --data <data>", "specify the data that is to be used for your template")
        .action((options) => {
            generate.generateFile(options.name, options.type, options.path, options.template, options.data)
                .then(() => console.log(`Successfully created file ${options.name}`))
                .catch(err => {
                    console.log(`File ${options.name} could not be created`);
                    console.log(err);
                });
        });
}
