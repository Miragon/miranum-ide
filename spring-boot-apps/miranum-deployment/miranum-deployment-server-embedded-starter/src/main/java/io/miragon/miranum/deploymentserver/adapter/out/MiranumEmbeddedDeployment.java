package io.miragon.miranum.deploymentserver.adapter.out;

import io.miragon.miranum.deploymentreceiver.application.ports.in.DeployFile;
import io.miragon.miranum.deploymentserver.application.ports.out.DeployFilePort;
import io.miragon.miranum.deploymentserver.domain.Deployment;
import io.miragon.miranum.deploymentserver.domain.DeploymentStatus;
import io.miragon.miranum.deploymentserver.mapper.DeploymentMapper;
import lombok.RequiredArgsConstructor;
import lombok.val;

@RequiredArgsConstructor
public class MiranumEmbeddedDeployment implements DeployFilePort {

    private final DeployFile deployFile;
    private final DeploymentMapper deploymentMapper;

    @Override
    public DeploymentStatus deploy(final Deployment deployment, final String target) {
        val deploymentStatus = this.deployFile.deploy(this.deploymentMapper.mapDeployment(deployment));
        return this.deploymentMapper.mapDeploymentStatus(deploymentStatus);
    }
}
