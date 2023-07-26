package io.miragon.miranum.deploymentserver.domain;

import lombok.*;

import java.io.Serializable;

@Data
@Builder
@ToString
@NoArgsConstructor
@AllArgsConstructor
public class DeploymentStatus implements Serializable {
    private boolean success;
    private String message;
}
