package io.miragon.miranum.deploymentserver.application.ports.in;

import io.miragon.miranum.deploymentserver.application.dto.DeploymentDto;
import io.miragon.miranum.deploymentserver.application.dto.DeploymentSuccessDto;

public interface DeployArtifact {

    DeploymentSuccessDto deploy(final DeploymentDto deploymentDto);

}
