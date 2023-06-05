package io.miragon.miranum.deploymentserver.application.ports.out;

import io.miragon.miranum.deploymentserver.domain.Deployment;
import io.miragon.miranum.deploymentserver.domain.DeploymentStatus;

public interface DeployFilePort {

    DeploymentStatus deploy(final Deployment deployment);

}
