package io.miragon.miranum.deploymentserver.adapter.out;

import feign.Feign;
import io.miragon.miranum.deploymentserver.application.ports.out.DeployFilePort;
import io.miragon.miranum.deploymentserver.domain.Deployment;
import io.miragon.miranum.deploymentserver.domain.DeploymentStatus;
import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
public class MiranumRestDeployment implements DeployFilePort {

    @Override
    public DeploymentStatus deploy(final Deployment deployment, final String target) {
        // TODO map target to target and type from config
        final String deploymentTargetUrl = target;

        final MiranumReceiverFeignClient feignClient = Feign.builder()
            .target(MiranumReceiverFeignClient.class, deploymentTargetUrl);
        return feignClient.deploy(deployment);
    }
}
