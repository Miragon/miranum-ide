package io.miragon.miranum.deploymentserver.adapter.out;

import feign.Feign;
import feign.RequestInterceptor;
import feign.jackson.JacksonDecoder;
import feign.jackson.JacksonEncoder;
import io.miragon.miranum.deploymentserver.application.ports.out.DeployFilePort;
import io.miragon.miranum.deploymentserver.domain.Deployment;
import io.miragon.miranum.deploymentserver.domain.DeploymentStatus;
import lombok.RequiredArgsConstructor;

import java.util.List;
import java.util.Map;

@RequiredArgsConstructor
public class MiranumRestDeployment implements DeployFilePort {

    private final Map<String, Map<String, String>> targets;
    private final List<RequestInterceptor> customRequestInterceptors;
    private final JacksonEncoder jacksonEncoder = new JacksonEncoder();
    private final JacksonDecoder jacksonDecoder = new JacksonDecoder();

    @Override
    public DeploymentStatus deploy(final Deployment deployment, final String target) {
        if (!targets.containsKey(target)) {
            throw new RuntimeException(String.format("Target %s not found", target));
        }
        if (!targets.get(target).containsKey(deployment.getType())) {
            throw new RuntimeException(String.format("Target %s does not support type %s", target, deployment.getType()));
        }

        final String deploymentTargetUrl = targets.get(target).get(deployment.getType());

        final MiranumReceiverFeignClient feignClient = Feign.builder()
            .encoder(this.jacksonEncoder)
            .decoder(this.jacksonDecoder)
            .requestInterceptors(this.customRequestInterceptors)
            .target(MiranumReceiverFeignClient.class, deploymentTargetUrl);
        return feignClient.deploy(deployment);
    }
}
