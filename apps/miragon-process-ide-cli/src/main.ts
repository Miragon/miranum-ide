import { Command } from "commander";
import { getFile } from "./app/shared/fs";
import * as colors from "colors";
import { createDigiwfLib, DigiWFDeploymentPlugin, DigiwfDeploymentPluginRest } from "@miragon-process-ide/digiwf-lib";
import { DeploymentCommand } from "./app/deployment/api";
import { GenerateCommand } from "./app/generate/api";


const program = new Command();
program
    .name("Miragon Process IDE CLI")
    .description(`
  __  __ _                               _____                               _____ _____  ______
 |  \\/  (_)                             |  __ \\                             |_   _|  __ \\|  ____|
 | \\  / |_ _ __ __ _  __ _  ___  _ __   | |__) | __ ___   ___ ___  ___ ___    | | | |  | | |__
 | |\\/| | | '__/ _\` |/ _\` |/ _ \\| '_ \\  |  ___/ '__/ _ \\ / __/ _ \\/ __/ __|   | | | |  | |  __|
 | |  | | | | | (_| | (_| | (_) | | | | | |   | | | (_) | (_|  __/\\__ \\__ \\  _| |_| |__| | |____
 |_|  |_|_|_|  \\__,_|\\__, |\\___/|_| |_| |_|   |_|  \\___/ \\___\\___||___/___/ |_____|_____/|______|
                      __/ |
                     |___/
`)
    .version("0.0.1");

getFile("process-ide.json")
    .then(processIdeJson => {
        const processIdeConfig = JSON.parse(processIdeJson.content);
        const plugins: DigiWFDeploymentPlugin[] = [];
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        processIdeConfig.deployment.forEach(p => {
           plugins.push(new DigiwfDeploymentPluginRest(p.plugin, p.targetEnvironments));
        });
        const digiwf = createDigiwfLib(processIdeConfig.projectVersion, processIdeConfig.name, processIdeConfig.workspace, plugins);
        const deployment = new DeploymentCommand(digiwf);
        const generate = new GenerateCommand(digiwf)
        program.addCommand(deployment.deployFileCommand());
        program.addCommand(deployment.deployAllFiles());
        program.addCommand(generate.generateFile());
        program.addCommand(generate.generateProject());
    })
    .catch(err => {
        console.log(colors.red.bold("ERROR ") + "You are not inside a valid project. Make sure process-ide.json exists.");
    })
    .finally(() =>{
        program.parse()
    });
