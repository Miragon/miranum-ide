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
    
    npm[Npm.js Release apps und libs]
    
    %% style
    style feat1 stroke:#00E676,background-color:black,color:white
    style feat2 stroke:#00E676,background-color:black,color:white
    style feat3 stroke:#00E676,background-color:black,color:white
    style feat4 stroke:#00E676,background-color:black,color:white
    style feat5 stroke:#00E676,background-color:black,color:white
    style v0.1 stroke:#00E676,background-color:black,color:white
    style v1 stroke:#00E676 ,background-color:black,color:white
    style npm fill:#00E676,color:black,stroke:black
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
    
    npm-.-v0.1
```

## Create a new release

Before you release a new version make sure to edit the projects version in its `package.json` and `pom.xml`.
Furthermore, check the if the `CHANGELOGs` where updated.

Go to the [actions section in github](https://github.com/Miragon/miranum-ide/actions/workflows/release.yml) and trigger the `release.yml` action manually.
In the workflow dispatch window you can select the apps and libs you want to publish.
Additionally, you can name the release to automatically create a tag in github.

### Versions

We follow a single version approach for all typescript apps and libs.
The version of vs-code extensions, cli app and libs is defined in the [package.json](../package.json).

> Note: Only the version in the root package.json counts.
> The versions in all other apps and libs package.json is automatically added with the script [set-version.js](../tools/scripts/set-version.js).
