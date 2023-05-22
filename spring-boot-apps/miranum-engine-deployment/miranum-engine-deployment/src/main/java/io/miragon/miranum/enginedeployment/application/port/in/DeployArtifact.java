package io.miragon.miranum.enginedeployment.application.port.in;

import io.miragon.miranum.enginedeployment.model.DeploymentModel;
import io.miragon.miranum.enginedeployment.model.DeploymentStatusModel;

public interface DeployArtifact {
    DeploymentStatusModel deploy(final DeploymentModel deploymentModel);
}
