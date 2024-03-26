package io.miragon.miranum.deploymentreceiver.application.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.util.List;

@Data
@Builder
@ToString
@NoArgsConstructor
@AllArgsConstructor
public class DeploymentDto {
    @NotBlank
    private String file;
    @NotBlank
    private String type;
    @NotBlank
    private String filename;
    @NotBlank
    private String namespace;
    private List<String> tags;
}
