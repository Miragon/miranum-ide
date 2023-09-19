package io.miragon.miranum.deploymentserver.deployment;

import io.miragon.miranum.deploymentserver.application.ports.out.DeployFilePort;
import io.miragon.miranum.deploymentserver.domain.Deployment;
import io.miragon.miranum.deploymentserver.domain.DeploymentStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageHeaders;
import org.springframework.messaging.support.MessageBuilder;
import reactor.core.publisher.Sinks;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@RequiredArgsConstructor
public class DigiWFDeploymentService implements DeployFilePort {

    private final Sinks.Many<Message<DeploymentDto>> deploymentEmitter;

    @Override
    public DeploymentStatus deploy(Deployment deployment, String target) {
        final DeploymentDto deploymentDto = new DeploymentDto(
            UUID.randomUUID().toString(), "latest", "local-01", deployment.getFile(), deployment.getType()
        );
        final Map<String, Object> headers = new HashMap<>();
        if (deployment.getType().equalsIgnoreCase("form")) {
            headers.put("type", "deploySchema");
        } else if (deployment.getType().equalsIgnoreCase("config")) {
            headers.put("type", "deployConfiguration");
        } else {
            headers.put("type", "deploy");
        }

        final Message<DeploymentDto> message = MessageBuilder.createMessage(deploymentDto, new MessageHeaders(headers));
        final Sinks.EmitResult result = this.deploymentEmitter.tryEmitNext(message);
        return new DeploymentStatus(result.isSuccess(), result.isFailure() ? result.toString() : "Deployment was successful");
    }

}
