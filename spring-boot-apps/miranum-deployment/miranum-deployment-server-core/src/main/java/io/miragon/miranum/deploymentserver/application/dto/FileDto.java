package io.miragon.miranum.deploymentserver.application.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@NoArgsConstructor
@AllArgsConstructor
@Builder
@Data
@Schema(description = "File Details")
public class FileDto {
    @NotBlank
    private String name;
    @NotBlank
    private String content;
    private String extension;
    private long size;
}
