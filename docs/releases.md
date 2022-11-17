# Releases

```mermaid
flowchart LR
    %% declarations
    feat1[feat/feature1]
    feat2[feat/feature2]
    feat3[feat/feature3]
    feat4[feat/feature4]
    feat5[feat/feature5]
    
    v0.1((v0.1.0))
    v1((v1.0.0))
    
    maven[Maven Release spring-boot-apps]
    npm[Npm.js Release apps und libs]
    docker[Dockerhub Release]
    
    %% style
    style feat1 stroke:#00E676,background-color:black,color:white
    style feat2 stroke:#00E676,background-color:black,color:white
    style feat3 stroke:#00E676,background-color:black,color:white
    style feat4 stroke:#00E676,background-color:black,color:white
    style feat5 stroke:#00E676,background-color:black,color:white
    style v0.1 stroke:#00E676,background-color:black,color:white
    style v1 stroke:#00E676 ,background-color:black,color:white
    style maven fill:#00E676,color:black,stroke:black
    style npm fill:#00E676,color:black,stroke:black
    style docker fill:#00E676,color:black,stroke:black
    style main stroke:#00E676,color:black
    
    %% graphs
    subgraph main
        feat1---feat2
        feat2---feat3
        feat3---feat4
        feat4---feat5  
    end
    
    feat2-->v0.1
    feat4-->v1
    
    maven-.-v0.1
    npm-.-v0.1
    docker-.-v0.1
```

## Create a new release

For each release we create a tag (vx.x.x) in git.
Every new tag triggers the github action release pipeline and publishes the new version to npm, maven and dockerhub.

```
git tag -a v1.0.0 -m "Release version v1.0.0"
git push origin v1.0.0
```

The version specified in the tag is responsible for the version that is released to external systems (e.g. maven, npm.js, dockerhub, ...).

> The versions of all apps and libs are always the same even though nothing changed.

Usually we create new releases from the main branch. In special cases (e.g. bug fixing in a previous version) we create release new versions from other branches.

