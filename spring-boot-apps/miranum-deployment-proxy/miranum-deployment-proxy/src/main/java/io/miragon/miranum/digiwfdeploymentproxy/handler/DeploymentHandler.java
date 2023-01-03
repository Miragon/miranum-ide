package io.miragon.miranum.digiwfdeploymentproxy.handler;

import io.miragon.miranum.digiwfdeploymentproxy.dto.DeploymentDto;
import io.miragon.miranum.digiwfdeploymentproxy.dto.DeploymentSuccessDto;

public interface DeploymentHandler {

    DeploymentSuccessDto deploy(final DeploymentDto deploymentDto);
}
