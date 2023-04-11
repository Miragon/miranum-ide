package io.miragon.miranum.miranumdeploymentproxy.properties;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;
import java.util.Map;

@Setter
@Getter
@ConfigurationProperties(prefix = "io.miragon.miranum.miranum-deployment-proxy.deployment-handlers")
public class DeploymentProxyProperties {
    private List<Map<String, DeploymentHandlerProperty>> environments;
}
