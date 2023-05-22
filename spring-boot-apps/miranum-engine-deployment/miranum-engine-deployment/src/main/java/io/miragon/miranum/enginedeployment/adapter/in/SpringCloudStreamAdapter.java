package io.miragon.miranum.enginedeployment.adapter.in;

import io.miragon.miranum.enginedeployment.adapter.in.event.DeploymentEvent;
import io.miragon.miranum.enginedeployment.adapter.in.mapper.DeploymentMapper;
import io.miragon.miranum.enginedeployment.application.port.in.DeployArtifact;
import io.miragon.miranum.enginedeployment.model.DeploymentStatusModel;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.integration.support.MessageBuilder;
import org.springframework.messaging.Message;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Sinks;

import java.util.function.Consumer;

@Component
@RequiredArgsConstructor
@Slf4j
public class SpringCloudStreamAdapter {

    private final DeployArtifact deployArtifact;
    private final DeploymentMapper mapper;
    private final Sinks.Many<Message<DeploymentStatusModel>> statusEmitter;

    @Bean
    public Consumer<Message<DeploymentEvent>> deploy() {
        return message -> {
            final DeploymentEvent deploymentEvent = message.getPayload();
            log.info("Sent deployment event with deploymentId: {}, versionId: {}, target: {}, artifactType: {}", deploymentEvent.getDeploymentId(), deploymentEvent.getVersionId(), deploymentEvent.getTarget(), deploymentEvent.getArtifactType());
            // trigger deployment
            final DeploymentStatusModel status = this.deployArtifact.deploy(this.mapper.mapToDeploymentModel(deploymentEvent));

            final Message<DeploymentStatusModel> statusMessage = MessageBuilder
                .withPayload(status)
                .build();

            this.statusEmitter.tryEmitNext(statusMessage).orThrow();
            log.debug("Sent deployment status event for deployment {}", status.getDeploymentId());
        };
    }

}
