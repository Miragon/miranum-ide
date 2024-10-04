import { Command } from "commander";
import { ProjectGenerator } from "./generate";
import { MiranumCore } from "@miranum-ide/miranum-core";
import { mapProcessConfigToDigiwfLib } from "../shared/fs";

/**
 * This command generates a file for a supported type.
 * Supported types can be found and edited in the miranum.json.
 * By default, we support the types: bpmn, dmn, form, config, element-template
 *
 * @example
 * ``` bash
 * generate-file -t bpmn -n testForm.form -p path/toBe
 * ```
 *
 * @options
 * ``` bash
 * # required
 * -t or --type <type>: "specify the file type that is to be generated"
 * -n or --name <name>: "specify the name"
 * -p or --path <filepath>: "specify the targeted path"
 * ```
 */
export function generateFile(): Command {
    return new Command()
        .command("generate-file")
        .description("generates a process artifact")
        .requiredOption(
            "-t, --type <type>",
            "specify the file type that is to be generated",
        )
        .requiredOption("-n, --name <name>", "specify the name")
        .requiredOption("-p, --path <filepath>", "specify the targeted path")
        .action((options) => {
            mapProcessConfigToDigiwfLib(options.path).then((digiwfLib) => {
                const generate = new ProjectGenerator(digiwfLib);
                generate
                    .generateFile(options.name, options.type, options.path)
                    .then(() => console.log(`Successfully created file ${options.name}`))
                    .catch((err) => {
                        console.log(`File ${options.name} could not be created`);
                        console.log(err);
                    });
            });
        });
}

/**
 * this command generates a bpmn project with all necessary form-/config-files and element-templates.
 * The bpmn project is based on the structure [miranum](https://github.com/Miragon/miranum-ide/tree/main/resources/templates/project-template) suggests.
 * The user has the possibility to select a certain destination directory with -p.
 *
 * @example
 * ``` bash
 * generate-project -n MyProject -p path/of/Destination
 * ```
 *
 * @options
 * ``` bash
 * # required
 * -n or --name <name>: "specify the project name"
 *
 * # optional
 * -p or --path <filepath>: "specify the targeted path"
 * ```
 */
export function generateProject(): Command {
    return new Command()
        .command("generate")
        .description("generates a project foundation")
        .requiredOption("-n, --name <name>", "specify the project name")
        .option("-p, --path <filepath>", "specify the targeted path")
        .action((options) => {
            const generate = new ProjectGenerator(new MiranumCore());
            generate
                .generateProject(options.name, `${options.path}/${options.name}`)
                .then(() =>
                    console.log(`Successfully generated project ${options.name}`),
                )
                .catch((err) => {
                    console.log(`Project ${options.name} could not be created`);
                    console.log(err);
                });
        });
}
