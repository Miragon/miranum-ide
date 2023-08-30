package io.miragon.miranum.deploymentserver.application.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

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
