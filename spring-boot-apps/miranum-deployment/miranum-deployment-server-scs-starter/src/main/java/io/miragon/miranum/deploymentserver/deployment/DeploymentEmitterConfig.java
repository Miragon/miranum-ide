package io.miragon.miranum.deploymentserver.deployment;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.Message;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Sinks;

import java.util.function.Supplier;

@Configuration
public class DeploymentEmitterConfig {

    @Bean
    public Sinks.Many<Message<DeploymentDto>> deploymentSink() {
        return Sinks.many().unicast().onBackpressureBuffer();
    }

    @Bean
    public Supplier<Flux<Message<DeploymentDto>>> deployment(final Sinks.Many<Message<DeploymentDto>> sink) {
        return sink::asFlux;
    }

}
