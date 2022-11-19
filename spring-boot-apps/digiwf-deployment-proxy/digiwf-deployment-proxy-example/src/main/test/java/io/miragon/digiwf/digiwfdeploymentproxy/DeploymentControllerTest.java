package io.miragon.digiwf.digiwfdeploymentproxy;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.miragon.digiwf.digiwfdeploymentproxy.dto.ArtifactDto;
import io.miragon.digiwf.digiwfdeploymentproxy.dto.DeploymentDto;
import io.miragon.digiwf.digiwfdeploymentproxy.dto.FileDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.util.List;

import static org.hamcrest.core.Is.is;
import static org.hamcrest.core.IsNull.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@TestPropertySource(locations = "classpath:application-test.properties")
@AutoConfigureMockMvc
class DeploymentControllerTest {

    @Autowired
    private WebApplicationContext context;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private MockMvc mockMvc;

    @BeforeEach
    void setup() {
        this.mockMvc = MockMvcBuilders.webAppContextSetup(this.context).build();
    }

    @Test
    void testDeployment() throws Exception {
        final List<String> targetEnvs = List.of("local", "dev", "test", "prod");
        final FileDto file = FileDto.builder()
            .name("test")
            .content("file-content")
            .extension("bpmn")
            .size(1)
            .build();
        final ArtifactDto artifact = ArtifactDto.builder()
            .type("bpmn")
            .project("test-project")
            .file(file)
            .build();

        for (final String targetEnv : targetEnvs) {
            final DeploymentDto deployment = DeploymentDto.builder()
                .target(targetEnv)
                .artifact(artifact)
                .build();
            this.mockMvc.perform(post("/api/deployment")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(this.objectMapper.writeValueAsString(deployment))
                    .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().is2xxSuccessful())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.message", notNullValue()))
                .andExpect(jsonPath("$.deployment", notNullValue()))
                .andExpect(jsonPath("$.deployment.target", is(targetEnv)))
                .andExpect(jsonPath("$.deployment.artifact", notNullValue()));
        }

    }

}
