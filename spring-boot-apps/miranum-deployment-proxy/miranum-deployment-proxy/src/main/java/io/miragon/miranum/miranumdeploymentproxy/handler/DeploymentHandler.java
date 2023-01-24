package io.miragon.miranum.miranumdeploymentproxy.handler;

import io.miragon.miranum.miranumdeploymentproxy.dto.DeploymentDto;
import io.miragon.miranum.miranumdeploymentproxy.dto.DeploymentSuccessDto;

public interface DeploymentHandler {

    DeploymentSuccessDto deploy(final DeploymentDto deploymentDto);
}
