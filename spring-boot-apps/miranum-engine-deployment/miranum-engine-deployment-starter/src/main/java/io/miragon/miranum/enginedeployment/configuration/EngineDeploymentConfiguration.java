package io.miragon.miranum.enginedeployment.configuration;


import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.Configuration;

@RequiredArgsConstructor
@Configuration
@ComponentScan(basePackages = "io.miragon.miranum.enginedeployment")
public class EngineDeploymentConfiguration {

    // component scan will pick up the beans

}
