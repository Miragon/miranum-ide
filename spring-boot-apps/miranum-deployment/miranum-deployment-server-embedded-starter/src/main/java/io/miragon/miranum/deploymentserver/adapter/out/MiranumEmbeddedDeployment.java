package io.miragon.miranum.deploymentserver.adapter.out;

import io.miragon.miranum.deploymentreceiver.application.ports.in.DeployFile;
import io.miragon.miranum.deploymentserver.application.ports.out.DeployFilePort;
import io.miragon.miranum.deploymentserver.domain.Deployment;
import io.miragon.miranum.deploymentserver.domain.DeploymentStatus;
import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
public class MiranumEmbeddedDeployment implements DeployFilePort {

    private final DeployFile deployFile;

    @Override
    public DeploymentStatus deploy(final Deployment deployment, final String target) {
        // map server deployment to receiver deployment
        // and map receiver deployment status to server deployment status
        final io.miragon.miranum.deploymentreceiver.domain.Deployment depl =
            io.miragon.miranum.deploymentreceiver.domain.Deployment.builder()
                .file(deployment.getFile())
                .type(deployment.getType())
                .namespace(deployment.getNamespace())
                .tags(deployment.getTags())
                .build();
        final io.miragon.miranum.deploymentreceiver.domain.DeploymentStatus status = this.deployFile.deploy(depl);
        return DeploymentStatus.builder()
            .success(status.isSuccess())
            .message(status.getMessage())
            .build();
    }
}
