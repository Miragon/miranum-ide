import * as vscode from "vscode";
import {
    checkIfSupportedType,
    MiranumCore,
    MiranumDeploymentPlugin,
    MiranumDeploymentTarget,
} from "@miranum-ide/miranum-core";
import { Logger } from "@miranum-ide/vscode/miranum-vscode";
import { showInfoMessage } from "../shared/message";
import { getArtifact, getArtifacts } from "../shared/fs-helpers";

export async function registerDeploymentCommands(
    context: vscode.ExtensionContext,
    miranumCore: MiranumCore,
): Promise<vscode.Disposable[]> {
    // raise error if miranumCore is initialized in light mode (not supporting deployment)
    if (!miranumCore.projectConfig) {
        const errMsg =
            "[Miranum.Console] miranum.json does not exist in current directory or is invalid. Make sure to provide a valid miranum.json to enable deployment options";
        Logger.error(errMsg);
        throw new Error(errMsg);
    }

    const commands: vscode.Disposable[] = [];

    miranumCore.projectConfig?.deployment.forEach(
        (deploymentPlugin: MiranumDeploymentPlugin) => {
            deploymentPlugin.targetEnvironments.forEach(
                (env: MiranumDeploymentTarget) => {
                    // deploy single file
                    const deployFileCommand = vscode.commands.registerCommand(
                        `miranum.deploy.${env.name}`,
                        async (path: vscode.Uri) => {
                            let artifact = await getArtifact(
                                path,
                                miranumCore.projectConfig?.name,
                            );
                            try {
                                artifact = await miranumCore.deploy(env.name, artifact);
                                showInfoMessage(
                                    `DEPLOYED ${artifact.file.name} to environment ${env.name}`,
                                );
                            } catch (err) {
                                console.log(
                                    `FAILED deploying ${artifact.file.name} with -> ${err}`,
                                );
                                showInfoMessage(
                                    `FAILED deploying ${artifact.file.name} with -> ${err}`,
                                );
                            }
                        },
                    );
                    commands.push(deployFileCommand);

                    // deploy project
                    const deployProjectCommand = vscode.commands.registerCommand(
                        `miranum.deployAll.${env.name}`,
                        async (path: vscode.Uri) => {
                            const artifacts = await getArtifacts(
                                path,
                                miranumCore.projectConfig?.name,
                            );
                            for (const artifact of artifacts) {
                                try {
                                    if (checkIfSupportedType(artifact.type)) {
                                        await miranumCore.deploy(env.name, artifact);
                                        showInfoMessage(
                                            `DEPLOYED ${artifact.file.name} to environment ${env.name}`,
                                        );
                                    }
                                } catch (err) {
                                    console.log(
                                        `FAILED deploying ${artifact.file.name} with -> ${err}`,
                                    );
                                    showInfoMessage(
                                        `FAILED deploying ${artifact.file.name} with -> ${err}`,
                                    );
                                }
                            }
                        },
                    );
                    commands.push(deployProjectCommand);
                },
            );
        },
    );
    return commands;
}
