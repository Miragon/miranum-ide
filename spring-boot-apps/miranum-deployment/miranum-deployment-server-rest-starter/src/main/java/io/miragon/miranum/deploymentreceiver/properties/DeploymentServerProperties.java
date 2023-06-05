package io.miragon.miranum.deploymentreceiver.properties;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Setter
@Getter
@ConfigurationProperties(prefix = "io.miragon.miranum.miranum-deployment-proxy")
public class DeploymentServerProperties {

}
