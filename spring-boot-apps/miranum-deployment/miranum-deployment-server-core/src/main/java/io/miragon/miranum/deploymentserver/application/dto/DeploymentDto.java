package io.miragon.miranum.deploymentserver.application.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.validation.Valid;
import javax.validation.constraints.NotBlank;

@NoArgsConstructor
@AllArgsConstructor
@Builder
@Data
@Schema(description = "Deployment")
public class DeploymentDto {
    @NotBlank
    private String target;
    @Valid
    private ArtifactDto artifact;
}
