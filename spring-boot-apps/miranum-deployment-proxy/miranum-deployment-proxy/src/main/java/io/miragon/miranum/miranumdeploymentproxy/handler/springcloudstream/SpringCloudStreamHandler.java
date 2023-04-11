package io.miragon.miranum.miranumdeploymentproxy.handler.springcloudstream;

import io.miragon.miranum.miranumdeploymentproxy.dto.DeploymentDto;
import io.miragon.miranum.miranumdeploymentproxy.dto.DeploymentSuccessDto;
import io.miragon.miranum.miranumdeploymentproxy.handler.DeploymentHandler;
import io.miragon.miranum.miranumdeploymentproxy.handler.springcloudstream.dto.EngineDeploymentDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.MessageHeaders;
import org.springframework.messaging.support.MessageBuilder;
import reactor.core.publisher.Sinks;

import java.util.Map;
import java.util.UUID;

@RequiredArgsConstructor
@Slf4j
public class SpringCloudStreamHandler implements DeploymentHandler {

    private final Sinks.Many<org.springframework.messaging.Message<EngineDeploymentDto>> messageSink;
    private final String deploymentTargetDestination;

    private final String SPRING_CLOUD_STREAM_SENDTO_DESTINATION = "spring.cloud.stream.sendto.destination";

    @Override
    public DeploymentSuccessDto deploy(final DeploymentDto deploymentDto) {
        final MessageHeaders headers = new MessageHeaders(Map.of(SPRING_CLOUD_STREAM_SENDTO_DESTINATION, deploymentTargetDestination));
        final EngineDeploymentDto payload = EngineDeploymentDto.builder()
            .deploymentId(UUID.randomUUID().toString())
            .versionId(deploymentDto.getArtifact().getArtifactName())
            .target(deploymentDto.getTarget())
            .file(deploymentDto.getArtifact().getFile().getContent())
            .artifactType(deploymentDto.getArtifact().getType())
            .build();

        final Sinks.EmitResult emitResult = this.messageSink.tryEmitNext(MessageBuilder.createMessage(payload, headers));

        return DeploymentSuccessDto.builder()
            .success(emitResult.isSuccess())
            .deployment(deploymentDto)
            .message(String.format("Emit result for deployment of %s to %s was %s", deploymentDto.getArtifact().getArtifactName(), deploymentDto.getTarget(), emitResult))
            .build();
    }

}
