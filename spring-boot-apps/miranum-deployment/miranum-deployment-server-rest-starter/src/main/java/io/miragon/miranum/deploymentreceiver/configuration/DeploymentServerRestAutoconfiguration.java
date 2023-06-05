package io.miragon.miranum.deploymentreceiver.configuration;

import io.miragon.miranum.deploymentreceiver.properties.DeploymentServerProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@RequiredArgsConstructor
@Configuration
@EnableConfigurationProperties(DeploymentServerProperties.class)
public class DeploymentServerRestAutoconfiguration {

    private final DeploymentServerProperties properties;

}
