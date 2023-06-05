package io.miragon.miranum.deploymentserver.handler;

import io.miragon.miranum.deploymentserver.dto.DeploymentDto;
import io.miragon.miranum.deploymentserver.dto.DeploymentSuccessDto;
import lombok.extern.slf4j.Slf4j;

@Slf4j
public class DryHandler implements DeploymentHandler {

    @Override
    public DeploymentSuccessDto deploy(final DeploymentDto deploymentDto) {
        final String message = String.format("Dry run! Deploy artifact %s to target %s", deploymentDto.getArtifact().getArtifactName(), deploymentDto.getTarget());
        log.info(message);
        return DeploymentSuccessDto.builder()
            .success(true)
            .deployment(deploymentDto)
            .message(message)
            .build();
    }
}
