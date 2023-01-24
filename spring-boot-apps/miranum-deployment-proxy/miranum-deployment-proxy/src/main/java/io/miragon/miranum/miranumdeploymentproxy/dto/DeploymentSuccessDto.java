package io.miragon.miranum.miranumdeploymentproxy.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.lang.Nullable;

@NoArgsConstructor
@AllArgsConstructor
@Builder
@Data
@Schema(description = "Deployment success")
public class DeploymentSuccessDto {
    private boolean success;
    @Nullable
    private DeploymentDto deployment;
    private String message;
}
