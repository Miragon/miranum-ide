package io.miragon.miranum.deploymentreceiver.configuration;

import io.miragon.miranum.deploymentreceiver.adapter.out.MiranumDeploymentImpl;
import io.miragon.miranum.deploymentreceiver.application.ports.in.DeployFile;
import io.miragon.miranum.deploymentreceiver.application.ports.out.MiranumDeployment;
import io.miragon.miranum.deploymentreceiver.application.usecase.DeployFileUseCase;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.Configuration;

@RequiredArgsConstructor
@Configuration
@ComponentScan(basePackages = "io.miragon.miranum.deploymentreceiver.adapter.in.rest")
public class ReceiverRestAutoconfiguration {

    @ConditionalOnMissingBean
    @Bean
    public MiranumDeployment miranumDeployment() {
        return new MiranumDeploymentImpl();
    }

    @ConditionalOnMissingBean
    @Bean
    public DeployFile deployFile(final MiranumDeployment miranumDeployment) {
        return new DeployFileUseCase(miranumDeployment);
    }

}
