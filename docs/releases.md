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

Before you release a new version make sure to edit the projects version in its `package.json` and `pom.xml`.

Go to the [actions section in github](https://github.com/FlowSquad/miranum-ide/actions/workflows/release.yml) and trigger the `release.yml` action manually.
In the workflow dispatch window you can select the apps and libs you want to publish.
Additionally, you can name the release to automatically create a tag in github.

### Versions

We follow a single version approach for all typescript apps and libs.
The version of vs-code extensions, cli app and libs is defined in the [package.json](../package.json).

> Note: Only the version in the root package.json counts.
> The versions in all other apps and libs package.json is automatically added with the script [set-version.js](../tools/scripts/set-version.js).

The version of spring-boot-apps is defined for every app in a pom.xml.
Spring boot apps (java) and the typescript apps and libs are not versioned together (they don't share the same version). 
