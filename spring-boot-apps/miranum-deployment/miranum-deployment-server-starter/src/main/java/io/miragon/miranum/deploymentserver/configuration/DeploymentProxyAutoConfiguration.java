package io.miragon.miranum.deploymentserver.configuration;

import io.miragon.miranum.deploymentserver.handler.DeploymentHandler;
import io.miragon.miranum.deploymentserver.handler.DryHandler;
import io.miragon.miranum.deploymentserver.handler.RestHandler;
import io.miragon.miranum.deploymentserver.properties.DeploymentProxyProperties;
import io.miragon.miranum.deploymentserver.service.DeploymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.Configuration;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RequiredArgsConstructor
@Configuration
@ConditionalOnClass(DeploymentService.class)
@ComponentScan(basePackages = "io.miragon.miranum.miranumdeploymentproxy")
@EnableConfigurationProperties(DeploymentProxyProperties.class)
public class DeploymentProxyAutoConfiguration {

    private final DeploymentProxyProperties properties;

    @Bean
    @ConditionalOnMissingBean
    public DeploymentService provideAutoconfiguration() {
        final List<DeploymentHandler> availableHandlers = List.of(new DryHandler(), new RestHandler(properties.getTargets()));

        // env, handler
        final Map<String, DeploymentHandler> handlers = new HashMap<>();
        // add enabled deployment handlers
        this.properties.getDeploymentHandlers().forEach((key, value) -> {
            final Optional<DeploymentHandler> availableHandler = availableHandlers.stream()
                .filter(handler -> handler.getClass().getSimpleName().equals(value))
                .findAny();
            availableHandler.ifPresent(deploymentHandler -> handlers.put(key, deploymentHandler));
        });

        return new DeploymentService(handlers);
    }

}
