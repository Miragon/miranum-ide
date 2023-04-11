package io.miragon.miranum.miranumdeploymentproxy.configuration;

import io.miragon.miranum.miranumdeploymentproxy.handler.DeploymentHandler;
import io.miragon.miranum.miranumdeploymentproxy.handler.DryHandler;
import io.miragon.miranum.miranumdeploymentproxy.handler.RestHandler;
import io.miragon.miranum.miranumdeploymentproxy.handler.springcloudstream.SpringCloudStreamHandler;
import io.miragon.miranum.miranumdeploymentproxy.handler.springcloudstream.dto.EngineDeploymentDto;
import io.miragon.miranum.miranumdeploymentproxy.properties.DeploymentProxyProperties;
import io.miragon.miranum.miranumdeploymentproxy.service.DeploymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.Message;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Sinks;

import java.util.HashMap;
import java.util.Map;
import java.util.function.Supplier;

@RequiredArgsConstructor
@Configuration
@ConditionalOnClass(DeploymentService.class)
@ComponentScan(basePackages = "io.miragon.miranum.miranumdeploymentproxy")
@EnableConfigurationProperties(DeploymentProxyProperties.class)
public class DeploymentProxyAutoConfiguration {

    private final DeploymentProxyProperties properties;

    @Bean
    public Sinks.Many<Message<EngineDeploymentDto>> deploySink() {
        return Sinks.many().unicast().onBackpressureBuffer();
    }

    @Bean
    public Supplier<Flux<Message<EngineDeploymentDto>>> deploy(final Sinks.Many<Message<EngineDeploymentDto>> sink) {
        return sink::asFlux;
    }

    @Bean
    @ConditionalOnMissingBean
    public DeploymentService provideAutoconfiguration() {
        final Map<String, DeploymentHandler> handlers = new HashMap<>();
        this.properties.getEnvironments().forEach(environment -> {
            environment.forEach((deployEnv, handler) -> {
                switch (handler.getHandler()) {
                    case "DryHandler":
                        handlers.put(deployEnv, new DryHandler());
                        break;
                    case "RestHandler":
                        handlers.put(deployEnv, new RestHandler(handler.getTarget()));
                        break;
                    case "SpringCloudStreamHandler":
                        handlers.put(deployEnv, new SpringCloudStreamHandler(deploySink(), handler.getTarget()));
                        break;
                    default:
                        break;
                }

            });
        });
        return new DeploymentService(handlers);
    }

}
