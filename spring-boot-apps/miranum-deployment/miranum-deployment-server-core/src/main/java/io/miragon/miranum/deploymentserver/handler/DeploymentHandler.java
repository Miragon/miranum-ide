package io.miragon.miranum.deploymentserver.handler;

import io.miragon.miranum.deploymentserver.dto.DeploymentDto;
import io.miragon.miranum.deploymentserver.dto.DeploymentSuccessDto;

public interface DeploymentHandler {

    DeploymentSuccessDto deploy(final DeploymentDto deploymentDto);
}
