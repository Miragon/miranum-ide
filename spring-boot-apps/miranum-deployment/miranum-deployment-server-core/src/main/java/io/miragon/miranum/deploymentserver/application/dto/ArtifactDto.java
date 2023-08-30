package io.miragon.miranum.deploymentserver.application.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.lang.Nullable;


@NoArgsConstructor
@AllArgsConstructor
@Builder
@Data
@Schema(description = "Process artifact")
public class ArtifactDto {
    @NotBlank
    private String type;
    @Nullable
    private String project;
    @Valid
    private FileDto file;

    public String getArtifactName() {
        return this.file.getName();
    }
}
