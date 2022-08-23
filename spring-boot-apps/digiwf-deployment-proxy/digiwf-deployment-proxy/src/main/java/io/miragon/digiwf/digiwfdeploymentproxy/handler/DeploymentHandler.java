package io.miragon.digiwf.digiwfdeploymentproxy.handler;

import io.miragon.digiwf.digiwfdeploymentproxy.dto.DeploymentDto;
import io.miragon.digiwf.digiwfdeploymentproxy.dto.DeploymentSuccessDto;

import java.io.IOException;
import java.net.URISyntaxException;

public interface DeploymentHandler {

    DeploymentSuccessDto deploy(final DeploymentDto deploymentDto) throws URISyntaxException, IOException, InterruptedException;
}
