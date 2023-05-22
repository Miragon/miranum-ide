package io.miragon.miranum.enginedeployment.application.usecase;

import io.miragon.miranum.enginedeployment.application.enums.DeploymentStatus;
import io.miragon.miranum.enginedeployment.application.port.in.DeployArtifact;
import io.miragon.miranum.enginedeployment.application.port.out.ArtifactDeploymentPort;
import io.miragon.miranum.enginedeployment.model.DeploymentModel;
import io.miragon.miranum.enginedeployment.model.DeploymentStatusModel;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@RequiredArgsConstructor
@Component
public class DeployArtifactUseCase implements DeployArtifact {

    private final ArtifactDeploymentPort artifactDeploymentPort;

    @Override
    public DeploymentStatusModel deploy(DeploymentModel deploymentModel) {
        final boolean success = artifactDeploymentPort.deployArtifact();
        if (!success) {
            return new DeploymentStatusModel(DeploymentStatus.FAILURE.getValue(), deploymentModel.getDeploymentId(), "Deployment failed!");
        }
        return new DeploymentStatusModel(DeploymentStatus.SUCCESSFUL.getValue(), deploymentModel.getDeploymentId(), "Deployment was successful!");
    }

}
