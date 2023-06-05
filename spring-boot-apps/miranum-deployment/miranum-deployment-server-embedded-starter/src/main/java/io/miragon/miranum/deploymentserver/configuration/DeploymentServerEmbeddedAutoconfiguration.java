package io.miragon.miranum.deploymentserver.configuration;

import io.miragon.miranum.deploymentserver.properties.DeploymentServerProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@RequiredArgsConstructor
@Configuration
@EnableConfigurationProperties(DeploymentServerProperties.class)
public class DeploymentServerEmbeddedAutoconfiguration {

    private final DeploymentServerProperties properties;

}
