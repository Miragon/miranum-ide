import { Command, InvalidArgumentError } from "commander";
import { DeploymentSuccess, DigiwfConfig, DigiwfLib } from "@miragon-process-ide/digiwf-lib";
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
                return new Promise<DeploymentSuccess>(resolve => resolve({
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
                .then(deploymentSuccess => console.log(deploymentSuccess))
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
                .then(deploymentSuccess => console.log(deploymentSuccess))
                .catch(err => console.error(err));
        });
}

export function generate(): Command {
    return new Command()
        .command("generate")
        .description("generates a process model")
        .requiredOption("-t --type <type>", "specify the file type that is to be generated")
        .requiredOption("-n, --name <name>", "specify the name")
        .requiredOption("-p, --path <filepath>", "specify the targeted path")
        .option("-b, --base <filepath>", "specify the template it's based on")
        .action((options) => {
            digiwfLib.generateProcess(options.type, options.name, options.path, options.base)
                .then(deploymentSuccess => console.log(deploymentSuccess))
                .catch(err => console.error(err));
        });
}
