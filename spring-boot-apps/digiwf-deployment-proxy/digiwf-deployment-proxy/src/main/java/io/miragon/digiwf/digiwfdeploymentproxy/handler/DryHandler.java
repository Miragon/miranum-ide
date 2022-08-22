package io.miragon.digiwf.digiwfdeploymentproxy.handler;

import io.miragon.digiwf.digiwfdeploymentproxy.dto.DeploymentDto;
import io.miragon.digiwf.digiwfdeploymentproxy.dto.DeploymentSuccessDto;
import lombok.extern.slf4j.Slf4j;

@Slf4j
public class DryHandler implements DeploymentHandler {

    @Override
    public DeploymentSuccessDto deploy(final DeploymentDto deploymentDto) {
        log.info("Deploy artifact {} to target {}", deploymentDto.getArtifactDto().getArtifactName(), deploymentDto.getTarget());
        return DeploymentSuccessDto.builder().success(true).deployment(deploymentDto).build();
    }
}
