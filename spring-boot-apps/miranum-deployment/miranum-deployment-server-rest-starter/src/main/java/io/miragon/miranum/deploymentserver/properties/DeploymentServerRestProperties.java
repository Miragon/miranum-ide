package io.miragon.miranum.deploymentserver.properties;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.Map;

@Setter
@Getter
@ConfigurationProperties(prefix = "miranum.deploymentserver.rest")
public class DeploymentServerRestProperties {
    private boolean enabled = true;
    private Map<String, Map<String, String>> targets;
}
