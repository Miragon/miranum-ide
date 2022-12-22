import * as vscode from "vscode";
import {
    MiranumDeploymentPlugin,
    MiranumDeploymentTarget,
    MiranumCore,
    checkIfSupportedType
} from "@miranum-ide/miranum-core";
import {Deployment} from "./deployment";

export function createDeployment(context: vscode.ExtensionContext, digiwfLib: MiranumCore) {
    digiwfLib.projectConfig?.deployment.forEach((deployment: MiranumDeploymentPlugin) => {
        deployment.targetEnvironments.forEach((env: MiranumDeploymentTarget) => {
            // deploy artifact
            const deployArtifactCommand = vscode.commands.registerCommand(`miranum.deploy.${env.name}`, async (path: vscode.Uri) => {
                const deployment =  new Deployment(digiwfLib);
                let artifact = await deployment.getArtifact(path);
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
                const deployment =  new Deployment(digiwfLib);
                const artifacts = await deployment.getArtifacts(path);
                for (const artifact of artifacts) {
                    try {
                        if (checkIfSupportedType(artifact.type)) {
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
