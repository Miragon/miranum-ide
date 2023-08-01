package io.miragon.miranum.deploymentreceiver.application.ports.in;

import io.miragon.miranum.deploymentreceiver.domain.Deployment;
import io.miragon.miranum.deploymentreceiver.domain.DeploymentStatus;

public interface DeployFile {

    DeploymentStatus deploy(final Deployment deployment);

}
