package io.miragon.miranum.deploymentreceiver.configuration;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@RequiredArgsConstructor
@Configuration
@EnableConfigurationProperties(ReceiverRestAutoconfiguration.class)
public class ReceiverRestAutoconfiguration {

    private final ReceiverRestAutoconfiguration properties;

}
