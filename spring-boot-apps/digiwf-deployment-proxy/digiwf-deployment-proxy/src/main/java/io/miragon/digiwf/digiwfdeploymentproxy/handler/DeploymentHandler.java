package io.miragon.digiwf.digiwfdeploymentproxy.handler;

import io.miragon.digiwf.digiwfdeploymentproxy.dto.DeploymentDto;
import io.miragon.digiwf.digiwfdeploymentproxy.dto.DeploymentSuccessDto;

public interface DeploymentHandler {

    DeploymentSuccessDto deploy(final DeploymentDto deploymentDto);
}
