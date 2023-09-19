package io.miragon.miranum.deploymentserver.configuration;

import io.miragon.miranum.deploymentserver.application.ports.in.DeployArtifact;
import io.miragon.miranum.deploymentserver.application.ports.out.DeployFilePort;
import io.miragon.miranum.deploymentserver.application.usecase.DeployArtifactUseCase;
import io.miragon.miranum.deploymentserver.deployment.DeploymentDto;
import io.miragon.miranum.deploymentserver.deployment.DigiWFDeploymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.Message;
import reactor.core.publisher.Sinks;

@RequiredArgsConstructor
@Configuration
@ComponentScan(basePackages = {"io.miragon.miranum.deploymentserver.deployment", "io.miragon.miranum.deploymentserver.adapter.in.rest"})
public class DeploymentServerScsAutoconfiguration {

    @Bean
    @ConditionalOnMissingBean
    public DeployFilePort deployFilePort(final Sinks.Many<Message<DeploymentDto>> deploymentEmitter) {
        return new DigiWFDeploymentService(deploymentEmitter);
    }

    @Bean
    @ConditionalOnMissingBean
    public DeployArtifact deployArtifact(final DeployFilePort deployFilePort) {
        return new DeployArtifactUseCase(deployFilePort);
    }

}
