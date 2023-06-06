package io.miragon.miranum.deploymentserver.configuration;

import io.miragon.miranum.deploymentreceiver.application.ports.in.DeployFile;
import io.miragon.miranum.deploymentserver.adapter.out.MiranumEmbeddedDeployment;
import io.miragon.miranum.deploymentserver.application.ports.in.DeployArtifact;
import io.miragon.miranum.deploymentserver.application.ports.out.DeployFilePort;
import io.miragon.miranum.deploymentserver.application.usecase.DeployArtifactUseCase;
import io.miragon.miranum.deploymentserver.mapper.DeploymentMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.Configuration;

@RequiredArgsConstructor
@Configuration
@ComponentScan(basePackages = {"io.miragon.miranum.deploymentserver.adapter.out", "io.miragon.miranum.deploymentserver.adapter.in.rest"})
public class DeploymentServerEmbeddedAutoconfiguration {

    public DeployArtifact deployArtifact(final DeployFilePort deployFilePort) {
        return new DeployArtifactUseCase(deployFilePort);
    }

    public DeployFilePort deployFilePort(final DeployFile deployFile, final DeploymentMapper deploymentMapper) {
        return new MiranumEmbeddedDeployment(deployFile, deploymentMapper);
    }

}
