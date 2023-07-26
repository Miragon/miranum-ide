package io.miragon.miranum.deploymentserver.configuration;

import io.miragon.miranum.deploymentreceiver.adapter.out.MiranumDeploymentReceiverImpl;
import io.miragon.miranum.deploymentreceiver.application.ports.in.DeployFile;
import io.miragon.miranum.deploymentreceiver.application.ports.out.MiranumDeploymentReceiver;
import io.miragon.miranum.deploymentreceiver.application.usecase.DeployFileUseCase;
import io.miragon.miranum.deploymentserver.adapter.out.MiranumEmbeddedDeployment;
import io.miragon.miranum.deploymentserver.application.ports.in.DeployArtifact;
import io.miragon.miranum.deploymentserver.application.ports.out.DeployFilePort;
import io.miragon.miranum.deploymentserver.application.usecase.DeployArtifactUseCase;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.Configuration;

@Configuration
@ComponentScan(basePackages = {"io.miragon.miranum.deploymentserver.adapter.out", "io.miragon.miranum.deploymentserver.adapter.in.rest", "io.miragon.miranum.deploymentserver.mapper"})
public class DeploymentServerEmbeddedAutoconfiguration {

    @Bean
    @ConditionalOnMissingBean
    public DeployArtifact deployArtifact(final DeployFilePort deployFilePort) {
        return new DeployArtifactUseCase(deployFilePort);
    }

    @Bean
    @ConditionalOnMissingBean
    public DeployFilePort deployFilePort(final DeployFile deployFile) {
        return new MiranumEmbeddedDeployment(deployFile);
    }

    @ConditionalOnMissingBean
    @Bean
    public DeployFile deployFile(final MiranumDeploymentReceiver miranumDeployment) {
        return new DeployFileUseCase(miranumDeployment);
    }

    @ConditionalOnMissingBean
    @Bean
    public MiranumDeploymentReceiver miranumDeployment() {
        return new MiranumDeploymentReceiverImpl();
    }

}
