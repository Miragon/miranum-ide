package io.miragon.miranum.deploymentserver.adapter.out;

import feign.Headers;
import feign.RequestLine;
import io.miragon.miranum.deploymentserver.domain.Deployment;
import io.miragon.miranum.deploymentserver.domain.DeploymentStatus;

public interface MiranumReceiverFeignClient {

    @RequestLine("POST")
    @Headers("Content-Type: application/json")
    DeploymentStatus deploy(final Deployment deployment);

}
