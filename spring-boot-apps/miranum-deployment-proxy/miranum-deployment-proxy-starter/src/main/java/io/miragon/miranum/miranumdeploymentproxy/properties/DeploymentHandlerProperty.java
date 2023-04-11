package io.miragon.miranum.miranumdeploymentproxy.properties;

import lombok.Getter;
import lombok.Setter;

@Setter
@Getter
public class DeploymentHandlerProperty {
    private String handler;
    private String target;
}
