package io.miragon.miranum.miranumdeploymentproxy.streaming;

import io.miragon.miranum.miranumdeploymentproxy.handler.springcloudstream.dto.EngineDeploymentDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.messaging.Message;
import org.springframework.stereotype.Component;

import java.util.function.Consumer;

@Component
@Slf4j
public class DeploymentConsumer {

    @Bean
//    public Consumer<Message<EngineDeploymentStatusDto>> deploymentStatus() {
    public Consumer<Message<EngineDeploymentDto>> deploymentStatus() {
        return message -> {
            log.info("{}", message.getPayload());
        };
    }

}
