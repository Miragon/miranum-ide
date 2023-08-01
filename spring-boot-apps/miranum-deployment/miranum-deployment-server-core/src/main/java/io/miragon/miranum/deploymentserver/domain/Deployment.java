package io.miragon.miranum.deploymentserver.domain;

import lombok.*;

import java.io.Serializable;
import java.util.List;

@Data
@Builder
@ToString
@NoArgsConstructor
@AllArgsConstructor
public class Deployment implements Serializable {
    private String file;
    private String type;
    private String namespace;
    private List<String> tags;
}
