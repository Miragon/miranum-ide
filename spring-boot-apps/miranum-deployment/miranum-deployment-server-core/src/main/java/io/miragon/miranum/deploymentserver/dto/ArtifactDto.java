package io.miragon.miranum.deploymentserver.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.lang.Nullable;

import javax.validation.Valid;
import javax.validation.constraints.NotBlank;

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
