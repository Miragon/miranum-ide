package io.miragon.digiwf.digiwfdeploymentproxy.properties;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Setter
@Getter
@ConfigurationProperties(prefix = "io.miragon.digiwf.digiwf-deployment-proxy")
public class DeploymentProxyProperties {

}
