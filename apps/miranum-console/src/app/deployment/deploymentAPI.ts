import * as vscode from "vscode";
import {MiranumDeploymentPlugin, MiranumDeploymentTarget, MiranumCore} from "@miranum-ide/miranum-core";
import {fileDeploymentSupported, getArtifact, getArtifacts} from "./deployment";

export function createDeployment(context: vscode.ExtensionContext, digiwfLib: MiranumCore) {
    digiwfLib.projectConfig?.deployment.forEach((deployment: MiranumDeploymentPlugin) => {
        deployment.targetEnvironments.forEach((env: MiranumDeploymentTarget) => {
            // deploy artifact
            const deployArtifactCommand = vscode.commands.registerCommand(`miranum.deploy.${env.name}`, async (path: vscode.Uri) => {
                let artifact = await getArtifact(path);
                try {
                    artifact = await digiwfLib.deploy(env.name, artifact);
                    vscode.window.showInformationMessage(`DEPLOYED ${artifact.file.name} to environment ${env.name}`);
                } catch(err: any) {
                    console.log(`FAILED deploying ${artifact.file.name} with -> ${err}`);
                    vscode.window.showInformationMessage(err.msg);
                }
            });
            context.subscriptions.push(deployArtifactCommand);

            // deploy project
            const deployAllCommand = vscode.commands.registerCommand(`miranum.deployAll.${env.name}`, async (path: vscode.Uri) => {
                const artifacts = await getArtifacts(path);
                console.log(artifacts);
                for (const artifact of artifacts) {
                    try {
                        if (fileDeploymentSupported(artifact)) {
                            await digiwfLib.deploy(env.name, artifact);
                            vscode.window.showInformationMessage(`DEPLOYED ${artifact.file.name} to environment ${env.name}`);
                        }
                    } catch(err: any) {
                        console.log(`FAILED deploying ${artifact.file.name} with -> ${err}`);
                        vscode.window.showInformationMessage(err.msg);
                    }
                }
            });
            context.subscriptions.push(deployAllCommand);
        });
    });
}
