import { Command } from "commander";
import { deployAllFiles, deployFile } from "./app/deployment/api";
import { generateFile, generateProject } from "./app/generate/api";
import * as colors from "colors";

const program = new Command();
program
    .name("Miranum CLI")
    .description(
        colors.green.bold(`
███╗   ███╗██╗██████╗  █████╗ ███╗   ██╗██╗   ██╗███╗   ███╗
████╗ ████║██║██╔══██╗██╔══██╗████╗  ██║██║   ██║████╗ ████║
██╔████╔██║██║██████╔╝███████║██╔██╗ ██║██║   ██║██╔████╔██║
██║╚██╔╝██║██║██╔══██╗██╔══██║██║╚██╗██║██║   ██║██║╚██╔╝██║
██║ ╚═╝ ██║██║██║  ██║██║  ██║██║ ╚████║╚██████╔╝██║ ╚═╝ ██║
╚═╝     ╚═╝╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝ ╚═╝     ╚═╝

██╗██████╗ ███████╗
██║██╔══██╗██╔════╝
██║██║  ██║█████╗
██║██║  ██║██╔══╝
██║██████╔╝███████╗
╚═╝╚═════╝ ╚══════╝
`),
    )
    .version("0.0.1");

program.addCommand(deployFile());
program.addCommand(deployAllFiles());
program.addCommand(generateFile());
program.addCommand(generateProject());
program.parse();
