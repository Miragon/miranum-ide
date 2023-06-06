package io.miragon.miranum.deploymentserver.configuration;

import io.miragon.miranum.deploymentreceiver.adapter.out.MiranumDeploymentImpl;
import io.miragon.miranum.deploymentreceiver.application.ports.in.DeployFile;
import io.miragon.miranum.deploymentreceiver.application.ports.out.MiranumDeployment;
import io.miragon.miranum.deploymentreceiver.application.usecase.DeployFileUseCase;
import io.miragon.miranum.deploymentserver.adapter.out.MiranumEmbeddedDeployment;
import io.miragon.miranum.deploymentserver.application.ports.in.DeployArtifact;
import io.miragon.miranum.deploymentserver.application.ports.out.DeployFilePort;
import io.miragon.miranum.deploymentserver.application.usecase.DeployArtifactUseCase;
import io.miragon.miranum.deploymentserver.mapper.DeploymentMapper;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.Configuration;

@Configuration
@ComponentScan(basePackages = {"io.miragon.miranum.deploymentserver.adapter.out", "io.miragon.miranum.deploymentserver.adapter.in.rest"})
public class DeploymentServerEmbeddedAutoconfiguration {

    @Bean
    @ConditionalOnMissingBean
    public DeployArtifact deployArtifact(final DeployFilePort deployFilePort) {
        return new DeployArtifactUseCase(deployFilePort);
    }

    @Bean
    @ConditionalOnMissingBean
    public DeployFilePort deployFilePort(final DeployFile deployFile, final DeploymentMapper deploymentMapper) {
        return new MiranumEmbeddedDeployment(deployFile, deploymentMapper);
    }

    @ConditionalOnMissingBean
    @Bean
    public DeployFile deployFile(final MiranumDeployment miranumDeployment) {
        return new DeployFileUseCase(miranumDeployment);
    }

    @ConditionalOnMissingBean
    @Bean
    public MiranumDeployment miranumDeployment() {
        return new MiranumDeploymentImpl();
    }

}
