import { Command } from "commander";
import {
    deployAllFiles,
    deployFileCommand,
    generate,
    generateProject,
    generateProjectThroughStructure
} from "./app/command";


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
program.addCommand(deployFileCommand());
program.addCommand(deployAllFiles());
program.addCommand(generate());
program.addCommand(generateProject());
program.addCommand(generateProjectThroughStructure());
program.parse();
