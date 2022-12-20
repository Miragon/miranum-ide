package io.miragon.miranum.digiwfdeploymentproxy.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.validation.constraints.NotBlank;

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
