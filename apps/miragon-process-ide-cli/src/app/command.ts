import { Command, InvalidArgumentError } from "commander";
import { Success, DigiwfConfig, DigiwfLib } from "@miragon-process-ide/digiwf-lib";
import { DigiwfDeploymentPluginRest } from "@miragon-process-ide/digiwf-deployment-plugin-rest";

const environments = [
    {
        name: "local",
        url: "http://localhost:8080"
    },
    {
        name: "dev",
        url: "http://localhost:8080"
    },
    {
        name: "test",
        url: "http://localhost:8080"
    }
];

const config: DigiwfConfig = {
    deploymentPlugins: [
        {
            name: "dry",
            targetEnvironments: environments,
            deploy: function(target: string) {
                return new Promise<Success>(resolve => resolve({
                    success: true,
                    message: `Deployed to ${target}`
                }));
            }
        },
        new DigiwfDeploymentPluginRest("rest", environments)
    ]
};
const digiwfLib = new DigiwfLib(config);


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
                .then( () => console.log("Successfully deployed file " + options.file))
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
                .then( () => console.log("Successfully deployed " + options.directory))
                .catch(err => console.error(err));
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
            digiwfLib.generateFile(options.type, options.name, options.path, options.template, options.data)
                .then(() => console.log("Successfully generated file " + options.name))
                .catch(err => console.error(err));
        });
}

/**
 * generically generates a project foundation based on resources/templates/basicProjectTemplat
 */
export function generateProject(): Command {
    return new Command()
        .command("generate-project")
        .description("generates a project foundation")
        .requiredOption("-n, --name <name>", "specify the project name")
        .option("-p, --path <filepath>", "specify the targeted path")
        .option ("-f --force", "force overwriting the project")
        .action((options) => {
            digiwfLib.generateProject(options.name, options.path, options.force)
                .then(() => console.log("Successfully generated project " + options.name))
                .catch(err => console.error(err));
        });
}
